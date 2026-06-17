import { Link } from "react-router-dom";

interface HeaderProps {
  onOrderClick: () => void;
  isStoreOpen: boolean;
}

export function Header({ onOrderClick, isStoreOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-espresso/8 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-4">
        <Link to="/" className="justify-self-start text-espresso no-underline">
          <span className="font-serif text-[1.75rem] font-semibold tracking-wide">Spazio</span>
          <span className="mt-1 block font-sans text-[0.62rem] font-medium uppercase tracking-[0.28em] text-warm-gray">
            Coffee by chat
          </span>
        </Link>

        <nav className="hidden justify-self-center md:block">
          <ul className="flex gap-10">
            {[
              { href: "#menu", label: "Menu" },
              { href: "#how", label: "How it works" },
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="group relative pb-1 text-[0.8rem] font-medium uppercase tracking-[0.14em] text-espresso no-underline"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 h-px w-full origin-right scale-x-0 bg-terracotta transition-transform group-hover:origin-left group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="justify-self-end">
          <button
            type="button"
            onClick={onOrderClick}
            disabled={!isStoreOpen}
            className="hidden rounded-lg bg-espresso px-5 py-2.5 text-[0.78rem] font-medium uppercase tracking-wider text-white transition hover:bg-[#2d221c] disabled:cursor-not-allowed disabled:opacity-45 md:inline-block"
          >
            {isStoreOpen ? "Order now" : "Closed"}
          </button>
          <button
            type="button"
            onClick={onOrderClick}
            aria-label="Order via chat"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-espresso/12 bg-cream text-lg md:hidden"
          >
            💬
          </button>
        </div>
      </div>
    </header>
  );
}
