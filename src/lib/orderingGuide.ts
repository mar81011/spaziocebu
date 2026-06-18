import type { QuickReply } from "./menuIcons";

export const ORDERING_TIPS = [
  "Name the drink and quantity — e.g. “2 flat whites”.",
  "For add-ons, say which drink — e.g. “extra shot on each”.",
  "You can change or remove items anytime before you confirm.",
];

export const PLACEHOLDER_EXAMPLES = [
  "2 flat whites",
  "Spazio Signature and a croissant",
  "Flat white with extra shot",
  "Change it to cappuccino",
  "What's on the menu?",
];

export const EXAMPLE_QUICK_REPLIES: QuickReply[] = [
  { label: "View menu", message: "What's on the menu?", icon: "📋" },
  { label: "2 flat whites", message: "2 flat whites", icon: "☕", secondaryIcon: "☕" },
  {
    label: "Shot on each",
    message: "Add extra shot on each",
    icon: "☕",
    secondaryIcon: "⚡",
  },
  {
    label: "Signature + 1 vanilla",
    message: "Spazio Signature with vanilla syrup",
    icon: "✨",
    secondaryIcon: "🍯",
  },
];

/** Shown after the bot fails to understand — keeps customers in the ordering flow */
export function buildRecoveryReplies(hasCartItems: boolean): QuickReply[] {
  const replies: QuickReply[] = [
    { label: "Show menu", message: "What's on the menu?", icon: "📋" },
    { label: "My order", message: "Show my order", icon: "🛒" },
  ];
  if (hasCartItems) {
    replies.push(
      { label: "Confirm", message: "confirm", icon: "✓" },
      { label: "Start over", message: "clear order", icon: "↩️" }
    );
  }
  return replies;
}
