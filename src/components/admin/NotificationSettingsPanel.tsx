import { useState } from "react";
import { useNotificationSettings } from "../../hooks/useNotificationSettings";
import { requestBrowserNotificationPermission, sendTestOwnerAlert } from "../../lib/notify";

type NotificationSettingsPanelProps = {
  variant?: "sidebar" | "page";
};

export function NotificationSettingsPanel({ variant = "sidebar" }: NotificationSettingsPanelProps) {
  const { settings, update } = useNotificationSettings();
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const isPage = variant === "page";

  const muted = isPage ? "text-warm-gray" : "text-white/55";
  const label = isPage ? "text-warm-gray" : "text-white/70";
  const input =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-terracotta " +
    (isPage
      ? "border-espresso/12 bg-white text-espresso"
      : "border-white/15 bg-white/10 text-white placeholder:text-white/40");

  async function sendTest() {
    setTestStatus(null);
    try {
      const result = await sendTestOwnerAlert();
      setTestStatus(result);
    } catch {
      setTestStatus("Could not send alert. Check your topic and try again.");
    }
  }

  async function enableBrowserAlerts() {
    const permission = await requestBrowserNotificationPermission();
    update({ ...settings, browserAlertsEnabled: permission === "granted" });
  }

  const ntfyReady = settings.ntfyTopic.trim().length > 0;

  return (
    <div className={isPage ? "space-y-3" : "rounded-lg bg-white/10 p-4"}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-medium ${isPage ? "text-espresso" : ""}`}>
          {isPage ? "Enable alerts" : "Order alerts"}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={settings.alertsEnabled}
          onClick={() => update({ ...settings, alertsEnabled: !settings.alertsEnabled })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            settings.alertsEnabled ? "bg-sage" : isPage ? "bg-espresso/20" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
              settings.alertsEnabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {!isPage && (
        <p className={`mt-0.5 text-xs ${muted}`}>
          Free push to your phone when a customer confirms an order
        </p>
      )}

      {settings.alertsEnabled && (
        <div className="mt-3 space-y-3">
          <label className={`block text-xs ${label}`}>
            ntfy topic
            <input
              value={settings.ntfyTopic}
              onChange={(e) => update({ ...settings, ntfyTopic: e.target.value })}
              className={input}
              placeholder="Spazio"
            />
          </label>
          <p className={`text-[0.65rem] leading-relaxed ${muted}`}>
            Subscribe to{" "}
            <a
              href={`https://ntfy.sh/${encodeURIComponent(settings.ntfyTopic || "Spazio")}`}
              target="_blank"
              rel="noreferrer"
              className={isPage ? "text-terracotta underline" : "text-white/70 underline"}
            >
              ntfy.sh/{settings.ntfyTopic || "Spazio"}
            </a>{" "}
            in the{" "}
            <a
              href="https://ntfy.sh/app"
              target="_blank"
              rel="noreferrer"
              className={isPage ? "text-terracotta underline" : "text-white/70 underline"}
            >
              ntfy app
            </a>
            .
          </p>

          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={!ntfyReady}
            className={
              "w-full rounded-lg border px-2.5 py-2 text-xs disabled:opacity-40 " +
              (isPage
                ? "border-espresso/12 text-espresso"
                : "border-white/15 text-white/80")
            }
          >
            Send test alert
          </button>
          {testStatus && <p className={`text-xs ${muted}`}>{testStatus}</p>}

          <details className={`text-xs ${muted}`}>
            <summary className={`cursor-pointer ${isPage ? "text-espresso" : "text-white/70"}`}>Paid SMS (optional)</summary>
            <div className="mt-2 space-y-2">
              <label className={`block ${label}`}>
                Your mobile number
                <input
                  value={settings.ownerPhone}
                  onChange={(e) => update({ ...settings, ownerPhone: e.target.value })}
                  className={input}
                  placeholder="09171234567"
                />
              </label>
              <label className={`block ${label}`}>
                Semaphore API key
                <input
                  value={settings.semaphoreApiKey}
                  onChange={(e) => update({ ...settings, semaphoreApiKey: e.target.value })}
                  className={input}
                  placeholder="From semaphore.co"
                />
              </label>
            </div>
          </details>

          <details className={`text-xs ${muted}`}>
            <summary className={`cursor-pointer ${isPage ? "text-espresso" : "text-white/70"}`}>More options</summary>
            <div className="mt-2 space-y-2">
              <label className={`block ${label}`}>
                Webhook URL
                <input
                  value={settings.webhookUrl}
                  onChange={(e) => update({ ...settings, webhookUrl: e.target.value })}
                  className={input}
                  placeholder="https://hooks.zapier.com/..."
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.emailAlertsEnabled}
                  onChange={(e) => update({ ...settings, emailAlertsEnabled: e.target.checked })}
                  className="rounded"
                />
                Email alerts
              </label>
              {settings.emailAlertsEnabled && (
                <input
                  type="email"
                  value={settings.ownerEmail}
                  onChange={(e) => update({ ...settings, ownerEmail: e.target.value })}
                  className="w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white"
                  placeholder="you@example.com"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.browserAlertsEnabled}
                  onChange={(e) => {
                    if (e.target.checked) void enableBrowserAlerts();
                    else update({ ...settings, browserAlertsEnabled: false });
                  }}
                  className="rounded"
                />
                Browser popup when admin is open
              </label>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
