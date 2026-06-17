import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { loginAdmin } from "../../lib/adminAuth";

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (loginAdmin(password)) {
      onSuccess();
      return;
    }
    setError("Incorrect password. Try again.");
    setPassword("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-[18px] border border-espresso/8 bg-white p-8 shadow-[0_24px_60px_rgba(26,18,14,0.1)]">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray">Spazio Admin</p>
        <h1 className="mt-2 font-serif text-3xl font-medium text-espresso">Sign in</h1>
        <p className="mt-2 text-sm text-warm-gray">Enter the admin password to manage orders and menu.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-xs uppercase tracking-wider text-warm-gray">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2.5 text-sm outline-none focus:border-terracotta"
              placeholder="Admin password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-terracotta py-2.5 text-sm font-medium text-white"
          >
            Enter admin
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-sm text-warm-gray no-underline hover:text-espresso">
          ← Back to customer site
        </Link>
      </div>
    </div>
  );
}
