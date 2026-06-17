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

export function formatTimeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatTime(iso);
}
