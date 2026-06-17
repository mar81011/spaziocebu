export function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString()}`;
}

export function formatOrderLineItem(item: { name: string; qty: number; forDrink?: string }) {
  const label = item.forDrink ? `${item.name} (for ${item.forDrink})` : item.name;
  return `${item.qty}× ${label}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
