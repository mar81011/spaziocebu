import { useState, type ReactNode } from "react";
import { isAdminAuthenticated, isAdminPasswordConfigured } from "../../lib/adminAuth";
import { AdminLogin } from "./AdminLogin";

interface AdminGateProps {
  children: ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const [authed, setAuthed] = useState(isAdminAuthenticated);

  if (!isAdminPasswordConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
        <div className="max-w-md rounded-[18px] border border-espresso/8 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-espresso">Admin password not set</h1>
          <p className="mt-3 text-sm text-warm-gray">
            Add <code className="rounded bg-cream px-1">VITE_ADMIN_PASSWORD</code> to your{" "}
            <code className="rounded bg-cream px-1">.env</code> file (local) or Vercel environment
            variables (production), then redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return children;
}
