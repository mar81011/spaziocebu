import type { ChatSession, Menu, Order, OrderLineItem } from "../types";
import { addOrder, getAllMenuItems, getPaymentSettings } from "./storage";
import { formatCurrency } from "./format";
import { buildGcashPaymentMessage } from "./payment";

export function emptySession(): ChatSession {
  return { items: [], awaitingConfirm: false, awaitingName: false };
}

function sessionTotal(items: OrderLineItem[]) {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

function sessionSummary(items: OrderLineItem[]) {
  return items
    .map((i) => `${i.qty}× ${i.name} (${formatCurrency(i.price * i.qty)})`)
    .join(", ");
}

export function formatMenuForChat(menu: Menu) {
  return menu.categories
    .map((cat) => {
      const lines = cat.items.map((i) => `${i.name} ${formatCurrency(i.price)}`).join(", ");
      return `${cat.title}: ${lines}`;
    })
    .join(" · ");
}

export function parseItemsFromText(text: string, menu: Menu): OrderLineItem[] {
  const lower = text.toLowerCase();
  const allItems = getAllMenuItems(menu).sort((a, b) => b.name.length - a.name.length);
  const items: OrderLineItem[] = [];

  for (const menuItem of allItems) {
    const key = menuItem.name.toLowerCase();
    if (!lower.includes(key)) continue;

    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const qtyMatch = lower.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?${escaped.split(" ")[0]}`, "i"));
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    if (!items.find((i) => i.name === menuItem.name)) {
      items.push({ name: menuItem.name, qty, price: menuItem.price });
    }
  }

  return items;
}

export type BotResult =
  | { type: "reply"; text: string; session: ChatSession }
  | { type: "order"; text: string; session: ChatSession; order: Order };

export async function processUserMessage(
  userText: string,
  session: ChatSession,
  menu: Menu,
  storeOpen = true
): Promise<BotResult> {
  const lower = userText.toLowerCase().trim();
  let next = { ...session, items: [...session.items] };

  if (!storeOpen) {
    return {
      type: "reply",
      session: emptySession(),
      text: "We're closed for orders right now. Browse the menu and check back soon — we'll be open for pickup again shortly.",
    };
  }

  if (next.awaitingName) {
    const name = userText.replace(/^(i'm|i am|my name is)\s+/i, "").trim() || userText;
    const order = await addOrder({
      customerName: name,
      items: next.items,
      notes: "Via chat",
    });
    const cleared = emptySession();
    const payment = buildGcashPaymentMessage(order, getPaymentSettings());
    return {
      type: "order",
      session: cleared,
      order,
      text: `Thanks ${name}! Order #${order.id} is reserved for pickup.\n\n${payment}`,
    };
  }

  if (next.awaitingConfirm && (lower === "confirm" || lower === "yes" || lower.includes("confirm"))) {
    next.awaitingConfirm = false;
    next.awaitingName = true;
    return {
      type: "reply",
      session: next,
      text: `Total: ${formatCurrency(sessionTotal(next.items))}. What's your name?`,
    };
  }

  if (lower.includes("menu")) {
    return {
      type: "reply",
      session: next,
      text: `Here's our menu — ${formatMenuForChat(menu)}. What would you like?`,
    };
  }

  const parsed = parseItemsFromText(userText, menu);
  if (parsed.length > 0) {
    next.items = parsed;
    next.awaitingConfirm = true;
    return {
      type: "reply",
      session: next,
      text: `Got it — ${sessionSummary(next.items)}. Total ${formatCurrency(sessionTotal(next.items))}. Reply confirm to place your order.`,
    };
  }

  if (next.items.length > 0) {
    return {
      type: "reply",
      session: next,
      text: "Reply confirm to place your order, or tell me what else to add.",
    };
  }

  return {
    type: "reply",
    session: next,
    text: 'Tell me what you\'d like — e.g. "flat white and a croissant" — and I\'ll summarise your order.',
  };
}
