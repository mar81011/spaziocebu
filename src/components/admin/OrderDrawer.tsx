import type { Order, OrderStatus } from "../../types";
import { formatCurrency, formatTime } from "../../lib/format";
import { orderStatusBadgeClass, orderStatusDescription, orderStatusLabel } from "../../lib/orderStatus";

interface OrderDrawerProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
}

export function OrderDrawer({ order, onClose, onStatusChange, onDelete }: OrderDrawerProps) {
  if (!order) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-espresso/35"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-2xl text-warm-gray"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="font-serif text-3xl font-medium">Order #{order.id}</h2>
        <p className="mt-1 text-sm text-warm-gray">
          {order.customerName} · {formatTime(order.createdAt)}
        </p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${orderStatusBadgeClass(order.status)}`}
        >
          {orderStatusLabel(order.status)}
        </span>
        <p className="mt-2 text-sm text-warm-gray">{orderStatusDescription(order.status)}</p>

        {order.status === "awaiting_payment" && (
          <p className="mt-3 rounded-lg bg-[#f0f7ff] px-3 py-2 text-xs leading-relaxed text-[#007cff]">
            Customer should GCash you now. When you see the payment, tap{" "}
            <strong>Payment received</strong> below to move to preparing.
          </p>
        )}

        <div className="mt-8">
          <h3 className="text-xs font-medium uppercase tracking-wider text-warm-gray">Items</h3>
          <ul className="mt-3 divide-y divide-espresso/6">
            {order.items.map((item) => (
              <li key={item.name} className="flex justify-between py-2 text-sm">
                <span>
                  {item.qty}× {item.name}
                </span>
                <span>{formatCurrency(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-espresso/10 pt-3 font-semibold">
            <span>Total (GCash)</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-warm-gray">Notes</h3>
            <p className="mt-2 text-sm text-warm-gray">{order.notes}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {order.status === "awaiting_payment" && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, "preparing")}
              className="rounded-lg bg-terracotta px-4 py-2 text-sm text-white"
            >
              Payment received — start preparing
            </button>
          )}
          {order.status === "preparing" && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, "ready")}
              className="rounded-lg bg-terracotta px-4 py-2 text-sm text-white"
            >
              Mark ready for pickup
            </button>
          )}
          {order.status === "ready" && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, "completed")}
              className="rounded-lg bg-terracotta px-4 py-2 text-sm text-white"
            >
              Picked up — complete
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this order?")) onDelete(order.id);
            }}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
          >
            Delete
          </button>
        </div>
      </aside>
    </>
  );
}
