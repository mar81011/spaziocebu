import { useSupportSettings } from "../../hooks/useSupportSettings";
import { buildRecoveryReplies } from "../../lib/orderingGuide";
import {
  hasSupportContact,
  hasSupportPageLink,
  normalizeSupportPageUrl,
  supportPageButtonLabel,
  supportPhoneButtonLabel,
  supportPhoneTelLink,
} from "../../lib/support";

interface ChatHelpPanelProps {
  onClose: () => void;
}

export function ChatHelpPanel({ onClose }: ChatHelpPanelProps) {
  const { settings } = useSupportSettings();
  const pageUrl = normalizeSupportPageUrl(settings.supportPageUrl);
  const showPageLink = hasSupportPageLink(settings);
  const phone = settings.supportPhone.trim();
  const tel = supportPhoneTelLink(phone);

  return (
    <div className="border-b border-espresso/8 bg-[#faf7f2] px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-espresso">Need help ordering?</p>
          <p className="mt-0.5 text-xs text-warm-gray">
            Chat stuck? Try the quick options below, or reach us directly.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-lg leading-none text-warm-gray hover:text-espresso"
          aria-label="Close help"
        >
          ×
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {showPageLink && pageUrl && (
          <a
            href={pageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-[#0084ff]/25 bg-white px-3 py-2.5 text-xs font-medium text-espresso no-underline transition hover:border-[#0084ff]/50"
          >
            <span className="text-base" aria-hidden>
              🔗
            </span>
            {supportPageButtonLabel(settings)}
          </a>
        )}
        {phone && tel && (
          <a
            href={`tel:${tel}`}
            className="flex items-center gap-2 rounded-xl border border-espresso/10 bg-white px-3 py-2.5 text-xs font-medium text-espresso no-underline transition hover:border-terracotta/30"
          >
            <span className="text-base" aria-hidden>
              📞
            </span>
            {supportPhoneButtonLabel(settings)}
          </a>
        )}
        {!hasSupportContact(settings) && (
          <p className="rounded-xl border border-espresso/8 bg-white/80 px-3 py-2.5 text-xs text-warm-gray">
            Visit us at the counter — we&apos;re happy to take your order in person.
          </p>
        )}
      </div>
    </div>
  );
}

interface ChatRecoveryActionsProps {
  hasCartItems: boolean;
  onSelect: (message: string) => void;
}

export function ChatRecoveryActions({ hasCartItems, onSelect }: ChatRecoveryActionsProps) {
  const replies = buildRecoveryReplies(hasCartItems);

  return (
    <div className="mb-3 ml-0 max-w-[92%]">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-warm-gray">
        Try this
      </p>
      <div className="flex flex-wrap gap-1.5">
        {replies.map((q) => (
          <button
            key={`recovery-${q.message}`}
            type="button"
            onClick={() => onSelect(q.message)}
            className="flex items-center gap-1 rounded-full border border-espresso/10 bg-white px-2.5 py-1.5 text-[11px] font-medium text-espresso shadow-sm transition hover:border-terracotta/25 active:scale-[0.98]"
          >
            <span aria-hidden>{q.icon}</span>
            <span>{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
