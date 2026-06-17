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

function sessionSummary(items: OrderLineItem[]) {
  return items
    .map((i) => `• ${i.qty}× ${i.name} — ${formatCurrency(i.price * i.qty)}`)
    .join("\n");
}

function formatOrderBlock(items: OrderLineItem[], intro: string) {
  if (!items.length) return intro;
  return `${intro}\n\n${sessionSummary(items)}\n\nTotal: ${formatCurrency(sessionTotal(items))}`;
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

  if (lower.includes("menu")) {
    return {
      session: next,
      text: `Here's our menu:\n\n${formatMenuForChat(menu)}\n\nWhat would you like?`,
    };
  }

  const parsed = parseItemsFromText(userText, menu);
  if (parsed.length > 0) {
    next.items = parsed;
    next.awaitingConfirm = true;
    return {
      session: next,
      text: `${formatOrderBlock(next.items, "Got it!")}\n\nReply confirm to place your order.`,
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
    next.items = ai.items;
    next.awaitingConfirm = ai.awaitingConfirm;
    let text = ai.message;
    if (next.awaitingConfirm && next.items.length > 0) {
      const intro = ai.message.split("\n")[0]?.trim() || "Got it!";
      text = `${formatOrderBlock(next.items, intro)}\n\nReply confirm to place your order.`;
    } else if (/\bmenu\b/i.test(userText) && !next.items.length) {
      text = `Here's our menu:\n\n${formatMenuForChat(menu)}\n\nWhat would you like?`;
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
