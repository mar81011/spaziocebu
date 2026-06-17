import type { Order, PaymentSettings } from "../types";
import { formatCurrency } from "./format";

export function formatGcashNumber(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return number;
}

export function buildGcashPaymentMessage(
  order: Order,
  settings: PaymentSettings
): string {
  const reference = `SPAZIO-${order.id}`;
  return [
    `Pay ${formatCurrency(order.total)} via GCash to ${settings.gcashAccountName}.`,
    `Number: ${formatGcashNumber(settings.gcashNumber)}`,
    `Use reference: ${reference}`,
    "Send a screenshot in chat if you can — we'll start preparing once payment is received.",
  ].join("\n");
}

export function orderPaymentReference(orderId: string) {
  return `SPAZIO-${orderId}`;
}
