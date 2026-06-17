import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 border-t border-espresso/8 px-6 py-8 text-sm text-warm-gray sm:flex-row sm:items-center">
      <Link to="/" className="font-serif text-xl font-semibold text-espresso no-underline">
        Spazio
      </Link>
      <p>
        © 2026 Spazio. Order via chat. ·{" "}
        <Link to="/admin" className="text-warm-gray hover:text-espresso">
          Admin
        </Link>
      </p>
    </footer>
  );
}
