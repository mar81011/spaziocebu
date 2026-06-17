import { useState, type FormEvent } from "react";
import { changeAdminPassword, getAdminUsername } from "../../lib/adminAuth";
import { isDatabaseEnabled } from "../../lib/storage";
import { StoreToggle } from "./StoreToggle";
import { PaymentSettingsPanel } from "./PaymentSettingsPanel";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";

export function SettingsPanel() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSaving(true);
    const result = await changeAdminPassword(oldPassword, newPassword);
    setSaving(false);

    if (!result.ok) {
      setPasswordError(result.error ?? "Could not update password.");
      return;
    }

    setPasswordMessage("Password updated successfully.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium">Settings</h1>
        <p className="mt-1 text-sm text-warm-gray">
          Store status, payments, alerts, and admin security.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-[14px] border border-white/90 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl font-medium">Store</h2>
          <p className="mt-1 text-sm text-warm-gray">Pause or resume customer ordering.</p>
          <div className="mt-4">
            <StoreToggle variant="page" />
          </div>
        </section>

        <section className="rounded-[14px] border border-white/90 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl font-medium">GCash payments</h2>
          <p className="mt-1 text-sm text-warm-gray">Shown to customers after they place an order.</p>
          <div className="mt-4">
            <PaymentSettingsPanel variant="page" />
          </div>
        </section>

        <section className="rounded-[14px] border border-white/90 bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl font-medium">Order alerts</h2>
          <p className="mt-1 text-sm text-warm-gray">Notify yourself when new orders come in.</p>
          <div className="mt-4">
            <NotificationSettingsPanel variant="page" />
          </div>
        </section>

        {isDatabaseEnabled() && (
          <section className="rounded-[14px] border border-white/90 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-xl font-medium">Admin security</h2>
            <p className="mt-1 text-sm text-warm-gray">
              Signed in as <strong>{getAdminUsername()}</strong>. Change your password below.
            </p>

            <form onSubmit={handlePasswordChange} className="mt-4 max-w-md space-y-3">
              <label className="block text-xs uppercase tracking-wider text-warm-gray">
                Current password
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-espresso/12 px-3 py-2 text-sm outline-none focus:border-terracotta"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-warm-gray">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-espresso/12 px-3 py-2 text-sm outline-none focus:border-terracotta"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-warm-gray">
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-espresso/12 px-3 py-2 text-sm outline-none focus:border-terracotta"
                />
              </label>

              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              {passwordMessage && <p className="text-sm text-sage">{passwordMessage}</p>}

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-espresso px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "Updating…" : "Update password"}
              </button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
