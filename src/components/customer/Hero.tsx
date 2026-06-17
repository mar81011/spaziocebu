interface HeroProps {
  onOrderClick: () => void;
  isStoreOpen: boolean;
}

export function Hero({ onOrderClick, isStoreOpen }: HeroProps) {
  return (
    <section className="px-6 pb-16 pt-12 md:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-6 flex items-center justify-center gap-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-terracotta">
          <span className="h-px w-8 bg-terracotta" />
          Specialty coffee, pickup only
          <span className="h-px w-8 bg-terracotta" />
        </p>
        <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          Great coffee.
          <br />
          <em className="text-terracotta not-italic">Zero hassle.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg font-light text-warm-gray">
          Chat with us to order — add, change, or remove items. No app, no cart, no account.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <button
            type="button"
            onClick={onOrderClick}
            disabled={!isStoreOpen}
            className="rounded-full bg-gradient-to-br from-terracotta to-[#a04e2f] px-7 py-3.5 text-sm font-medium text-white shadow-[0_10px_28px_rgba(184,92,56,0.35)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {isStoreOpen ? "Start Ordering" : "Closed for orders"}
          </button>
          <a
            href="#menu"
            className="border-b border-transparent text-sm font-medium text-espresso no-underline hover:border-espresso"
          >
            View menu ↓
          </a>
        </div>
      </div>
    </section>
  );
}
