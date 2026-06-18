import { useRef, useState } from "react";
import { usePaymentSettings } from "../../hooks/usePaymentSettings";
import { hasGcashQr, SAMPLE_GCASH_QR_URL } from "../../lib/payment";

type PaymentSettingsPanelProps = {
  variant?: "sidebar" | "page";
};

const MAX_QR_BYTES = 400_000;

export function PaymentSettingsPanel({ variant = "sidebar" }: PaymentSettingsPanelProps) {
  const { settings, update } = usePaymentSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const isPage = variant === "page";

  const labelClass = isPage ? "text-warm-gray" : "text-white/70";
  const inputClass = isPage
    ? "mt-1 w-full rounded-lg border border-espresso/12 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-terracotta"
    : "mt-1 w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder:text-white/40";
  const hintClass = isPage ? "text-warm-gray/80" : "text-white/45";
  const errorClass = isPage ? "text-red-600" : "text-red-200";

  function handleQrFile(file: File | undefined) {
    if (!file) return;
    setQrError(null);

    if (!file.type.startsWith("image/")) {
      setQrError("Please choose an image file (PNG or JPG).");
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      setQrError("Image is too large — use a file under 400 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setQrError("Could not read that image.");
        return;
      }
      update({ ...settings, gcashQrUrl: result });
    };
    reader.onerror = () => setQrError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  return (
    <div className={isPage ? "space-y-3" : "rounded-lg bg-white/10 p-4"}>
      {!isPage && (
        <>
          <p className="text-sm font-medium">GCash payments</p>
          <p className="mt-0.5 text-xs text-white/55">Shown to customers after they order</p>
        </>
      )}

      <label className={`block text-xs ${labelClass}`}>
        Account name
        <input
          value={settings.gcashAccountName}
          onChange={(e) => update({ ...settings, gcashAccountName: e.target.value })}
          className={inputClass}
          placeholder="Spazio Coffee"
        />
      </label>

      <label className={`block text-xs ${labelClass}`}>
        GCash number
        <input
          value={settings.gcashNumber}
          onChange={(e) => update({ ...settings, gcashNumber: e.target.value })}
          className={inputClass}
          placeholder="09171234567"
        />
      </label>

      <div className={`block text-xs ${labelClass}`}>
        <span>GCash QR code</span>
        <p className={`mt-0.5 text-[11px] leading-relaxed ${hintClass}`}>
          Upload your Receive via QR image from the GCash app, or paste an image URL. Customers can
          scan it or send manually.
        </p>

        {hasGcashQr(settings) && (
          <div
            className={`mt-2 flex items-center gap-3 rounded-lg border p-3 ${
              isPage ? "border-espresso/10 bg-cream/40" : "border-white/15 bg-white/5"
            }`}
          >
            <img
              src={settings.gcashQrUrl}
              alt="GCash QR preview"
              className="h-20 w-20 shrink-0 rounded-md object-contain bg-white"
            />
            <div className="min-w-0 text-left">
              {settings.gcashQrUrl === SAMPLE_GCASH_QR_URL ? (
                <p className={`text-[11px] ${hintClass}`}>
                  Sample placeholder — upload your real GCash QR when ready.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQrError(null);
                    update({ ...settings, gcashQrUrl: "" });
                  }}
                  className={`text-xs underline-offset-2 hover:underline ${
                    isPage ? "text-terracotta" : "text-white/80"
                  }`}
                >
                  Remove QR
                </button>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleQrFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={
              isPage
                ? "rounded-lg border border-espresso/12 bg-white px-3 py-2 text-xs font-medium text-espresso hover:border-terracotta"
                : "rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15"
            }
          >
            Upload QR image
          </button>
        </div>

        <label className={`mt-2 block text-[11px] ${hintClass}`}>
          Or image URL
          <input
            value={settings.gcashQrUrl?.startsWith("data:") ? "" : (settings.gcashQrUrl ?? "")}
            onChange={(e) => {
              setQrError(null);
              update({ ...settings, gcashQrUrl: e.target.value.trim() });
            }}
            className={inputClass}
            placeholder="https://..."
          />
        </label>

        {qrError && <p className={`mt-1 text-[11px] ${errorClass}`}>{qrError}</p>}
      </div>
    </div>
  );
}
