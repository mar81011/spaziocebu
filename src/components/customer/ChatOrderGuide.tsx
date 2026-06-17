import { ORDERING_TIPS } from "../../lib/orderingGuide";

export function ChatOrderGuide() {
  return (
    <div className="mb-3 max-w-[88%] rounded-2xl border border-espresso/8 bg-white/90 px-4 py-3 text-sm shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">
        Ordering tips
      </p>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-espresso/85">
        {ORDERING_TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="text-terracotta" aria-hidden>
              •
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
