import { useEffect, useState, type ReactNode } from "react";
import {
  isAdminAuthenticated,
  isAdminAuthConfigured,
  usesDatabaseAdminAuth,
} from "../../lib/adminAuth";
import { AdminLogin } from "./AdminLogin";

interface AdminGateProps {
  children: ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const [authed, setAuthed] = useState(isAdminAuthenticated);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [useDbAuth, setUseDbAuth] = useState(false);

  useEffect(() => {
    void (async () => {
      const [authOk, dbAuth] = await Promise.all([isAdminAuthConfigured(), usesDatabaseAdminAuth()]);
      setConfigured(authOk);
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

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
        <div className="max-w-md rounded-[18px] border border-espresso/8 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-espresso">Admin not configured</h1>
          <p className="mt-3 text-sm text-warm-gray">
            Run <code className="rounded bg-cream px-1">supabase/migration_admin_and_availability.sql</code> in
            Supabase SQL Editor, or set{" "}
            <code className="rounded bg-cream px-1">VITE_ADMIN_PASSWORD</code> in your environment.
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin useDbAuth={useDbAuth} onSuccess={() => setAuthed(true)} />;
  }

  return children;
}
