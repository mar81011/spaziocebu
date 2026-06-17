import type { OrderStatus } from "../types";

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "Awaiting GCash";
    case "preparing":
      return "Paid — preparing";
    case "ready":
      return "Ready for pickup";
    case "completed":
      return "Completed";
  }
}

export function orderStatusDescription(status: OrderStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "Customer has not paid yet. Waiting for GCash.";
    case "preparing":
      return "Payment confirmed. Order is being prepared.";
    case "ready":
      return "Ready — customer can pick up.";
    case "completed":
      return "Order picked up and closed.";
  }
}

export function orderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "bg-[#e8f1ff] text-[#007cff]";
    case "preparing":
      return "bg-[#fef6e4] text-[#9a7220]";
    case "ready":
      return "bg-[#edf3ea] text-sage";
    case "completed":
      return "bg-gray-100 text-warm-gray";
  }
}
