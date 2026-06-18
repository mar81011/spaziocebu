import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatSession, OrderLineItem } from "../types";
import { drinkQty, testMenu } from "./chatFixtures";
import {
  emptySession,
  isClearChatRequest,
  parseItemsFromText,
  processUserMessage,
} from "./chat";

vi.mock("./storage", () => ({
  getAllMenuItems: (menu: { categories: { title: string; items: unknown[] }[] }) =>
    menu.categories.flatMap((c) =>
      c.items.map((item) => ({ ...(item as object), category: c.title }))
    ),
  addOrder: vi.fn(async (order: { customerName: string; items: OrderLineItem[] }) => ({
    id: "99",
    customerName: order.customerName,
    items: order.items,
    total: order.items.reduce((s, i) => s + i.price * i.qty, 0),
    status: "awaiting_payment" as const,
    createdAt: new Date().toISOString(),
    notes: "Via chat",
  })),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: false, status: 503 });
});

async function say(
  text: string,
  session: ChatSession = emptySession(),
  history: { role: "user" | "bot"; text: string }[] = []
) {
  return processUserMessage(text, session, testMenu, true, history);
}

function cartItems(session: ChatSession) {
  return session.items.filter((i) => !i.forDrink);
}

describe("parseItemsFromText", () => {
  it("parses spazio shorthand only", () => {
    const items = parseItemsFromText("add 1 spazio", testMenu);
    expect(items.filter((i) => !i.forDrink).map((i) => i.name)).toEqual(["Spazio Signature"]);
  });

  it("parses cap alias as cappuccino", () => {
    const items = parseItemsFromText("2 caps please", testMenu);
    expect(drinkQty(items, "Cappuccino")).toBe(2);
  });

  it("parses flat white quantity", () => {
    const items = parseItemsFromText("add 2 flat white", testMenu);
    expect(drinkQty(items, "Flat White")).toBe(2);
  });

  it("addon on drink does not add extra drink", () => {
    const existing = parseItemsFromText("2 flat white", testMenu);
    const addon = parseItemsFromText("add extra on 1 flat white", testMenu, existing);
    expect(drinkQty(addon, "Flat White")).toBe(0);
    expect(addon.some((i) => i.name === "Extra shot" && i.forDrink === "Flat White")).toBe(true);
  });

  it("returns empty for unknown food", () => {
    expect(parseItemsFromText("add hamburger", testMenu)).toEqual([]);
  });

  it("parses multiple drinks in one message", () => {
    const items = parseItemsFromText("1 spazio 1 cappuccino 1 matcha", testMenu);
    expect(drinkQty(items, "Spazio Signature")).toBe(1);
    expect(drinkQty(items, "Cappuccino")).toBe(1);
    expect(drinkQty(items, "Matcha Latte")).toBe(1);
  });

  it("parses cappu and cappucino typos", () => {
    expect(drinkQty(parseItemsFromText("add cappu", testMenu), "Cappuccino")).toBe(1);
    expect(drinkQty(parseItemsFromText("add 1 cappu", testMenu), "Cappuccino")).toBe(1);
    expect(drinkQty(parseItemsFromText("add 1 cappucino", testMenu), "Cappuccino")).toBe(1);
    expect(drinkQty(parseItemsFromText("add1 cappuccino", testMenu), "Cappuccino")).toBe(1);
  });

  it("parses extro shot typo", () => {
    const existing = parseItemsFromText("1 flat white", testMenu);
    const addon = parseItemsFromText("add extro shot on flat white", testMenu, existing);
    expect(addon.some((i) => i.name === "Extra shot")).toBe(true);
  });

  it("oat on cortado is addon-only not a new drink", () => {
    const existing = parseItemsFromText("1 cortado", testMenu);
    const addon = parseItemsFromText("oat on cortado", testMenu, existing);
    expect(drinkQty(addon, "Cortado")).toBe(0);
    expect(addon.some((i) => i.name === "Oat milk swap" && i.forDrink === "Cortado")).toBe(true);
  });
});

describe("processUserMessage (rules path, AI off)", () => {
  it("orders spazio on empty cart", async () => {
    const r = await say("add 1 spazio");
    expect(r.type).toBe("reply");
    expect(drinkQty(r.session.items, "Spazio Signature")).toBe(1);
    expect(drinkQty(r.session.items, "Flat White")).toBe(0);
    expect(r.text).toContain("Got it!");
  });

  it("orders three drinks in one message", async () => {
    const r = await say("1 spazio 1 cappuccino 1 matcha");
    expect(r.text).toContain("Spazio Signature");
    expect(r.text).toContain("Cappuccino");
    expect(r.text).toContain("Matcha Latte");
    expect(drinkQty(r.session.items, "Spazio Signature")).toBe(1);
    expect(drinkQty(r.session.items, "Cappuccino")).toBe(1);
    expect(drinkQty(r.session.items, "Matcha Latte")).toBe(1);
  });

  it("rejects hamburger with menu hint", async () => {
    const r = await say("add hamburger");
    expect(r.text.toLowerCase()).toContain("don't have that");
    expect(r.session.items).toHaveLength(0);
  });

  it("rejects hamburger even when cart has items", async () => {
    const cart = parseItemsFromText("1 flat white", testMenu);
    const session = { ...emptySession(), items: cart, awaitingConfirm: true };
    const r = await say("add hamburger", session);
    expect(r.text.toLowerCase()).toContain("don't have that");
    expect(r.text).not.toMatch(/^reply confirm to place/i);
  });

  it("shows order summary on request", async () => {
    const items = parseItemsFromText("2 flat white", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("show me my order", session);
    expect(r.text).toContain("Flat White");
    expect(r.text).toContain("Total:");
  });

  it("does not confirm on vague confirm question", async () => {
    const items = parseItemsFromText("1 spazio", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("can you confirm the total?", session);
    expect(r.session.awaitingName).toBe(false);
    expect(r.session.awaitingConfirm).toBe(true);
  });

  it("confirms on plain confirm", async () => {
    const items = parseItemsFromText("1 spazio", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("confirm", session);
    expect(r.session.awaitingName).toBe(true);
    expect(r.text.toLowerCase()).toContain("name");
  });

  it("blocks confirm on empty cart", async () => {
    const session = { ...emptySession(), awaitingConfirm: true };
    const r = await say("confirm", session);
    expect(r.session.awaitingName).toBe(false);
    expect(r.text.toLowerCase()).toContain("don't have anything");
  });

  it("clears order but not chat command detection", async () => {
    expect(isClearChatRequest("clear chat")).toBe(true);
    const items = parseItemsFromText("1 spazio", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("clear order", session);
    expect(r.session.items).toHaveLength(0);
    expect(r.text.toLowerCase()).toContain("cleared");
  });

  it("make it 2 updates sole drink qty", async () => {
    const items = parseItemsFromText("1 flat white", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("make it 2", session);
    expect(drinkQty(r.session.items, "Flat White")).toBe(2);
  });

  it("greets without useless confirm prompt", async () => {
    const r = await say("hello");
    expect(r.text.toLowerCase()).toContain("hi");
    expect(r.text.toLowerCase()).not.toContain("reply confirm to place");
  });

  it("thanks with cart gives helpful reply", async () => {
    const items = parseItemsFromText("1 spazio", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("thanks", session);
    expect(r.text.toLowerCase()).toContain("welcome");
  });

  it("split add reply when cart already has items", async () => {
    const existing = parseItemsFromText("1 flat white", testMenu);
    const session = { ...emptySession(), items: existing, awaitingConfirm: true };
    const r = await say("add 1 spazio", session);
    expect(r.text).toContain("Added to your order:");
    expect(r.text).toContain("Your order so far:");
    expect(drinkQty(r.session.items, "Spazio Signature")).toBe(1);
    expect(drinkQty(r.session.items, "Flat White")).toBe(1);
  });

  it("remove 2 flat whites from cart of 2", async () => {
    const items = parseItemsFromText("2 flat white", testMenu);
    const session = { ...emptySession(), items, awaitingConfirm: true };
    const r = await say("remove 2 flat white", session);
    expect(cartItems(r.session)).toHaveLength(0);
  });
});

describe("processUserMessage (bad AI blocked)", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Tell me what you'd like in plain language — I'll summarise everything before you confirm.",
        items: [],
        awaitingConfirm: false,
      }),
    });
  });

  it("uses menu rejection instead of AI generic for unknown item", async () => {
    const r = await say("add pizza");
    expect(r.text.toLowerCase()).toContain("don't have that");
    expect(r.session.items).toHaveLength(0);
  });
});

describe("more edge scenarios", () => {
  it("menu request lists categories", async () => {
    const r = await say("what's on the menu?");
    expect(r.text).toContain("Spazio Signature");
    expect(r.text).toContain("Coffee");
  });

  it("summarize empty cart", async () => {
    const r = await say("show my order");
    expect(r.text.toLowerCase()).toContain("don't have anything");
  });

  it("cap adds only cappuccino not flat white", async () => {
    const r = await say("1 cap");
    expect(drinkQty(r.session.items, "Cappuccino")).toBe(1);
    expect(drinkQty(r.session.items, "Flat White")).toBe(0);
  });

  it("extro shot on each order", async () => {
    const cart = parseItemsFromText("1 spazio 1 cortado 1 cappuccino", testMenu);
    const session = { ...emptySession(), items: cart, awaitingConfirm: true };
    const r = await say("add extro shot on each order", session);
    expect(r.text.toLowerCase()).not.toContain("don't have that");
    expect(r.session.items.filter((i) => i.name === "Extra shot").length).toBeGreaterThanOrEqual(3);
  });

  it("oat on cortado does not duplicate cortado", async () => {
    const cart = parseItemsFromText("1 cortado", testMenu);
    const session = { ...emptySession(), items: cart, awaitingConfirm: true };
    const r = await say("oat on cortado", session);
    expect(drinkQty(r.session.items, "Cortado")).toBe(1);
    expect(r.session.items.some((i) => i.name === "Oat milk swap" && i.forDrink === "Cortado")).toBe(true);
  });

  it("cappu shorthand orders cappuccino", async () => {
    const r = await say("add 1 cappu");
    expect(r.text.toLowerCase()).not.toContain("don't have that");
    expect(drinkQty(r.session.items, "Cappuccino")).toBe(1);
  });
});
