import type { Menu } from "../types";

/** Standard test menu mirroring default Spazio menu. */
export const testMenu: Menu = {
  categories: [
    {
      id: "cat-coffee",
      title: "Coffee",
      items: [
        { id: "i-1", name: "Spazio Signature", description: "Espresso, oat milk", price: 185, cost: 70 },
        { id: "i-2", name: "Flat White", description: "Microfoam", price: 165, cost: 55 },
        { id: "i-3", name: "Pour Over", description: "Single-origin", price: 175, cost: 60 },
        { id: "i-4", name: "Cortado", description: "Equal parts", price: 155, cost: 50 },
        { id: "i-5", name: "Cappuccino", description: "Thick foam", price: 160, cost: 52 },
        { id: "i-6", name: "Matcha Latte", description: "Ceremonial grade", price: 195, cost: 80 },
      ],
    },
    {
      id: "cat-addons",
      title: "Add-Ons",
      items: [
        { id: "i-7", name: "Almond Croissant", description: "Twice-baked", price: 145, cost: 55 },
        { id: "i-8", name: "Extra shot", description: "Additional espresso", price: 45, cost: 15 },
        { id: "i-9", name: "Oat milk swap", description: "Substitute oat", price: 35, cost: 12 },
        { id: "i-10", name: "Vanilla syrup", description: "House-made", price: 25, cost: 8 },
      ],
    },
  ],
};

export function drinkQty(cart: { name: string; qty: number; forDrink?: string }[], name: string) {
  return cart
    .filter((i) => !i.forDrink && i.name === name)
    .reduce((sum, i) => sum + i.qty, 0);
}
