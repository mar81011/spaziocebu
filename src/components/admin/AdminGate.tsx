import { useEffect, useState, type ReactNode } from "react";
import {
  getAdminSetupStatus,
  isAdminAuthenticated,
  usesDatabaseAdminAuth,
  type AdminSetupStatus,
} from "../../lib/adminAuth";
import { isSupabaseConfigured } from "../../lib/supabase";
import { AdminLogin } from "./AdminLogin";

interface AdminGateProps {
  children: ReactNode;
}

const SQL_EDITOR_URL =
  "https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new";
const API_SETTINGS_URL =
  "https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/settings/api";

function AdminNotConfigured({ status }: { status: AdminSetupStatus }) {
  const reason = status.ok ? null : status.reason;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <div className="max-w-lg rounded-[18px] border border-espresso/8 bg-white p-8 shadow-sm text-left">
        <h1 className="font-serif text-2xl text-espresso text-center">Admin not configured</h1>

        {reason === "invalid_supabase_key" && (
          <>
            <p className="mt-3 text-sm text-warm-gray">
              Your Supabase anon key is missing or still a placeholder. The app cannot reach your
              database until you add the real key.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-warm-gray">
              <li>
                Open{" "}
                <a
                  href={API_SETTINGS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-terracotta underline-offset-2 hover:underline"
                >
                  Supabase → Project Settings → API
                </a>
              </li>
              <li>
                Copy the <strong className="font-medium text-espresso">anon public</strong> key
              </li>
              <li>
                Paste it into <code className="rounded bg-cream px-1">.env</code> as{" "}
                <code className="rounded bg-cream px-1">VITE_SUPABASE_ANON_KEY=...</code>
              </li>
              <li>
                Restart the dev server (<code className="rounded bg-cream px-1">npm run dev</code>)
                and refresh this page
              </li>
            </ol>
            {!status.ok && status.detail && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {status.detail}
              </p>
            )}
          </>
        )}

        {reason === "run_migration" && (
          <>
            <p className="mt-3 text-sm text-warm-gray">
              Supabase is connected, but admin login is not set up yet. Run the admin migration in
              your Supabase project:
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-warm-gray">
              <li>
                Open the{" "}
                <a
                  href={SQL_EDITOR_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-terracotta underline-offset-2 hover:underline"
                >
                  Supabase SQL Editor
                </a>
              </li>
              <li>
                Paste and run{" "}
                <code className="rounded bg-cream px-1">supabase/migration_admin_and_availability.sql</code>
              </li>
              <li>
                Sign in with username <code className="rounded bg-cream px-1">admin</code> and
                password <code className="rounded bg-cream px-1">SpazioAdmin2026</code>
              </li>
            </ol>
            <p className="mt-4 text-xs text-warm-gray">
              Or from the project root (with <code className="rounded bg-cream px-1">DATABASE_URL</code>{" "}
              in <code className="rounded bg-cream px-1">.env</code>):{" "}
              <code className="rounded bg-cream px-1">npm run setup:admin</code>
            </p>
            {!status.ok && status.detail && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {status.detail}
              </p>
            )}
          </>
        )}

        {reason === "configure_supabase" && (
          <p className="mt-3 text-sm text-warm-gray">
            Copy <code className="rounded bg-cream px-1">.env.example</code> to{" "}
            <code className="rounded bg-cream px-1">.env</code>, add your{" "}
            <a
              href={API_SETTINGS_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-terracotta underline-offset-2 hover:underline"
            >
              Supabase URL and anon key
            </a>
            , then restart the dev server. Alternatively set{" "}
            <code className="rounded bg-cream px-1">VITE_ADMIN_PASSWORD</code> for a simple
            password-only login.
          </p>
        )}

        {reason === "set_env_password" && (
          <p className="mt-3 text-sm text-warm-gray">
            Set <code className="rounded bg-cream px-1">VITE_ADMIN_PASSWORD</code> in your{" "}
            <code className="rounded bg-cream px-1">.env</code> file and restart the dev server.
          </p>
        )}

        {isSupabaseConfigured && reason === "run_migration" && (
          <p className="mt-4 text-center text-xs text-warm-gray">
            After running the migration, refresh this page.
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminGate({ children }: AdminGateProps) {
  const [authed, setAuthed] = useState(isAdminAuthenticated);
  const [ready, setReady] = useState(false);
  const [setupStatus, setSetupStatus] = useState<AdminSetupStatus>({ ok: true, mode: "env" });
  const [useDbAuth, setUseDbAuth] = useState(false);

  useEffect(() => {
    void (async () => {
      const [status, dbAuth] = await Promise.all([getAdminSetupStatus(), usesDatabaseAdminAuth()]);
      setSetupStatus(status);
      setUseDbAuth(dbAuth);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-espresso">
        <p className="font-serif text-xl">Loading admin…</p>
      </div>
    );
  }

  if (!setupStatus.ok) {
    return <AdminNotConfigured status={setupStatus} />;
  }

  if (!authed) {
    return <AdminLogin useDbAuth={useDbAuth} onSuccess={() => setAuthed(true)} />;
  }

  return children;
}
