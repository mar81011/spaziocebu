import type { Menu } from "../../types";
import { formatCurrency } from "../../lib/format";
import { iconForCategory, iconForMenuItem } from "../../lib/menuIcons";
interface MenuSectionProps {
  menu: Menu;
  onItemClick: (name: string) => void;
  onOrderClick: () => void;
  isStoreOpen: boolean;
}

export function MenuSection({ menu, onItemClick, onOrderClick, isStoreOpen }: MenuSectionProps) {
  return (
    <section id="menu" className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="mb-4 flex items-center justify-center gap-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-terracotta">
            <span className="h-px w-8 bg-terracotta" />
            Menu highlights
          </p>
          <h2 className="font-serif text-4xl font-medium md:text-5xl">What we serve</h2>
          <p className="mx-auto mt-3 max-w-lg font-light text-warm-gray">
            Tap any item to start your order in chat.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {menu.categories.map((category) => (
            <div key={category.id}>
              <h3 className="mb-4 flex items-center gap-2.5 border-b border-espresso/10 pb-2 font-serif text-2xl font-medium">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-lg"
                  aria-hidden
                >
                  {iconForCategory(category.title)}
                </span>
                {category.title}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {category.items.map((item) => {
                  const icon = iconForMenuItem(item.name, category.title);
                  return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => isStoreOpen && onItemClick(item.name)}
                    disabled={!isStoreOpen}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-[18px] border border-white/90 bg-white p-5 text-left shadow-[0_8px_30px_rgba(26,18,14,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(26,18,14,0.12)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_30px_rgba(26,18,14,0.08)]"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#faf7f2] text-xl"
                      aria-hidden
                    >
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <span className="shrink-0 font-semibold text-terracotta">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm font-light text-warm-gray">{item.description}</p>
                      )}
                    </div>
                  </button>
                  );
                })}              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={onOrderClick}
            disabled={!isStoreOpen}
            className="rounded-full bg-gradient-to-br from-terracotta to-[#a04e2f] px-7 py-3.5 text-sm font-medium text-white shadow-[0_10px_28px_rgba(184,92,56,0.35)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {isStoreOpen ? "Order via Chat" : "Closed for orders"}
          </button>
        </div>
      </div>
    </section>
  );
}
