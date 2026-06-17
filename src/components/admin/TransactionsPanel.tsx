import { useMemo, useState } from "react";
import { formatCurrency, formatOrderLineItem, formatTime } from "../../lib/format";
import { getCompletedTransactions, sumTransactionTotal, type TransactionPeriod } from "../../lib/transactions";
import { useOrders } from "../../hooks/useOrders";

export function TransactionsPanel() {
  const { orders } = useOrders();
  const [period, setPeriod] = useState<TransactionPeriod>("today");

  const transactions = useMemo(
    () => getCompletedTransactions(orders, period),
    [orders, period]
  );
  const total = useMemo(() => sumTransactionTotal(transactions), [transactions]);

  const periods: { id: TransactionPeriod; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week", label: "This week" },
    { id: "all", label: "All time" },
  ];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium">Transactions</h1>
          <p className="mt-1 text-sm text-warm-gray">
            Completed orders — picked up and closed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                period === p.id
                  ? "border-espresso bg-espresso text-white"
                  : "border-espresso/10 bg-white text-warm-gray"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] border border-white/90 bg-white p-5 shadow-[0_8px_30px_rgba(26,18,14,0.08)]">
          <p className="text-xs uppercase tracking-wider text-warm-gray">Completed</p>
          <p className="font-serif text-3xl font-semibold text-espresso">{transactions.length}</p>
        </div>
        <div className="rounded-[14px] border border-white/90 bg-white p-5 shadow-[0_8px_30px_rgba(26,18,14,0.08)]">
          <p className="text-xs uppercase tracking-wider text-warm-gray">Total</p>
          <p className="font-serif text-3xl font-semibold text-sage">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-white/90 bg-white shadow-[0_8px_30px_rgba(26,18,14,0.08)]">
        {transactions.length === 0 ? (
          <p className="p-12 text-center text-warm-gray">
            No completed orders in this period. Mark orders as picked up to see them here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-warm-gray">
              <tr>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Completed</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((order) => (
                <tr key={order.id} className="border-t border-espresso/6">
                  <td className="px-5 py-4 font-semibold">#{order.id}</td>
                  <td className="px-5 py-4">{order.customerName}</td>
                  <td className="max-w-[220px] truncate px-5 py-4 text-warm-gray">
                    {order.items.map((i) => formatOrderLineItem(i)).join(", ")}
                  </td>
                  <td className="px-5 py-4 text-warm-gray">{formatTime(order.createdAt)}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-espresso/10 bg-cream/50">
              <tr>
                <td colSpan={4} className="px-5 py-4 text-right font-medium text-warm-gray">
                  Total
                </td>
                <td className="px-5 py-4 text-right font-serif text-lg font-semibold text-espresso">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
