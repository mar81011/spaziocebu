import type { Order } from "../types";

export type TransactionPeriod = "today" | "week" | "all";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function periodStart(period: TransactionPeriod): Date | null {
  if (period === "today") return startOfToday();
  if (period === "week") return startOfWeek();
  return null;
}

export function getCompletedTransactions(orders: Order[], period: TransactionPeriod): Order[] {
  const since = periodStart(period);
  return orders
    .filter((order) => {
      if (order.status !== "completed") return false;
      if (!since) return true;
      return new Date(order.createdAt) >= since;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function sumTransactionTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + order.total, 0);
}
