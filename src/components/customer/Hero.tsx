import type { ReactNode } from "react";

interface HeroProps {
  onOrderClick: () => void;
  isStoreOpen: boolean;
}

export function Hero({ onOrderClick, isStoreOpen }: HeroProps) {
  return (
    <section className="px-6 pb-16 pt-12 md:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-6 flex items-center gap-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-terracotta">
            <span className="h-px w-8 bg-terracotta" />
            Specialty coffee, ordered by chat
          </p>
          <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Great coffee.
            <br />
            <em className="text-terracotta not-italic">Zero hassle.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg font-light text-warm-gray">
            Tell us what you want in plain English. No app download, no cart, no account — just chat
            and we'll handle the rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={onOrderClick}
              disabled={!isStoreOpen}
              className="rounded-full bg-gradient-to-br from-terracotta to-[#a04e2f] px-7 py-3.5 text-sm font-medium text-white shadow-[0_10px_28px_rgba(184,92,56,0.35)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {isStoreOpen ? "Start Ordering" : "Closed for orders"}
            </button>
            <a href="#how" className="border-b border-transparent text-sm font-medium text-espresso no-underline hover:border-espresso">
              See how it works ↓
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-espresso/6 bg-white shadow-[0_24px_60px_rgba(26,18,14,0.12)]">
          <div className="flex items-center justify-between bg-espresso px-5 py-4 text-white">
            <div>
              <h2 className="font-serif text-xl font-medium">Spazio</h2>
              <p className="mt-0.5 flex items-center text-xs opacity-65">
                <span
                  className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                    isStoreOpen ? "bg-[#6dd47e]" : "bg-[#e07a7a]"
                  }`}
                />
                {isStoreOpen ? "Online — ready to take your order" : "Closed for orders"}
              </p>
            </div>
          </div>
          <div className="flex min-h-[320px] flex-col gap-3 bg-gradient-to-b from-[#faf7f2] to-white p-5">
            <ChatBubble role="bot">Hi! I'm Spazio. What can I get started for you today?</ChatBubble>
            <ChatBubble role="user">Can I get a flat white and an almond croissant?</ChatBubble>
            <ChatBubble role="bot">
              Of course — 1× Flat White (₱165) and 1× Almond Croissant (₱145). Total ₱310. What's
              your name?
            </ChatBubble>
            <ChatBubble role="user">Alex</ChatBubble>
            <ChatBubble role="bot">
              Thanks Alex! Your order is confirmed. We'll message you when it's ready.
            </ChatBubble>
            <p className="mx-auto rounded-full bg-espresso px-4 py-2 text-center text-xs text-white">
              Order #1042 · ₱310
            </p>
          </div>
          <div className="flex gap-2 border-t border-espresso/8 bg-white p-4">
            <input
              readOnly
              placeholder="Try: 2 cappuccinos to go"
              className="flex-1 rounded-full border border-espresso/12 px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={onOrderClick}
              className="rounded-full bg-espresso px-4 text-white"
              aria-label="Open chat"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ role, children }: { role: "bot" | "user"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <p
      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? "ml-auto rounded-br-sm bg-terracotta text-white"
          : "rounded-bl-sm bg-cream text-espresso"
      }`}
    >
      {children}
    </p>
  );
}
