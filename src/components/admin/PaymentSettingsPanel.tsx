import { usePaymentSettings } from "../../hooks/usePaymentSettings";

type PaymentSettingsPanelProps = {
  variant?: "sidebar" | "page";
};

export function PaymentSettingsPanel({ variant = "sidebar" }: PaymentSettingsPanelProps) {
  const { settings, update } = usePaymentSettings();
  const isPage = variant === "page";

  const labelClass = isPage ? "text-warm-gray" : "text-white/70";
  const inputClass = isPage
    ? "mt-1 w-full rounded-lg border border-espresso/12 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-terracotta"
    : "mt-1 w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder:text-white/40";

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
    </div>
  );
}
