import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { OrderStatus } from "../../types";
import {
  addOrder,
  deleteOrder,
  getAllMenuItems,
  resetOrders,
  updateOrder,
} from "../../lib/storage";
import { formatCurrency, formatOrderLineItem, formatTime } from "../../lib/format";
import { orderStatusLabel } from "../../lib/orderStatus";
import { useMenu } from "../../hooks/useMenu";
import { useOrders } from "../../hooks/useOrders";
import { OrderDrawer } from "./OrderDrawer";

type Filter = "all" | OrderStatus;

export function OrdersPanel() {
  const { menu } = useMenu();
  const { orders } = useOrders();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customerName: "", itemName: "", qty: 1, notes: "" });

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const todayCount = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const counts = orders.reduce(
    (acc, o) => {
      acc[o.status]++;
      return acc;
    },
    { awaiting_payment: 0, preparing: 0, ready: 0, completed: 0 }
  );

  const awaitingPaymentCount = counts.awaiting_payment;

  const menuItems = getAllMenuItems(menu);

  function handleStatusChange(id: string, status: OrderStatus) {
    void updateOrder(id, { status }).then(() => {
      if (status === "completed") setSelectedId(null);
    });
  }

  function handleAddOrder(e: FormEvent) {
    e.preventDefault();
    const item = menuItems.find((i) => i.name === form.itemName);
    if (!item) return;
    void addOrder({
      customerName: form.customerName,
      items: [{ name: item.name, qty: form.qty, price: item.price }],
      notes: form.notes || "Manual entry",
    }).then(() => {
      setShowAdd(false);
      setForm({ customerName: "", itemName: menuItems[0]?.name ?? "", qty: 1, notes: "" });
    });
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium">Orders</h1>
          <p className="mt-1 text-sm text-warm-gray">Manage incoming chat orders. Updates save automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Replace all orders with sample data?")) void resetOrders();
            }}
            className="rounded-lg border border-espresso/12 bg-white px-4 py-2.5 text-sm"
          >
            Reset samples
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({ ...f, itemName: menuItems[0]?.name ?? "" }));
              setShowAdd(true);
            }}
            className="rounded-lg bg-terracotta px-4 py-2.5 text-sm text-white"
          >
            + Add order
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today", value: todayCount },
          { label: "Awaiting GCash", value: awaitingPaymentCount, className: "text-[#007cff]" },
          { label: "Paid — preparing", value: counts.preparing, className: "text-[#9a7220]" },
          { label: "Ready", value: counts.ready, className: "text-sage" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[14px] border border-white/90 bg-white p-5 shadow-[0_8px_30px_rgba(26,18,14,0.08)]">
            <p className="text-xs uppercase tracking-wider text-warm-gray">{stat.label}</p>
            <p className={`font-serif text-3xl font-semibold ${stat.className ?? ""}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "awaiting_payment", "preparing", "ready", "completed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              filter === f
                ? "border-espresso bg-espresso text-white"
                : "border-espresso/10 bg-white text-warm-gray"
            }`}
          >
            {f === "all" ? "All" : orderStatusLabel(f)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-white/90 bg-white shadow-[0_8px_30px_rgba(26,18,14,0.08)]">
        {filtered.length === 0 ? (
          <p className="p-12 text-center text-warm-gray">
            No orders yet. Place one on the <Link to="/">customer site</Link> or add manually.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs uppercase tracking-wider text-warm-gray">
              <tr>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`cursor-pointer border-t border-espresso/6 hover:bg-cream/50 ${
                    selectedId === order.id ? "bg-terracotta/8" : ""
                  }`}
                >
                  <td className="px-5 py-4 font-semibold">#{order.id}</td>
                  <td className="px-5 py-4">{order.customerName}</td>
                  <td className="max-w-[200px] truncate px-5 py-4 text-warm-gray">
                    {order.items.map((i) => formatOrderLineItem(i)).join(", ")}
                  </td>
                  <td className="px-5 py-4">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="rounded-md border border-espresso/15 px-2 py-1 text-sm"
                    >
                      {(["awaiting_payment", "preparing", "ready", "completed"] as const).map((s) => (
                        <option key={s} value={s}>
                          {orderStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4 text-warm-gray">{formatTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <OrderDrawer
        order={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={handleStatusChange}
        onDelete={(id) => {
          void deleteOrder(id);
          setSelectedId(null);
        }}
      />

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4">
          <form
            onSubmit={handleAddOrder}
            className="w-full max-w-md rounded-[14px] bg-white p-8 shadow-xl"
          >
            <h2 className="font-serif text-2xl">Add order</h2>
            <label className="mt-5 block text-xs uppercase tracking-wider text-warm-gray">
              Customer name
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 block text-xs uppercase tracking-wider text-warm-gray">
              Item
              <select
                required
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2 text-sm"
              >
                {menuItems.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name} — {formatCurrency(item.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs uppercase tracking-wider text-warm-gray">
              Quantity
              <input
                type="number"
                min={1}
                required
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value, 10) })}
                className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 block text-xs uppercase tracking-wider text-warm-gray">
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-terracotta px-4 py-2 text-sm text-white">
                Create order
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
