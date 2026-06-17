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

function shortLabel(name: string, max = 14): string {
  if (name.length <= max) return name;
  const parts = name.split(/\s+/);
  if (parts.length > 1 && parts[parts.length - 1]!.length <= max) {
    return parts[parts.length - 1]!;
  }
  return `${name.slice(0, max - 1)}…`;
}

function isAddonCategory(category: string) {
  return /add|pastry|food|bakery|extra/i.test(category);
}

function isOrderableAddon(item: { name: string; price: number; category: string }) {
  if (!isAddonCategory(item.category)) return false;
  if (/shot|swap|syrup|milk|extra/i.test(item.name) && item.price < 80) return false;
  return true;
}

export function buildQuickReplies(menu: Menu): QuickReply[] {
  const items = getAllMenuItems(menu);
  if (!items.length) {
    return [{ label: "View menu", message: "What's on the menu?", icon: "📋" }];
  }

  const coffees = items.filter((i) => !isAddonCategory(i.category));
  const addons = items.filter(isOrderableAddon);

  const featuredCoffee =
    coffees.find((i) => /flat white/i.test(i.name)) ??
    coffees.find((i) => /signature/i.test(i.name)) ??
    coffees[0];

  const featuredAddon =
    addons.find((i) => /croissant/i.test(i.name)) ??
    addons.find((i) => i.price >= 100) ??
    addons[0];

  const replies: QuickReply[] = [];

  if (featuredCoffee) {
    replies.push({
      label: shortLabel(featuredCoffee.name),
      message: `I'd like a ${featuredCoffee.name} please`,
      icon: iconForMenuItem(featuredCoffee.name, featuredCoffee.category),
    });
  }

  if (featuredCoffee && featuredAddon) {
    const coffeeShort = shortLabel(featuredCoffee.name, 10);
    const addonShort = shortLabel(featuredAddon.name, 10);
    replies.push({
      label: `${coffeeShort} + ${addonShort}`,
      message: `${featuredCoffee.name} and ${featuredAddon.name} please`,
      icon: iconForMenuItem(featuredCoffee.name, featuredCoffee.category),
      secondaryIcon: iconForMenuItem(featuredAddon.name, featuredAddon.category),
    });
  } else if (featuredAddon) {
    replies.push({
      label: shortLabel(featuredAddon.name),
      message: `I'd like ${featuredAddon.name} please`,
      icon: iconForMenuItem(featuredAddon.name, featuredAddon.category),
    });
  }

  replies.push({ label: "View menu", message: "What's on the menu?", icon: "📋" });

  return replies.slice(0, 4);
}
