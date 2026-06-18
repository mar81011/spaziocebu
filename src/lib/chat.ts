import type { ChatSession, Menu, Order, OrderLineItem } from "../types";
import { addOrder, getAllMenuItems } from "./storage";
import { formatCurrency } from "./format";

export type ChatHistoryEntry = { role: "user" | "bot"; text: string };

export function emptySession(): ChatSession {
  return { items: [], awaitingConfirm: false, awaitingName: false };
}

/** Refresh cart line prices and drop items no longer on the menu. */
export function syncSessionWithMenu(items: OrderLineItem[], menu: Menu): OrderLineItem[] {
  const byName = new Map(getAllMenuItems(menu).map((item) => [item.name.toLowerCase(), item]));
  const synced = items
    .map((line) => {
      const menuItem = byName.get(line.name.toLowerCase());
      if (!menuItem) return null;
      return { ...line, price: menuItem.price };
    })
    .filter((line): line is OrderLineItem => line !== null);
  return sanitizeCart(synced, menu);
}

function expandOrderingAliases(text: string): string {
  return text
    .replace(/\bcaps?\b/gi, "cappuccino")
    .replace(/\bcapp\b/gi, "cappuccino")
    .replace(/\bcort\b/gi, "cortado")
    .replace(/\bmatcha\b(?!\s+latte)/gi, "matcha latte");
}

function normalizeOrderText(text: string): string {
  return expandOrderingAliases(
    text
      .replace(/\badd(\d+)/gi, "add $1")
      .replace(/\bcappucino\b/gi, "cappuccino")
      .replace(/\bcappu+\b/gi, "cappuccino")
      .replace(/\bextro\b/gi, "extra")
      .replace(/\bextr\b/gi, "extra")
  );
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function sessionTotal(items: OrderLineItem[]) {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

function lineKey(item: OrderLineItem) {
  if (item.bundleId) return `${item.bundleId}::${item.name}::${item.forDrink ?? ""}`;
  return `${item.name}::${item.forDrink ?? ""}`;
}

function addonSearchPattern(addonName: string): string {
  const lower = addonName.toLowerCase();
  if (/extra\s*shot/i.test(lower)) return "(?:extro|extra)(?:\\s+shot)?";
  if (/oat\s*milk/i.test(lower)) return "oat(?:\\s+milk)?(?:\\s+swap)?";
  if (/vanilla/i.test(lower)) return "vanilla(?:\\s+syrup)?";
  return escapeRegex(lower);
}

function isAddonTargetRequest(
  text: string,
  addons: OrderLineItem[],
  drinks: OrderLineItem[]
): boolean {
  if (addons.length === 0) return false;
  const lower = text.toLowerCase();
  const hasAddonIntent =
    /\b(?:add|put|include|extra|extro)\b/i.test(lower) ||
    /\b(?:oat|vanilla|extra)(?:\s+(?:milk|shot|syrup|swap))?\s+(?:on|for|to)\b/i.test(lower) ||
    /\b(?:on|for|to)\s+each\b/i.test(lower);
  if (!hasAddonIntent) return false;
  if (
    !/\b(?:on|for|to)\s+(?:the\s+)?(?:(?:\d+\s*(?:x\s*)?)|(?:one|a|an)\s+)/i.test(lower) &&
    !/\b(?:on|for|to)\s+(?:the\s+)?(?:(?:\d+\s*(?:x\s*)?)?)(?:flat|spazio|cortado|cappuccino|matcha|pour|white|latte)\b/i.test(
      lower
    )
  ) {
    return false;
  }
  if (drinks.length > 0 && /\band\s+(?:a|an|\d+|one|two|three|four|five|another)\s+/i.test(lower)) {
    return false;
  }
  if (drinks.length > 0 && /\band\s+(?:a\s+)?(?:cappuccino|flat|cortado|matcha|pour|spazio)/i.test(lower)) {
    return false;
  }
  return true;
}

function isConfirmRequest(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(?:confirm|yes|y|ok(?:ay)?|place(?:\s+my)?\s*order|looks?\s+good|that(?:'?s| is)\s+(?:correct|right|fine|good|it)|go\s+ahead|proceed)$/.test(
    t
  );
}

function parseQtyForItem(text: string, itemName: string): number {
  const lower = text.toLowerCase();
  const nameLower = itemName.toLowerCase();
  const escaped = escapeRegex(nameLower).replace(/\s+/g, "\\s+");
  const wordQtyPattern = "(?:one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|pair|both)";
  const patterns = [
    new RegExp(`(\\d+)\\s*(?:x\\s*)?${escaped}s?\\b`, "i"),
    new RegExp(`(\\d+)\\s+${escaped}`, "i"),
    new RegExp(`${wordQtyPattern}\\s+(?:x\\s*)?${escaped}s?\\b`, "i"),
    new RegExp(`${wordQtyPattern}\\s+${escaped}`, "i"),
  ];

  const nameWords = nameLower.split(/\s+/).filter((word) => isMenuWord(word));
  if (nameWords.length >= 2) {
    const flexible = nameWords.map((word) => `${escapeRegex(word)}s?`).join("\\s+");
    patterns.push(new RegExp(`(\\d+)\\s*(?:x\\s*)?${flexible}\\b`, "i"));
    patterns.push(new RegExp(`(\\d+)\\s+${flexible}\\b`, "i"));
    patterns.push(new RegExp(`${wordQtyPattern}\\s+(?:x\\s*)?${flexible}\\b`, "i"));
    patterns.push(new RegExp(`${wordQtyPattern}\\s+${flexible}\\b`, "i"));
  }

  const firstWord = nameLower.split(/\s+/)[0];
  if (firstWord && isMenuWord(firstWord)) {
    patterns.push(new RegExp(`(\\d+)\\s*(?:x\\s*)?${escapeRegex(firstWord)}s?\\b`, "i"));
    patterns.push(new RegExp(`(\\d+)\\s+${escapeRegex(firstWord)}s?\\b`, "i"));
    patterns.push(new RegExp(`${wordQtyPattern}\\s+(?:x\\s*)?${escapeRegex(firstWord)}s?\\b`, "i"));
    patterns.push(new RegExp(`${wordQtyPattern}\\s+${escapeRegex(firstWord)}s?\\b`, "i"));
  }

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    const parsed = /^\d+$/.test(match[1]) ? parseInt(match[1], 10) : wordToQty(match[1]);
    if (parsed) return Math.max(1, parsed);
  }
  return 1;
}

function parseAddonUnitsForDrink(
  text: string,
  addonName: string,
  drinkName: string,
  existing: OrderLineItem[] = []
): number {
  const lower = text.toLowerCase();
  const alias = addonSearchPattern(addonName);
  const drinkEsc = escapeRegex(drinkName.toLowerCase()).replace(/\s+/g, "\\s+");

  if (/\beach\b|\bapiece\b|\bper\s+drink\b|\bon\s+each\b/i.test(lower)) {
    const drinkQty = countDrinkQty(existing, drinkName);
    if (drinkQty > 0) return drinkQty;
  }

  const onDrinkQty = lower.match(
    new RegExp(`(?:on|for|to)\\s+(\\d+)\\s*(?:x\\s*)?${drinkEsc}s?\\b`, "i")
  );
  if (onDrinkQty) return Math.max(1, parseInt(onDrinkQty[1], 10));

  const qtyMatch = lower.match(
    new RegExp(`${alias}\\s+(?:on|for|to)\\s+(\\d+)\\s*(?:x\\s*)?${drinkEsc}s?\\b`, "i")
  );
  if (qtyMatch) return Math.max(1, parseInt(qtyMatch[1], 10));

  if (new RegExp(`${alias}\\s+(?:on|for|to)\\s+.*?${drinkEsc}`, "i").test(lower)) return 1;

  if (new RegExp(`(?:on|for|to)\\s+.*?${drinkEsc}`, "i").test(lower)) return 1;

  const wordQtyMatch = lower.match(
    new RegExp(`(one|two|three|four|five|a|an|couple|pair)\\s+(?:extra\\s+)?${alias}`, "i")
  );
  if (wordQtyMatch) {
    const qty = wordToQty(wordQtyMatch[1]);
    if (qty) return qty;
  }

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

function isAddonLineName(name: string, menu: Menu) {
  const menuItem = getAllMenuItems(menu).find((item) => item.name === name);
  return menuItem ? isAddonMenuItem(menuItem) : false;
}

function sanitizeCart(items: OrderLineItem[], menu: Menu): OrderLineItem[] {
  const cleaned = items
    .filter((item) => !item.forDrink || isAddonLineName(item.name, menu))
    .map((item) => {
      if (item.forDrink && item.forDrink === item.name) {
        const { forDrink: _, bundleId: __, ...rest } = item;
        return rest;
      }
      return item;
    });
  return finalizeCart(cleaned);
}

function isClarifyingMessage(text: string) {
  return /\?|would you like|just to clarify|did you mean|which one|let me know/i.test(text);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMenuWord(word: string) {
  return word.length >= 3;
}

const WORD_TO_QTY: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  couple: 2,
  pair: 2,
  both: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function wordToQty(word: string): number | null {
  const qty = WORD_TO_QTY[word.toLowerCase()];
  return qty ?? null;
}

function matchesMenuItemName(text: string, itemName: string, allItemNames: string[] = []): boolean {
  const lower = text.toLowerCase();
  const key = itemName.toLowerCase();
  if (lower.includes(key)) return true;

  const words = key.split(/\s+/).filter((word) => isMenuWord(word));
  if (words.length >= 2) {
    if (words.every((word) => new RegExp(`\\b${escapeRegex(word)}s?\\b`).test(lower))) {
      return true;
    }
    const firstWord = words[0];
    if (firstWord && new RegExp(`\\b${escapeRegex(firstWord)}s?\\b`).test(lower)) {
      const names = allItemNames.length ? allItemNames : [itemName];
      const withSameLead = names.filter((name) => {
        const lead = name.toLowerCase().split(/\s+/).filter((w) => isMenuWord(w))[0];
        return lead === firstWord;
      });
      if (withSameLead.length === 1 && withSameLead[0].toLowerCase() === key) {
        return true;
      }
    }
  } else {
    if (words.some((word) => new RegExp(`\\b${escapeRegex(word)}\\b`).test(lower))) {
      return true;
    }
  }

  const tokens = lower.match(/\b[a-z]{4,}\b/gi) ?? [];
  for (const token of tokens) {
    const firstWord = key.split(/\s+/).filter(isMenuWord)[0];
    if (!firstWord || token.length < 4) continue;

    const prefixMatches = allItemNames.filter((name) => {
      const lead = name.toLowerCase().split(/\s+/).filter(isMenuWord)[0];
      return lead && lead.startsWith(token);
    });
    if (prefixMatches.length === 1 && prefixMatches[0].toLowerCase() === key) return true;

    const typoMatches = allItemNames.filter((name) => {
      const lead = name.toLowerCase().split(/\s+/)[0];
      return token.length >= 5 && levenshtein(token, lead) === 1;
    });
    if (typoMatches.length === 1 && typoMatches[0].toLowerCase() === key) return true;
  }

  return false;
}

function countDrinkQty(cart: OrderLineItem[], drinkName: string): number {
  return cart
    .filter((item) => !item.forDrink && item.name === drinkName)
    .reduce((sum, item) => sum + item.qty, 0);
}

function allDrinkNamesInCart(cart: OrderLineItem[]): string[] {
  const names = new Set<string>();
  for (const item of cart) {
    if (!item.forDrink) names.add(item.name);
  }
  return [...names];
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
      if (pl.includes(nl)) {
        targets.push(name);
        break;
      }
      const words = nl.split(/\s+/).filter((w) => isMenuWord(w));
      const matchedWords = words.filter((w) => new RegExp(`\\b${escapeRegex(w)}s?\\b`).test(pl));
      if (words.length >= 2 && matchedWords.length >= 2) {
        targets.push(name);
        break;
      }
      if (words.length === 1 && matchedWords.length === 1) {
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
  const alias = addonSearchPattern(addonName);

  if (/\beach\b|\bapiece\b|\bper\s+drink\b|\bon\s+each\b/i.test(lower) && existing.length > 0) {
    const cartDrinks = allDrinkNamesInCart(existing);
    if (cartDrinks.length) return cartDrinks;
  }

  const targetPatterns = [
    new RegExp(`\\badd\\s+${alias}\\s+(?:on|for|to)\\s+(.+?)$`, "i"),
    new RegExp(`${alias}\\s+(?:on|for|to)\\s+(.+?)(?:\\s+and\\s+|$|\\.|!|\\?)`, "i"),
    new RegExp(`\\badd\\s+${alias}\\s+(?:on|for|to)\\s+(.+?)(?:\\s+and\\s+|$|\\.|!|\\?)`, "i"),
  ];
  for (const pattern of targetPatterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    if (/the other one|the other|one of them/i.test(match[1])) {
      const sole = inferSoleDrinkInContext(existing, drinksInMessage);
      if (sole) return [sole];
    }
    const found = matchDrinksInText(match[1], drinkNames);
    if (found.length) return found;
  }

  const onMatch = lower.match(
    new RegExp(`${escapeRegex(addonName.toLowerCase())}\\s+(?:on|for|to)\\s+(.+?)(?:\\s+and\\s+|$|\\.|!|\\?)`, "i")
  );
  if (onMatch) {
    if (/the other one|the other|one of them/i.test(onMatch[1])) {
      const sole = inferSoleDrinkInContext(existing, drinksInMessage);
      if (sole) return [sole];
    }
    const found = matchDrinksInText(onMatch[1], drinkNames);
    if (found.length) return found;
  }

  if (/for the other(?: one)? add/i.test(lower)) {
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
    new RegExp(`(.+?)\\s+with\\s+${alias}`, "i")
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

function formatAddToCartReply(
  existing: OrderLineItem[],
  added: OrderLineItem[],
  merged: OrderLineItem[]
): string {
  const footer = "Reply confirm to place your order, or tell me what else to add.";
  if (existing.length === 0) {
    return `${formatOrderBlock(merged, "Got it!")}\n\n${footer}`;
  }
  return `${formatOrderBlock(added, "Added to your order:")}\n\n${formatOrderBlock(merged, "Your order so far:")}\n\n${footer}`;
}

function chitchatReply(text: string, hasCart: boolean): string | null {
  const t = text.trim().toLowerCase();
  if (/^(hi|hello|hey|good (?:morning|afternoon|evening))[\s!.?]*$/i.test(t)) {
    return hasCart
      ? "Hi! Your order is in progress — add more items, say **confirm**, or ask to see your order."
      : "Hi! Tell me what you'd like to order — plain language works great.";
  }
  if (/^(thanks|thank you|ty)[\s!.?]*$/i.test(t)) {
    return hasCart
      ? "You're welcome! Reply **confirm** when you're ready, or keep adding items."
      : "You're welcome! What can I get for you?";
  }
  if (/^(bye|goodbye|see you)[\s!.?]*$/i.test(t)) {
    return "See you soon! Your chat is saved if you come back later.";
  }
  return null;
}

function isGenericFallback(text: string): boolean {
  return /plain language|tell me what you'd like|reply confirm to place/i.test(text);
}

function isOrderAttempt(text: string): boolean {
  const lower = text.toLowerCase();
  if (isMenuRequest(lower) || isOrderSummaryRequest(lower)) return false;
  if (/\b(?:add|put|include)\s+(?:\d+|one|two|a|an|extra|extro|oat|vanilla|cappu|spazio|flat|cortado|matcha)/i.test(lower)) {
    return true;
  }
  if (/\b(?:extra|extro|oat|vanilla)\b/i.test(lower) && /\b(?:on|for|to)\s+each\b/i.test(lower)) {
    return false;
  }
  if (/\b(?:oat|vanilla)\b/i.test(lower) && /\b(?:on|for|to)\b/i.test(lower)) {
    return false;
  }
  return /\b(add|get|want|i(?:'d| would) like|can i (?:get|have)|give me)\b/i.test(lower) ||
    /\border\s+\d+\b/i.test(lower) ||
    /\border\s+(?:a|an|one|some)\b/i.test(lower);
}

function unrecognizedOrderReply(text: string, menu: Menu): string | null {
  const normalized = normalizeOrderText(text);
  const lower = normalized.toLowerCase();
  if (parseItemsFromText(normalized, menu).length > 0) return null;
  if (isMenuRequest(lower) || isOrderSummaryRequest(lower)) return null;
  if (isClearOrderRequest(lower) || isClearChatRequest(lower)) return null;
  if (isRemoveRequest(lower) || isChangeRequest(lower)) return null;
  if (!isOrderAttempt(lower)) return null;
  return "We don't have that on our menu. Say \"menu\" to see what's available, or tell me another drink or item you'd like.";
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

function isClearOrderRequest(text: string) {
  return /\b(clear|cancel)\s+(?:my\s+)?order\b|\bstart over\b|\breset\s+(?:my\s+)?order\b/i.test(
    text.toLowerCase()
  );
}

export function isClearChatRequest(text: string) {
  return (
    /\b(clear|reset|delete|wipe)\s+(?:the\s+)?chat\b/i.test(text.toLowerCase()) ||
    /\bnew\s+chat\b/i.test(text.toLowerCase()) ||
    /\bstart\s+(?:a\s+)?(?:new|fresh)\s+(?:chat|conversation)\b/i.test(text.toLowerCase())
  );
}

function isRemoveRequest(text: string) {
  const lower = text.toLowerCase();
  if (isClearOrderRequest(lower)) return false;
  return /\b(remove|delete|take off|drop|without|no more)\b/i.test(lower) || /\bcancel\b/.test(lower);
}

function isChangeRequest(text: string) {
  const lower = text.toLowerCase();
  if (isClearOrderRequest(lower) || isRemoveRequest(lower)) return false;
  return (
    /\bchange(?:d)?\s+my\s+mind\b/i.test(lower) ||
    /\bchange(?:d)?\s+(?:it|that|this|my\s+order)\s+to\b/i.test(lower) ||
    /\bchange\s+to\b/i.test(lower) ||
    /\bswitch(?:ed)?\s+(?:it\s+)?to\b/i.test(lower) ||
    /\breplace(?:d)?\s+(?:it|that|this)\s+with\b/i.test(lower) ||
    /\bmake\s+it\s+.+\s+instead\b/i.test(lower) ||
    /\b(?:swap|switch)\s+.+\s+(?:for|with|to)\b/i.test(lower)
  );
}

function inferDrinksToReplace(cart: OrderLineItem[]): string[] {
  const sole = inferSoleDrinkInContext(cart, []);
  if (sole) return [sole];

  const drinks = cart.filter((item) => !item.forDrink);
  if (drinks.length === 1) return [drinks[0].name];

  return [];
}

function parseChangeRequest(
  text: string,
  menu: Menu,
  cart: OrderLineItem[]
): { removeDrinkNames: string[]; newItemsText: string } | null {
  if (!isChangeRequest(text)) return null;

  const drinkNames = collectDrinkNames(menu, cart);

  const swapMatch = text.match(
    /(?:swap|switch)\s+(?:the\s+)?(.+?)\s+(?:for|with|to)\s+(.+?)(?:\.|!|\?|$)/i
  );
  if (swapMatch) {
    const removeDrinkNames = matchDrinksInText(swapMatch[1], drinkNames);
    if (removeDrinkNames.length) {
      return { removeDrinkNames, newItemsText: swapMatch[2].trim() };
    }
  }

  const mindMatch = text.match(
    /change(?:d)?\s+my\s+mind(?:,)?\s*(?:change\s+)?(?:it\s+)?to\s+(.+)/i
  );
  if (mindMatch) {
    return {
      removeDrinkNames: inferDrinksToReplace(cart),
      newItemsText: mindMatch[1].trim(),
    };
  }

  const simplePatterns = [
    /change(?:d)?\s+(?:it|that|this|my\s+order)\s+to\s+(.+)/i,
    /change\s+to\s+(.+)/i,
    /switch(?:ed)?\s+(?:it\s+)?to\s+(.+)/i,
    /replace(?:d)?\s+(?:it|that|this)\s+with\s+(.+)/i,
    /make\s+it\s+(.+?)\s+instead/i,
  ];
  for (const pattern of simplePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        removeDrinkNames: inferDrinksToReplace(cart),
        newItemsText: match[1].trim(),
      };
    }
  }

  for (const name of [...drinkNames].sort((a, b) => b.length - a.length)) {
    const pattern = new RegExp(
      `change(?:d)?\\s+(?:the\\s+)?${escapeRegex(name)}\\s+to\\s+(.+)`,
      "i"
    );
    const match = text.match(pattern);
    if (match) {
      return { removeDrinkNames: [name], newItemsText: match[1].trim() };
    }
  }

  return null;
}

function removeOneDrinkFromCart(cart: OrderLineItem[], drinkName: string): OrderLineItem[] {
  let result = cart.map((item) => ({ ...item }));

  const plainIdx = result.findIndex(
    (item) => !item.forDrink && !item.bundleId && item.name === drinkName
  );
  if (plainIdx >= 0) {
    if (result[plainIdx].qty > 1) result[plainIdx].qty -= 1;
    else result.splice(plainIdx, 1);
  } else {
    const bundleIdx = result.findIndex(
      (item) => !item.forDrink && item.bundleId && item.name === drinkName
    );
    if (bundleIdx >= 0) {
      const bundleId = result[bundleIdx].bundleId;
      result = result.filter((item) => item.bundleId !== bundleId);
    }
  }

  const stillHasDrink = result.some((item) => !item.forDrink && item.name === drinkName);
  if (!stillHasDrink) {
    result = result.filter((item) => item.forDrink !== drinkName);
  }

  return result;
}

function removeDrinkQtyFromCart(cart: OrderLineItem[], drinkName: string, qty: number): OrderLineItem[] {
  let result = cart.map((item) => ({ ...item }));
  for (let i = 0; i < qty; i++) {
    const before = result.length;
    result = removeOneDrinkFromCart(result, drinkName);
    if (result.length === before && !result.some((item) => !item.forDrink && item.name === drinkName)) {
      break;
    }
  }
  return result;
}

function applyChangeRequest(
  cart: OrderLineItem[],
  text: string,
  menu: Menu
): OrderLineItem[] | null {
  const parsed = parseChangeRequest(text, menu, cart);
  if (!parsed) return null;

  const newItems = parseItemsFromText(parsed.newItemsText, menu, cart);
  if (!newItems.length) return null;

  const removeNames = parsed.removeDrinkNames.filter(Boolean);
  if (!removeNames.length) return null;

  let result = cart.map((item) => ({ ...item }));
  const soleDrink = inferSoleDrinkInContext(cart, []);

  for (const drinkName of removeNames) {
    const totalQty = result
      .filter((item) => !item.forDrink && item.name === drinkName)
      .reduce((sum, item) => sum + item.qty, 0);
    const qtyToRemove =
      soleDrink === drinkName && removeNames.length === 1 ? Math.max(totalQty, 1) : 1;
    result = removeDrinkQtyFromCart(result, drinkName, qtyToRemove);
  }

  return finalizeCart(mergeCartItems(result, newItems));
}

function tryApplyChange(
  userText: string,
  session: ChatSession,
  menu: Menu
): { text: string; session: ChatSession } | null {
  if (!isChangeRequest(userText) || session.items.length === 0) return null;

  const updated = applyChangeRequest(session.items, userText, menu);
  if (!updated) {
    return {
      session,
      text: 'I couldn\'t swap that item. Try "change it to flat white" or "switch signature to flat white".',
    };
  }

  return {
    session: { ...session, items: updated, awaitingConfirm: true },
    text: applyCartChangeReply(updated, "Updated your order:"),
  };
}

function removeAddonFromCart(
  cart: OrderLineItem[],
  addonName: string,
  qty: number,
  forDrink?: string
): OrderLineItem[] {
  let result = cart.map((item) => ({ ...item }));
  let remaining = qty;

  for (let i = result.length - 1; i >= 0 && remaining > 0; i--) {
    const item = result[i];
    if (item.name !== addonName || !item.forDrink) continue;
    if (forDrink && item.forDrink !== forDrink) continue;
    if (item.bundleId) continue;

    const take = Math.min(item.qty, remaining);
    item.qty -= take;
    remaining -= take;
    if (item.qty <= 0) result.splice(i, 1);
  }

  while (remaining > 0) {
    const bundleIdx = result.findIndex(
      (item) =>
        !item.forDrink &&
        item.bundleId &&
        (!forDrink || item.name === forDrink) &&
        result.some((a) => a.bundleId === item.bundleId && a.name === addonName)
    );
    if (bundleIdx < 0) break;
    const bundleId = result[bundleIdx].bundleId;
    result = result.filter((item) => item.bundleId !== bundleId);
    remaining -= 1;
  }

  return result;
}

function removeFromCart(cart: OrderLineItem[], text: string, menu: Menu): OrderLineItem[] {
  const normalized = normalizeOrderText(text);
  const lower = normalized.toLowerCase();
  const removeAll = /\ball\b|\bboth\b|\bevery\b/i.test(lower);
  const allItemNames = getAllMenuItems(menu).map((item) => item.name);

  const addonItem = getAllMenuItems(menu).find(
    (item) => isAddonMenuItem(item) && matchesMenuItemName(lower, item.name, allItemNames)
  );

  if (addonItem) {
    const qty = removeAll ? 999 : parseQtyForItem(normalized, addonItem.name);
    const drinkScope = findDrinksForAddon(normalized, addonItem.name, menu, cart, []);
    const forDrink = drinkScope.length === 1 ? drinkScope[0] : undefined;
    return finalizeCart(removeAddonFromCart(cart, addonItem.name, qty, forDrink));
  }

  const targets = parseItemsFromText(normalized, menu, cart).filter(
    (target) => !isAddonLineName(target.name, menu)
  );
  if (!targets.length) return cart;

  let result = cart.map((item) => ({ ...item }));

  for (const target of targets) {
    if (removeAll) {
      const bundleIds = new Set(
        result
          .filter((item) => !item.forDrink && item.name === target.name && item.bundleId)
          .map((i) => i.bundleId!)
      );
      result = result.filter(
        (item) =>
          item.name !== target.name &&
          item.forDrink !== target.name &&
          (!item.bundleId || !bundleIds.has(item.bundleId))
      );
      continue;
    }

    result = removeDrinkQtyFromCart(result, target.name, target.qty);
  }

  return finalizeCart(result);
}

function applyCartChangeReply(items: OrderLineItem[], intro: string) {
  if (!items.length) {
    return "Removed. Your cart is empty — tell me what you'd like.";
  }
  return `${formatOrderBlock(items, intro)}\n\nReply confirm to place your order, or tell me what else to add.`;
}

function isMenuRequest(text: string) {
  return /\b(menu|what do you (have|sell|offer)|what(?:'s| is) (?:on |available)|show (?:me )?(?:the )?menu|see (?:the )?menu)\b/i.test(
    text.toLowerCase()
  );
}

function isOrderSummaryRequest(text: string) {
  const lower = text.toLowerCase();
  if (
    /\b(i(?:'d| would)?\s*(?:like|love)\s+to\s+order|want\s+to\s+order|can\s+i\s+order|order\s+\d+|order\s+(?:a|an|one|some)\b)/i.test(
      lower
    ) &&
    !/\b(what(?:'s| is)\s+my\s+order|show\s+(?:me\s+)?my\s+order)\b/i.test(lower)
  ) {
    return false;
  }
  return (
    /\b(summari[sz]e|summary|recap|repeat)\b/i.test(lower) ||
    /\b(show|see|check|view|tell)\b.*\b(my\s+)?(order|cart)\b/i.test(lower) ||
    /\bwhat(?:'s| is)\s+(?:my\s+)?(?:order|in my (?:order|cart))\b/i.test(lower) ||
    /\b(my\s+)?(order|cart)\s+(so far|summary|total)\b/i.test(lower) ||
    /\bwhat do i have\b/i.test(lower) ||
    /\bwhat did i order\b/i.test(lower) ||
    /\bhow much\b.*\b(so far|total|order)\b/i.test(lower)
  );
}

function orderSummaryReply(items: OrderLineItem[]) {
  if (!items.length) {
    return "You don't have anything in your order yet — tell me what you'd like and I'll summarise it for you.";
  }
  return `${formatOrderBlock(items, "Here's your order:")}\n\nReply confirm to place your order, or tell me what else to add.`;
}

function getAddonTargetClarification(text: string, menu: Menu, existing: OrderLineItem[]): string | null {
  const normalized = normalizeOrderText(text);
  const lower = normalized.toLowerCase();
  if (!/\b(?:add|extra|with)\b/i.test(lower)) return null;

  const allItemNames = getAllMenuItems(menu).map((item) => item.name);
  const addon = getAllMenuItems(menu).find(
    (item) => isAddonMenuItem(item) && matchesMenuItemName(lower, item.name, allItemNames)
  );
  if (!addon) return null;

  const cartDrinks = allDrinkNamesInCart(existing);
  if (cartDrinks.length <= 1) return null;
  if (findDrinksForAddon(normalized, addon.name, menu, existing, []).length > 0) return null;

  return `Which drink should I add ${addon.name} to? You have ${cartDrinks.join(" and ")} in your order.`;
}

function tryApplySetQty(
  userText: string,
  session: ChatSession
): { text: string; session: ChatSession } | null {
  const lower = userText.toLowerCase().trim();
  const patterns = [
    /^make it (\d+|one|two|three|four|five)$/i,
    /^actually (\d+|one|two|three|four|five)$/i,
    /^change (?:that|it) to (\d+|one|two|three|four|five)$/i,
    /^(\d+|one|two|three|four|five) (?:total|altogether)(?: please)?$/i,
  ];

  let qty: number | null = null;
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    qty = /^\d+$/.test(match[1]) ? parseInt(match[1], 10) : wordToQty(match[1]);
    break;
  }
  if (!qty || qty < 1) return null;

  const drinks = session.items.filter((item) => !item.forDrink);
  if (drinks.length !== 1 || session.items.some((item) => item.bundleId || item.forDrink)) {
    return null;
  }

  const sole = drinks[0].name;
  const updated = session.items.map((item) =>
    !item.forDrink && item.name === sole ? { ...item, qty } : item
  );

  return {
    session: { ...session, items: finalizeCart(updated), awaitingConfirm: true },
    text: applyCartChangeReply(finalizeCart(updated), "Updated your order:"),
  };
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

function countDistinctOrderSegments(text: string): number {
  const normalized = normalizeOrderText(text).toLowerCase();
  const matches = normalized.match(
    /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(?:x\s*)?(?=\S)/gi
  );
  return matches?.length ?? 0;
}

export function parseItemsFromText(
  text: string,
  menu: Menu,
  existing: OrderLineItem[] = []
): OrderLineItem[] {
  const normalized = normalizeOrderText(text);
  const lower = normalized.toLowerCase();
  const allItems = getAllMenuItems(menu).sort((a, b) => b.name.length - a.name.length);
  const allItemNames = allItems.map((item) => item.name);
  const matched: Array<{ menuItem: (typeof allItems)[number]; qty: number }> = [];

  for (const menuItem of allItems) {
    if (!matchesMenuItemName(lower, menuItem.name, allItemNames)) continue;

    const qty = parseQtyForItem(normalized, menuItem.name);

    if (!matched.find((entry) => entry.menuItem.name === menuItem.name)) {
      matched.push({ menuItem, qty });
    }
  }

  if (matched.length > 1) {
    const addonMatches = matched.filter((entry) => isAddonMenuItem(entry.menuItem));
    let drinkMatches = matched.filter((entry) => !isAddonMenuItem(entry.menuItem));

    if (drinkMatches.length > 1 && countDistinctOrderSegments(normalized) < 2) {
      const fullNameMatches = drinkMatches.filter((entry) =>
        lower.includes(entry.menuItem.name.toLowerCase())
      );
      if (fullNameMatches.length === 1) {
        drinkMatches = [fullNameMatches[0]];
      } else if (fullNameMatches.length > 1) {
        drinkMatches = fullNameMatches;
      } else {
        const allWordMatches = drinkMatches.filter((entry) => {
          const words = entry.menuItem.name.toLowerCase().split(/\s+/).filter((w) => isMenuWord(w));
          return words.length >= 2 && words.every((w) => new RegExp(`\\b${escapeRegex(w)}s?\\b`).test(lower));
        });
        if (allWordMatches.length === 1) {
          drinkMatches = [allWordMatches[0]];
        } else if (allWordMatches.length > 1) {
          drinkMatches = allWordMatches;
        } else {
          const leadMatches = drinkMatches.filter((entry) => {
            const lead = entry.menuItem.name.toLowerCase().split(/\s+/).filter((w) => isMenuWord(w))[0];
            return lead && new RegExp(`\\b${escapeRegex(lead)}s?\\b`).test(lower);
          });
          if (leadMatches.length >= 1) {
            leadMatches.sort((a, b) => b.menuItem.name.length - a.menuItem.name.length);
            drinkMatches = [leadMatches[0]];
          }
        }
      }
    }

    matched.splice(0, matched.length, ...drinkMatches, ...addonMatches);
  }

  const drinks: OrderLineItem[] = [];
  const addons: OrderLineItem[] = [];

  for (const { menuItem, qty } of matched) {
    const line = { name: menuItem.name, qty, price: menuItem.price };
    if (isAddonMenuItem(menuItem)) addons.push(line);
    else drinks.push(line);
  }

  const addonTargetRequest = isAddonTargetRequest(normalized, addons, drinks);
  const result = addonTargetRequest ? [] : [...drinks];
  for (const addon of addons) {
    const targets = findDrinksForAddon(normalized, addon.name, menu, existing, drinks);
    if (targets.length) {
      for (const drinkName of targets) {
        const units = parseAddonUnitsForDrink(normalized, addon.name, drinkName, existing);
        result.push({ ...addon, qty: units, forDrink: drinkName });
      }
    } else if (
      existing.length > 0 &&
      /\b(add|extra|with)\b/i.test(normalized) &&
      /\b(each|apiece|per\s+drink|on\s+each)\b/i.test(normalized)
    ) {
      for (const drinkName of allDrinkNamesInCart(existing)) {
        const units = countDrinkQty(existing, drinkName);
        if (units > 0) {
          result.push({ ...addon, qty: units, forDrink: drinkName });
        }
      }
    } else if (existing.length > 0 && allDrinkNamesInCart(existing).length === 1) {
      result.push({ ...addon, forDrink: allDrinkNamesInCart(existing)[0] });
    } else if (drinks.length === 1) {
      result.push({ ...addon, forDrink: drinks[0].name });
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

  if (isOrderSummaryRequest(lower)) {
    return {
      session: next,
      text: orderSummaryReply(next.items),
    };
  }

  const changeResult = tryApplyChange(userText, next, menu);
  if (changeResult) return changeResult;

  const parsed = parseItemsFromText(userText, menu, next.items);
  if (parsed.length > 0) {
    const existing = next.items;
    const merged = existing.length > 0 ? mergeCartItems(existing, parsed) : parsed;
    next.items = merged;
    next.awaitingConfirm = true;
    return {
      session: next,
      text: formatAddToCartReply(existing, parsed, merged),
    };
  }

  const unrecognized = unrecognizedOrderReply(userText, menu);
  if (next.items.length > 0) {
    return {
      session: next,
      text: unrecognized ?? "Reply confirm to place your order, or tell me what else to add.",
    };
  }

  return {
    session: next,
    text:
      unrecognized ??
      "Tell me what you'd like in plain language — I'll summarise everything before you confirm.",
  };
}

export type BotResult =
  | { type: "reply"; text: string; session: ChatSession; suggestRecovery?: boolean }
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

  if (next.awaitingConfirm && isConfirmRequest(lower)) {
    if (next.items.length === 0) {
      return {
        type: "reply",
        session: { ...next, awaitingConfirm: false },
        text: orderSummaryReply([]),
      };
    }
    next.awaitingConfirm = false;
    next.awaitingName = true;
    return {
      type: "reply",
      session: next,
      text: `${formatOrderBlock(next.items, "Your order:")}\n\nWhat's your name for the order?`,
    };
  }

  if (isClearOrderRequest(lower)) {
    return {
      type: "reply",
      session: { ...next, items: [], awaitingConfirm: false },
      text: "Order cleared. What would you like instead?",
    };
  }

  if (isRemoveRequest(lower) && next.items.length > 0) {
    const updated = removeFromCart(next.items, userText, menu);
    const changed = JSON.stringify(updated) !== JSON.stringify(next.items);
    if (!changed) {
      return {
        type: "reply",
        session: next,
        suggestRecovery: true,
        text: 'I couldn\'t find that in your order. Try "remove flat white" or "cancel the extra shot".',
      };
    }
    return {
      type: "reply",
      session: { ...next, items: updated, awaitingConfirm: updated.length > 0 },
      text: applyCartChangeReply(updated, "Updated your order:"),
    };
  }

  if (isOrderSummaryRequest(lower)) {
    return {
      type: "reply",
      session: next,
      text: orderSummaryReply(next.items),
    };
  }

  const changeResult = tryApplyChange(userText, next, menu);
  if (changeResult) {
    return {
      type: "reply",
      session: changeResult.session,
      text: changeResult.text,
    };
  }

  const setQtyResult = tryApplySetQty(userText, next);
  if (setQtyResult) {
    return { type: "reply", session: setQtyResult.session, text: setQtyResult.text };
  }

  const ruleParsed = parseItemsFromText(userText, menu, next.items);
  const addonClarification = getAddonTargetClarification(userText, menu, next.items);
  if (addonClarification && ruleParsed.length === 0) {
    return { type: "reply", session: next, text: addonClarification, suggestRecovery: true };
  }
  if (ruleParsed.length > 0) {
    const existing = next.items;
    const merged = existing.length > 0 ? mergeCartItems(existing, ruleParsed) : ruleParsed;
    next.items = merged;
    next.awaitingConfirm = true;
    return {
      type: "reply",
      session: next,
      text: formatAddToCartReply(existing, ruleParsed, merged),
    };
  }

  const unrecognized = unrecognizedOrderReply(userText, menu);
  if (unrecognized) {
    return { type: "reply", session: next, text: unrecognized, suggestRecovery: true };
  }

  const chitchat = chitchatReply(userText, next.items.length > 0);
  if (chitchat) {
    return { type: "reply", session: next, text: chitchat.replace(/\*\*/g, "") };
  }

  const ai = await callAiChat(userText, next, menu, storeOpen, history);
  if (ai) {
    if (isRemoveRequest(lower) || isClearOrderRequest(lower)) {
      next.items = sanitizeCart(ai.items.length ? ai.items : next.items, menu);
    } else {
      next.items = sanitizeCart(resolveAiCart(next.items, ai.items), menu);
    }
    next.awaitingConfirm = next.items.length > 0;
    let text = ai.message;
    if (isOrderSummaryRequest(lower)) {
      text = orderSummaryReply(next.items);
    } else if (isMenuRequest(lower)) {
      text = formatMenuReply(menu, next.items);
    } else if (next.items.length > 0) {
      const usedRuleCart = ruleParsed.length > 0;
      let intro = "Got it!";
      let lead = "";
      if (!usedRuleCart && isClarifyingMessage(ai.message)) {
        lead = `${ai.message}\n\n`;
        intro = "Here's what I have:";
      } else if (!usedRuleCart) {
        intro = ai.message.split("\n")[0]?.trim() || "Got it!";
      }
      text = `${lead}${formatOrderBlock(next.items, intro)}\n\nReply confirm to place your order, or tell me what else to add.`;
    } else if (
      isOrderAttempt(lower) &&
      (isGenericFallback(text) || isGenericFallback(ai.message))
    ) {
      text = unrecognizedOrderReply(userText, menu) ?? processWithRules(userText, next, menu).text;
      return {
        type: "reply",
        session: next,
        text,
        suggestRecovery: true,
      };
    }
    return {
      type: "reply",
      session: next,
      text,
    };
  }

  const fallback = processWithRules(userText, next, menu);
  const fallbackRecovery = Boolean(unrecognizedOrderReply(userText, menu));
  return {
    type: "reply",
    session: fallback.session,
    text: fallback.text,
    suggestRecovery: fallbackRecovery,
  };
}
