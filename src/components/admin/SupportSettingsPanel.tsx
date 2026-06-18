import { useEffect, useState } from "react";
import { useSupportSettings } from "../../hooks/useSupportSettings";
import {
  formatSupportPhone,
  hasSupportContact,
  hasSupportPageLink,
  normalizeSupportPageUrl,
  supportPageButtonLabel,
  supportPhoneButtonLabel,
  supportPhoneTelLink,
} from "../../lib/support";

type SupportSettingsPanelProps = {
  variant?: "sidebar" | "page";
};

export function SupportSettingsPanel({ variant = "sidebar" }: SupportSettingsPanelProps) {
  const { settings, update } = useSupportSettings();
  const [saveError, setSaveError] = useState<string | null>(null);
  const isPage = variant === "page";

  const labelClass = isPage ? "text-warm-gray" : "text-white/70";
  const inputClass = isPage
    ? "mt-1 w-full rounded-lg border border-espresso/12 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-terracotta"
    : "mt-1 w-full rounded-md border border-white/15 bg-white/10 px-2.5 py-2 text-sm text-white placeholder:text-white/40";
  const hintClass = isPage ? "text-warm-gray/80" : "text-white/45";
  const errorClass = isPage ? "text-red-600" : "text-red-200";

  const pagePreview = supportPageButtonLabel(settings);
  const phonePreview = supportPhoneButtonLabel(settings);
  const pageLinkReady = hasSupportPageLink(settings);

  useEffect(() => {
    function onSaveError(e: Event) {
      setSaveError((e as CustomEvent<string>).detail ?? "Could not save to database.");
    }
    window.addEventListener("spazio-support-save-error", onSaveError);
    return () => window.removeEventListener("spazio-support-save-error", onSaveError);
  }, []);

  function savePageUrl(raw: string) {
    setSaveError(null);
    update({ ...settings, supportPageUrl: normalizeSupportPageUrl(raw) });
  }

  return (
    <div className={isPage ? "space-y-4" : "rounded-lg bg-white/10 p-4"}>
      {!isPage && (
        <>
          <p className="text-sm font-medium">Customer support</p>
          <p className="mt-0.5 text-xs text-white/55">Chat Help button — updates live for customers</p>
        </>
      )}

      <fieldset className={`space-y-3 rounded-lg border p-4 ${isPage ? "border-espresso/10 bg-cream/30" : "border-white/15 bg-white/5"}`}>
        <legend className={`px-1 text-xs font-medium uppercase tracking-wider ${labelClass}`}>
          Visit this page
        </legend>

        <label className={`block text-xs ${labelClass}`}>
          Page URL <span className="text-terracotta">*</span>
          <input
            value={settings.supportPageUrl}
            onChange={(e) => {
              setSaveError(null);
              update({ ...settings, supportPageUrl: e.target.value });
            }}
            onBlur={(e) => savePageUrl(e.target.value)}
            className={inputClass}
            placeholder="https://m.me/yourpage or facebook.com/yourpage"
          />
        </label>

        <label className={`block text-xs ${labelClass}`}>
          Button label
          <input
            value={settings.supportPageLabel}
            onChange={(e) => update({ ...settings, supportPageLabel: e.target.value })}
            className={inputClass}
            placeholder="Visit this page"
          />
        </label>

        {!pageLinkReady && (
          <p className={`text-[11px] ${errorClass}`}>
            Add a page URL above — the &quot;Visit this page&quot; button only appears in chat when a
            URL is set.
          </p>
        )}

        <p className={`text-[11px] ${hintClass}`}>
          Messenger, Facebook, Instagram, or any link customers should open when chat fails.
        </p>
      </fieldset>

      <fieldset className={`space-y-3 rounded-lg border p-4 ${isPage ? "border-espresso/10 bg-cream/30" : "border-white/15 bg-white/5"}`}>
        <legend className={`px-1 text-xs font-medium uppercase tracking-wider ${labelClass}`}>
          Call or text this number
        </legend>

        <label className={`block text-xs ${labelClass}`}>
          Phone number
          <input
            value={settings.supportPhone}
            onChange={(e) => update({ ...settings, supportPhone: e.target.value })}
            className={inputClass}
            placeholder="09171234567"
          />
        </label>

        <label className={`block text-xs ${labelClass}`}>
          Button label <span className="opacity-70">(optional)</span>
          <input
            value={settings.supportPhoneLabel}
            onChange={(e) => update({ ...settings, supportPhoneLabel: e.target.value })}
            className={inputClass}
            placeholder={`Call or text ${formatSupportPhone(settings.supportPhone) || "0917 123 4567"}`}
          />
        </label>

        <p className={`text-[11px] ${hintClass}`}>
          Leave button label blank to auto-use &quot;Call or text {"{number}"}&quot;.
        </p>
      </fieldset>

      {saveError && (
        <p className={`rounded-lg bg-red-50 px-3 py-2 text-[11px] ${errorClass}`}>
          {saveError}
          <br />
          <br />
          <strong>Fix:</strong> Open{" "}
          <a
            href="https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-terracotta underline-offset-2 hover:underline"
          >
            Supabase SQL Editor
          </a>
          , paste the contents of{" "}
          <code className="rounded bg-cream px-1">supabase/migration_add_support.sql</code>, click{" "}
          <strong>Run</strong>, then refresh this page.
          <br />
          <br />
          Settings are saved in this browser until the migration is applied.
        </p>
      )}

      <p className={`text-[11px] leading-relaxed ${hintClass}`}>
        Changes save automatically. Customers see these in chat → <strong className="font-medium">Help</strong>.
      </p>

      {hasSupportContact(settings) && (
        <div
          className={`rounded-lg border p-4 ${isPage ? "border-espresso/10 bg-white" : "border-white/15 bg-white/5"}`}
        >
          <p className={`text-[10px] font-medium uppercase tracking-wider ${hintClass}`}>
            Customer preview
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {pageLinkReady && (
              <div className="rounded-xl border border-[#0084ff]/20 bg-[#f0f7ff] px-3 py-2.5 text-xs font-medium text-espresso">
                🔗 {pagePreview}
              </div>
            )}
            {settings.supportPhone.trim() && (
              <div className="rounded-xl border border-espresso/10 bg-cream px-3 py-2.5 text-xs font-medium text-espresso">
                📞 {phonePreview}
              </div>
            )}
          </div>
          {settings.supportPhone.trim() && (
            <p className={`mt-2 text-[10px] ${hintClass}`}>
              Dial link: {supportPhoneTelLink(settings.supportPhone)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
