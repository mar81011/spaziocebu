import { Link, Outlet, useLocation } from "react-router-dom";
import { isDatabaseEnabled } from "../../lib/storage";
import { logoutAdmin } from "../../lib/adminAuth";
import { useOrderNotifications } from "../../hooks/useOrderNotifications";

const links = [
  { to: "/admin", label: "Orders", end: true },
  { to: "/admin/menu", label: "Menu" },
  { to: "/admin/transactions", label: "Transactions" },
  { to: "/admin/settings", label: "Settings" },
];

export function AdminLayout() {
  const location = useLocation();
  useOrderNotifications();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-6 bg-espresso p-6 text-white">
        <div>
          <span className="font-serif text-2xl font-semibold tracking-wide">Spazio</span>
          <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.2em] opacity-55">Admin</span>
        </div>

        <nav className="flex-1">
          <ul className="flex flex-row flex-wrap gap-2 md:flex-col">
            {links.map((link) => {
              const active = link.end
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to);
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`block rounded-lg px-3 py-2.5 text-sm no-underline transition ${
                      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                to="/"
                className="block rounded-lg px-3 py-2.5 text-sm text-white/70 no-underline hover:bg-white/10 hover:text-white"
              >
                Customer site ↗
              </Link>
            </li>
          </ul>
        </nav>

        <p className="space-y-2 text-xs opacity-50">
          <button
            type="button"
            onClick={() => {
              logoutAdmin();
              window.location.href = "/admin";
            }}
            className="block w-full rounded-lg border border-white/15 px-3 py-2 text-left text-white/70 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
          {isDatabaseEnabled() ? "Supabase" : "Prototype — localStorage"}
        </p>
      </aside>

      <main className="overflow-x-auto bg-cream p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
