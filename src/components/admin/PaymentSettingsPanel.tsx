import { usePaymentSettings } from "../../hooks/usePaymentSettings";

export function PaymentSettingsPanel() {
  const { settings, update } = usePaymentSettings();

  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-sm font-medium">GCash payments</p>
      <p className="mt-0.5 text-xs text-white/55">Shown to customers after they order</p>

      <label className="mt-3 block text-xs text-white/70">
        Account name
        <input
          value={settings.gcashAccountName}
          onChange={(e) => update({ ...settings, gcashAccountName: e.target.value })}
          className="mt-1 w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder:text-white/40"
          placeholder="Spazio Coffee"
        />
      </label>

      <label className="mt-2 block text-xs text-white/70">
        GCash number
        <input
          value={settings.gcashNumber}
          onChange={(e) => update({ ...settings, gcashNumber: e.target.value })}
          className="mt-1 w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder:text-white/40"
          placeholder="09171234567"
        />
      </label>
    </div>
  );
}
