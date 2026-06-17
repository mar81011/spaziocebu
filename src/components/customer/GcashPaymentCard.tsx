import { useState } from "react";
import type { Order } from "../../types";
import { formatCurrency } from "../../lib/format";
import { formatGcashNumber, orderPaymentReference } from "../../lib/payment";
import { usePaymentSettings } from "../../hooks/usePaymentSettings";

interface GcashPaymentCardProps {
  order: Order;
}

export function GcashPaymentCard({ order }: GcashPaymentCardProps) {
  const { settings } = usePaymentSettings();
  const reference = orderPaymentReference(order.id);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mb-2 w-full max-w-full rounded-2xl border border-[#007cff]/20 bg-[#f0f7ff] p-4 text-sm text-espresso">
      <p className="text-xs font-medium uppercase tracking-wider text-[#007cff]">Pay via GCash</p>
      <p className="mt-2 text-2xl font-semibold">{formatCurrency(order.total)}</p>
      <p className="mt-1 text-xs text-warm-gray">Pickup · Order #{order.id}</p>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
          <div>
            <p className="text-xs text-warm-gray">Send to</p>
            <p className="font-medium">{settings.gcashAccountName}</p>
            <p className="font-mono text-sm">{formatGcashNumber(settings.gcashNumber)}</p>
          </div>
          <button
            type="button"
            onClick={() => copy("number", settings.gcashNumber.replace(/\D/g, ""))}
            className="shrink-0 rounded-md border border-espresso/10 px-2 py-1 text-xs"
          >
            {copied === "number" ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
          <div>
            <p className="text-xs text-warm-gray">Reference / message</p>
            <p className="font-mono font-medium">{reference}</p>
          </div>
          <button
            type="button"
            onClick={() => copy("ref", reference)}
            className="shrink-0 rounded-md border border-espresso/10 px-2 py-1 text-xs"
          >
            {copied === "ref" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <ol className="mt-4 space-y-2 text-xs leading-relaxed text-warm-gray">
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#007cff]/10 text-[10px] font-semibold text-[#007cff]">
            1
          </span>
          <span>Open GCash and tap <strong className="font-medium text-espresso">Send</strong></span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#007cff]/10 text-[10px] font-semibold text-[#007cff]">
            2
          </span>
          <span>
            Enter the number above — <strong className="font-medium text-espresso">{settings.gcashAccountName}</strong>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#007cff]/10 text-[10px] font-semibold text-[#007cff]">
            3
          </span>
          <span>
            Amount: <strong className="font-medium text-espresso">{formatCurrency(order.total)}</strong>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#007cff]/10 text-[10px] font-semibold text-[#007cff]">
            4
          </span>
          <span>
            Reference: <strong className="font-mono font-medium text-espresso">{reference}</strong>
          </span>
        </li>
      </ol>

      <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs text-warm-gray">
        We'll start preparing your order once payment is confirmed.
      </p>
    </div>
  );
}
