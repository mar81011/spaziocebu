import type { ChatSession, Menu, Order, OrderLineItem } from "../types";
import { addOrder, getAllMenuItems } from "./storage";
import { formatCurrency } from "./format";

export type ChatHistoryEntry = { role: "user" | "bot"; text: string };

export function emptySession(): ChatSession {
  return { items: [], awaitingConfirm: false, awaitingName: false };
}

function sessionTotal(items: OrderLineItem[]) {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

function lineKey(item: OrderLineItem) {
  if (item.bundleId) return `${item.bundleId}::${item.name}::${item.forDrink ?? ""}`;
  return `${item.name}::${item.forDrink ?? ""}`;
}

function parseQtyForItem(text: string, itemName: string): number {
  const lower = text.toLowerCase();
  const nameLower = itemName.toLowerCase();
  const escaped = escapeRegex(nameLower).replace(/\s+/g, "\\s+");
  const patterns = [
    new RegExp(`(\\d+)\\s*(?:x\\s*)?${escaped}s?\\b`, "i"),
    new RegExp(`(\\d+)\\s+${escaped}`, "i"),
  ];

  const firstWord = nameLower.split(/\s+/)[0];
  if (firstWord && isMenuWord(firstWord)) {
    patterns.push(new RegExp(`(\\d+)\\s*(?:x\\s*)?${escapeRegex(firstWord)}\\b`, "i"));
    patterns.push(new RegExp(`(\\d+)\\s+${escapeRegex(firstWord)}\\b`, "i"));
  }

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) return Math.max(1, parseInt(match[1], 10));
  }
  return 1;
}

function parseAddonUnitsForDrink(text: string, addonName: string, drinkName: string): number {
  const lower = text.toLowerCase();
  const addonEsc = escapeRegex(addonName.toLowerCase());
  const drinkEsc = escapeRegex(drinkName.toLowerCase()).replace(/\s+/g, "\\s+");

  const qtyMatch = lower.match(
    new RegExp(`${addonEsc}\\s+(?:on|for|to)\\s+(\\d+)\\s*(?:x\\s*)?${drinkEsc}s?\\b`, "i")
  );
  if (qtyMatch) return Math.max(1, parseInt(qtyMatch[1], 10));

  if (new RegExp(`${addonEsc}\\s+(?:on|for|to)\\s+.*?${drinkEsc}`, "i").test(lower)) return 1;

  return 1;
}

function makeBundleId(prefix: string) {
  return `bundle-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitUnbundledCart(items: OrderLineItem[]): OrderLineItem[] {
  const drinks = items.filter((item) => !item.forDrink);
  const addons = items.filter((item) => item.forDrink);
  const usedAddons = new Set<number>();
  const result: OrderLineItem[] = [];

  for (const drink of drinks) {
    const linked = addons
      .map((addon, index) => ({ addon, index }))
      .filter(({ addon }) => addon.forDrink === drink.name);

    if (!linked.length) {
      result.push({ ...drink });
      continue;
    }

    let remainingDrinks = drink.qty;

    for (const { addon, index } of linked) {
      const units = Math.min(addon.qty, remainingDrinks);
      for (let unit = 0; unit < units; unit++) {
        const bundleId = makeBundleId(drink.name);
        result.push({ ...drink, qty: 1, bundleId });
        result.push({ ...addon, qty: 1, bundleId, forDrink: drink.name });
        usedAddons.add(index);
        remainingDrinks -= 1;
      }
    }

    if (remainingDrinks > 0) {
      result.push({ ...drink, qty: remainingDrinks });
    }
  }

  addons.forEach((addon, index) => {
    if (!usedAddons.has(index)) result.push({ ...addon });
  });

  return result;
}

function finalizeCart(items: OrderLineItem[]): OrderLineItem[] {
  const bundled = items.filter((item) => item.bundleId);
  const unbundled = items.filter((item) => !item.bundleId);
  if (!unbundled.length) return items;
  return [...bundled, ...splitUnbundledCart(unbundled)];
}

function isAddonMenuItem(item: { name: string; category: string; price: number }) {
  if (!/add|extra|modifier/i.test(item.category)) return false;
  return /shot|swap|syrup|milk|extra/i.test(item.name) && item.price < 80;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMenuWord(word: string) {
  return word.length >= 3;
}

function inferSoleDrinkInContext(existing: OrderLineItem[], drinksInMessage: OrderLineItem[]): string | null {
  const counts = new Map<string, number>();
  for (const item of [...existing, ...drinksInMessage]) {
    if (item.forDrink) continue;
    counts.set(item.name, (counts.get(item.name) ?? 0) + item.qty);
  }
  if (counts.size === 1) return [...counts.keys()][0] ?? null;
  return null;
}

function collectDrinkNames(menu: Menu, existing: OrderLineItem[]) {
  const fromMenu = getAllMenuItems(menu)
    .filter((item) => !isAddonMenuItem(item))
    .map((item) => item.name);
  const fromCart = existing.filter((item) => !item.forDrink).map((item) => item.name);
  return [...new Set([...fromMenu, ...fromCart])];
}

function matchDrinksInText(segment: string, drinkNames: string[]): string[] {
  const parts = segment
    .split(/\s+and\s+|,\s*|\s*&\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const targets: string[] = [];
  const sorted = [...drinkNames].sort((a, b) => b.length - a.length);

  for (const part of parts.length > 1 ? parts : [segment]) {
    const pl = part.toLowerCase();
    for (const name of sorted) {
      const nl = name.toLowerCase();
      if (pl.includes(nl) || nl.includes(pl)) {
        targets.push(name);
        break;
      }
      const words = nl.split(/\s+/).filter((w) => isMenuWord(w));
      if (words.some((w) => new RegExp(`\\b${escapeRegex(w)}\\b`).test(pl))) {
        targets.push(name);
        break;
      }
    }
  }

  return [...new Set(targets)];
}

function findDrinksForAddon(
  text: string,
  addonName: string,
  menu: Menu,
  existing: OrderLineItem[],
  drinksInMessage: OrderLineItem[] = []
): string[] {
  const drinkNames = collectDrinkNames(menu, existing);
  const lower = text.toLowerCase();
  const addonLower = addonName.toLowerCase();

  const onMatch = lower.match(
    new RegExp(`${escapeRegex(addonLower)}\\s+(?:on|for|to)\\s+(.+?)(?:\\s+and\\s+|$|\\.|!|\\?)`, "i")
  );
  if (onMatch) {
    if (/the other one|the other|one of them/i.test(onMatch[1])) {
      const sole = inferSoleDrinkInContext(existing, drinksInMessage);
      if (sole) return [sole];
    }
    const found = matchDrinksInText(onMatch[1], drinkNames);
    if (found.length) return found;
  }

  if (/for the other one add/i.test(lower)) {
    const sole = inferSoleDrinkInContext(existing, drinksInMessage);
    if (sole) return [sole];
  }

  const toMatch = lower.match(
    /(?:add|with|extra)\s+.+?\s+to\s+(.+?)(?:$|\.|!|\?)/i
  );
  if (toMatch) {
    if (/the other one|the other|one of them/i.test(toMatch[1])) {
      const sole = inferSoleDrinkInContext(existing, drinksInMessage);
      if (sole) return [sole];
    }
    const found = matchDrinksInText(toMatch[1], drinkNames);
    if (found.length) return found;
  }

  const withMatch = lower.match(
    new RegExp(`(.+?)\\s+with\\s+${escapeRegex(addonLower)}`, "i")
  );
  if (withMatch) {
    const found = matchDrinksInText(withMatch[1], drinkNames);
    if (found.length) return found;
  }

  const drinksInText = matchDrinksInText(lower, drinkNames);
  const addonsMentioned = getAllMenuItems(menu).filter(
    (item) => isAddonMenuItem(item) && lower.includes(item.name.toLowerCase())
  );
  if (drinksInText.length === 1 && addonsMentioned.length === 1) {
    return drinksInText;
  }

  const sole = inferSoleDrinkInContext(existing, drinksInMessage);
  if (sole) return [sole];

  return [];
}

function formatAddonLine(addon: OrderLineItem) {
  const indent = "\u00A0\u00A0\u00A0\u00A0";
  return `${indent}↳ ${addon.qty}× ${addon.name} — ${formatCurrency(addon.price * addon.qty)}`;
}

function sessionSummary(items: OrderLineItem[]) {
  const drinks = items.filter((item) => !item.forDrink);
  const addons = items.filter((item) => item.forDrink);
  const lines: string[] = [];
  const shownBundles = new Set<string>();

  for (const drink of drinks) {
    if (drink.bundleId) {
      if (shownBundles.has(drink.bundleId)) continue;
      shownBundles.add(drink.bundleId);
      lines.push(`• ${drink.qty}× ${drink.name} — ${formatCurrency(drink.price * drink.qty)}`);
      for (const addon of addons.filter((item) => item.bundleId === drink.bundleId)) {
        lines.push(formatAddonLine(addon));
      }
      continue;
    }

    const linked = addons.filter((item) => item.forDrink === drink.name && !item.bundleId);
    lines.push(`• ${drink.qty}× ${drink.name} — ${formatCurrency(drink.price * drink.qty)}`);
    for (const addon of linked) {
      lines.push(formatAddonLine(addon));
    }
  }

  for (const addon of addons.filter((item) => !item.bundleId && !drinks.some((drink) => drink.name === item.forDrink))) {
    lines.push(`• ${addon.qty}× ${addon.name} — ${formatCurrency(addon.price * addon.qty)}`);
  }

  return lines.join("\n");
}

function formatOrderBlock(items: OrderLineItem[], intro: string) {
  if (!items.length) return intro;
  return `${intro}\n\n${sessionSummary(items)}\n\nTotal: ${formatCurrency(sessionTotal(items))}`;
}

function mergeCartItems(existing: OrderLineItem[], incoming: OrderLineItem[]): OrderLineItem[] {
  const merged = existing.map((i) => ({ ...i }));
  for (const item of incoming) {
    const found = merged.find((i) => lineKey(i) === lineKey(item));
    if (found) found.qty += item.qty;
    else merged.push({ ...item });
  }
  return finalizeCart(merged);
}

function resolveAiCart(existing: OrderLineItem[], fromAi: OrderLineItem[]): OrderLineItem[] {
  if (!fromAi.length) return existing;
  if (!existing.length) return finalizeCart(fromAi);
  const aiHasAllExisting = existing.every((e) => fromAi.some((i) => lineKey(i) === lineKey(e)));
  if (aiHasAllExisting && fromAi.length >= existing.length) return finalizeCart(fromAi);
  return finalizeCart(mergeCartItems(existing, fromAi));
}

function isMenuRequest(text: string) {
  return /\b(menu|what do you (have|sell|offer)|what(?:'s| is) (?:on |available)|show (?:me )?(?:the )?menu|see (?:the )?menu)\b/i.test(
    text.toLowerCase()
  );
}

function formatMenuReply(menu: Menu, items: OrderLineItem[]) {
  let text = `Here's our menu:\n\n${formatMenuForChat(menu)}`;
  if (items.length > 0) {
    text += `\n\nYour order so far:\n${sessionSummary(items)}\nTotal: ${formatCurrency(sessionTotal(items))}\n\nReply confirm to place your order, or tell me what else to add.`;
  } else {
    text += `\n\nWhat would you like?`;
  }
  return text;
}

export function formatMenuForChat(menu: Menu) {
  return menu.categories
    .map((cat) => {
      const lines = cat.items
        .map((i) => `• ${i.name} — ${formatCurrency(i.price)}`)
        .join("\n");
      return `${cat.title}\n${lines}`;
    })
    .join("\n\n");
}

export function parseItemsFromText(
  text: string,
  menu: Menu,
  existing: OrderLineItem[] = []
): OrderLineItem[] {
  const lower = text.toLowerCase();
  const allItems = getAllMenuItems(menu).sort((a, b) => b.name.length - a.name.length);
  const matched: Array<{ menuItem: (typeof allItems)[number]; qty: number }> = [];

  for (const menuItem of allItems) {
    const key = menuItem.name.toLowerCase();
    const words = key.split(/\s+/);
    const matchedText =
      lower.includes(key) ||
      words.some(
        (word) =>
          isMenuWord(word) && new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)
      );
    if (!matchedText) continue;

    const qty = parseQtyForItem(text, menuItem.name);

    if (!matched.find((entry) => entry.menuItem.name === menuItem.name)) {
      matched.push({ menuItem, qty });
    }
  }

  const drinks: OrderLineItem[] = [];
  const addons: OrderLineItem[] = [];

  for (const { menuItem, qty } of matched) {
    const line = { name: menuItem.name, qty, price: menuItem.price };
    if (isAddonMenuItem(menuItem)) addons.push(line);
    else drinks.push(line);
  }

  const result = [...drinks];
  for (const addon of addons) {
    const targets = findDrinksForAddon(text, addon.name, menu, existing, drinks);
    if (targets.length) {
      for (const drinkName of targets) {
        const units = parseAddonUnitsForDrink(text, addon.name, drinkName);
        result.push({ ...addon, qty: units, forDrink: drinkName });
      }
    } else {
      result.push(addon);
    }
  }

  return finalizeCart(result);
}

type AiChatResponse = {
  message: string;
  items: OrderLineItem[];
  awaitingConfirm: boolean;
};

async function callAiChat(
  message: string,
  session: ChatSession,
  menu: Menu,
  storeOpen: boolean,
  history: ChatHistoryEntry[]
): Promise<AiChatResponse | null> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session,
        history,
        menu,
        store: { isOpen: storeOpen },
      }),
    });

    if (!response.ok) {
      if (import.meta.env.DEV) {
        const err = await response.json().catch(() => ({}));
        console.warn("[Spazio chat] AI unavailable, using fallback:", err?.error ?? response.status);
      }
      return null;
    }
    const data = await response.json();
    if (!data?.message) return null;

    return {
      message: data.message,
      items: Array.isArray(data.items) ? data.items : session.items,
      awaitingConfirm: Boolean(data.awaitingConfirm),
    };
  } catch {
    return null;
  }
}

function processWithRules(
  userText: string,
  session: ChatSession,
  menu: Menu
): { text: string; session: ChatSession } {
  const lower = userText.toLowerCase().trim();
  let next = { ...session, items: [...session.items] };

  if (isMenuRequest(lower)) {
    return {
      session: next,
      text: formatMenuReply(menu, next.items),
    };
  }

  const parsed = parseItemsFromText(userText, menu, next.items);
  if (parsed.length > 0) {
    next.items = next.items.length > 0 ? mergeCartItems(next.items, parsed) : parsed;
    next.awaitingConfirm = true;
    const intro = next.items.length > parsed.length ? "Added to your order!" : "Got it!";
    return {
      session: next,
      text: `${formatOrderBlock(next.items, intro)}\n\nReply confirm to place your order, or tell me what else to add.`,
    };
  }

  if (next.items.length > 0) {
    return {
      session: next,
      text: "Reply confirm to place your order, or tell me what else to add.",
    };
  }

  return {
    session: next,
    text: 'Tell me what you\'d like — e.g. "flat white and a croissant" — and I\'ll summarise your order.',
  };
}

export type BotResult =
  | { type: "reply"; text: string; session: ChatSession }
  | { type: "order"; text: string; session: ChatSession; order: Order };

export async function processUserMessage(
  userText: string,
  session: ChatSession,
  menu: Menu,
  storeOpen = true,
  history: ChatHistoryEntry[] = []
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
    const name = userText.replace(/^(i'm|i am|my name is|name is|it's|its)\s+/i, "").trim() || userText;
    const order = await addOrder({
      customerName: name,
      items: next.items,
      notes: "Via chat",
    });
    const cleared = emptySession();
    return {
      type: "order",
      session: cleared,
      order,
      text: `Thanks ${name}! Order #${order.id} is reserved for pickup. Pay via GCash below — we'll start preparing once payment is received.`,
    };
  }

  if (next.awaitingConfirm && (lower === "confirm" || lower === "yes" || lower === "y" || lower.includes("confirm"))) {
    next.awaitingConfirm = false;
    next.awaitingName = true;
    return {
      type: "reply",
      session: next,
      text: `${formatOrderBlock(next.items, "Your order:")}\n\nWhat's your name for the order?`,
    };
  }

  const ai = await callAiChat(userText, next, menu, storeOpen, history);
  if (ai) {
    next.items = resolveAiCart(next.items, ai.items);
    next.awaitingConfirm = ai.awaitingConfirm || next.items.length > 0;
    let text = ai.message;
    if (isMenuRequest(lower)) {
      text = formatMenuReply(menu, next.items);
    } else if (next.awaitingConfirm && next.items.length > 0) {
      const intro = ai.message.split("\n")[0]?.trim() || "Got it!";
      text = `${formatOrderBlock(next.items, intro)}\n\nReply confirm to place your order, or tell me what else to add.`;
    }
    return {
      type: "reply",
      session: next,
      text,
    };
  }

  const fallback = processWithRules(userText, next, menu);
  return {
    type: "reply",
    session: fallback.session,
    text: fallback.text,
  };
}
