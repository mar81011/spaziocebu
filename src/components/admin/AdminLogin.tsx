import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { loginAdmin } from "../../lib/adminAuth";

interface AdminLoginProps {
  onSuccess: () => void;
  useDbAuth: boolean;
}

export function AdminLogin({ onSuccess, useDbAuth }: AdminLoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ok = await loginAdmin(username, password);
      if (ok) {
        onSuccess();
        return;
      }
      setError("Incorrect username or password.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-[18px] border border-espresso/8 bg-white p-8 shadow-[0_24px_60px_rgba(26,18,14,0.1)]">
        <p className="text-xs uppercase tracking-[0.2em] text-warm-gray">Spazio Admin</p>
        <h1 className="mt-2 font-serif text-3xl font-medium text-espresso">Sign in</h1>
        <p className="mt-2 text-sm text-warm-gray">
          {useDbAuth
            ? "Use your admin username and password."
            : "Enter the admin password to manage orders and menu."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {useDbAuth && (
            <label className="block text-xs uppercase tracking-wider text-warm-gray">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                placeholder="admin"
              />
            </label>
          )}

          <label className="block text-xs uppercase tracking-wider text-warm-gray">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus={!useDbAuth}
              required
              className="mt-1 w-full rounded-lg border border-espresso/15 px-3 py-2.5 text-sm outline-none focus:border-terracotta"
              placeholder="Password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-terracotta py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Enter admin"}
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-sm text-warm-gray no-underline hover:text-espresso">
          ← Back to customer site
        </Link>
      </div>
    </div>
  );
}
