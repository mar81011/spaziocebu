import type { Menu } from "../types";
import { getAllMenuItems } from "./storage";

export type QuickReply = {
  label: string;
  message: string;
  icon: string;
  secondaryIcon?: string;
};

/** Picks a small emoji based on menu item name and category. */
export function iconForMenuItem(name: string, categoryTitle = ""): string {
  const n = name.toLowerCase();
  const cat = categoryTitle.toLowerCase();

  if (n.includes("croissant") || n.includes("muffin") || n.includes("scone")) return "🥐";
  if (n.includes("vanilla") || n.includes("syrup") || n.includes("caramel")) return "🍯";
  if (n.includes("oat milk") || n.includes("oat")) return "🌾";
  if (n.includes("shot") || n.includes("extra")) return "⚡";
  if (n.includes("matcha")) return "🍵";
  if (n.includes("pour over")) return "🫖";
  if (n.includes("cortado")) return "🥛";
  if (n.includes("cappuccino")) return "☕";
  if (n.includes("flat white")) return "☕";
  if (n.includes("signature")) return "✨";
  if (n.includes("latte")) return "🍵";
  if (n.includes("cold") || n.includes("iced")) return "🧊";
  if (n.includes("tea") || n.includes("chai")) return "🍵";
  if (n.includes("chocolate") || n.includes("mocha")) return "🍫";
  if (n.includes("espresso") || n.includes("coffee")) return "☕";

  if (cat.includes("add")) return "➕";
  if (cat.includes("coffee") || cat.includes("drink")) return "☕";

  return "☕";
}

/** Icon for a menu category heading (Coffee, Add-Ons, etc.). */
export function iconForCategory(title: string): string {
  const t = title.toLowerCase();
  if (/add|extra|modifier|side/i.test(t)) return "➕";
  if (/pastry|bakery|food|bite/i.test(t)) return "🥐";
  if (/tea/i.test(t)) return "🍵";
  if (/coffee|drink|beverage/i.test(t)) return "☕";
  return "☕";
}

export function buildQuickReplies(menu: Menu): QuickReply[] {
  if (!getAllMenuItems(menu).length) {
    return [{ label: "View menu", message: "What's on the menu?", icon: "📋" }];
  }

  return [{ label: "View menu", message: "What's on the menu?", icon: "📋" }];
}
