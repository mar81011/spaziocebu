import type { Order, PaymentSettings } from "../types";
import { formatCurrency } from "./format";

export function formatGcashNumber(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return number;
}

/** Placeholder QR for UI preview — replace via Admin → Settings when going live. */
export const SAMPLE_GCASH_QR_URL = "/sample-gcash-qr.svg";

export function hasGcashQr(settings: PaymentSettings) {
  return Boolean(settings.gcashQrUrl?.trim());
}

export function withDefaultGcashQr(settings: PaymentSettings): PaymentSettings {
  if (hasGcashQr(settings)) return settings;
  return { ...settings, gcashQrUrl: SAMPLE_GCASH_QR_URL };
}

export function buildGcashPaymentMessage(
  order: Order,
  settings: PaymentSettings
): string {
  const reference = `SPAZIO-${order.id}`;
  const lines = [
    `Pay ${formatCurrency(order.total)} via GCash to ${settings.gcashAccountName}.`,
  ];
  if (hasGcashQr(settings)) {
    lines.push("Scan the QR code in the payment card, or send manually to the number below.");
  }
  lines.push(
    `Number: ${formatGcashNumber(settings.gcashNumber)}`,
    `Use reference: ${reference}`,
    "Send a screenshot in chat if you can — we'll start preparing once payment is received."
  );
  return lines.join("\n");
}

export function orderPaymentReference(orderId: string) {
  return `SPAZIO-${orderId}`;
}
