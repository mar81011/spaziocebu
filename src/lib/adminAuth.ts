import { isSupabaseConfigured } from "./supabase";
import * as db from "./supabaseDb";

const AUTH_KEY = "spazio_admin_auth";
const ADMIN_USER_KEY = "spazio_admin_user";

export type AdminSetupStatus =
  | { ok: true; mode: "database" | "env" }
  | {
      ok: false;
      reason: "run_migration" | "invalid_supabase_key" | "set_env_password" | "configure_supabase";
      detail?: string;
    };

export function getAdminPassword(): string {
  return import.meta.env.VITE_ADMIN_PASSWORD ?? "";
}

export function isAdminPasswordConfigured(): boolean {
  return getAdminPassword().length > 0;
}

export function getAdminUsername(): string {
  return sessionStorage.getItem(ADMIN_USER_KEY) ?? "admin";
}

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

export async function getAdminSetupStatus(): Promise<AdminSetupStatus> {
  if (isSupabaseConfigured) {
    const check = await db.checkAdminUsers();
    if (check.available) return { ok: true, mode: "database" };
    if (check.invalidKey) {
      return {
        ok: false,
        reason: "invalid_supabase_key",
        detail: check.error,
      };
    }
    if (isAdminPasswordConfigured()) return { ok: true, mode: "env" };
    return {
      ok: false,
      reason: "run_migration",
      detail: check.error,
    };
  }

  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (rawKey && rawKey.trim()) {
    return {
      ok: false,
      reason: "invalid_supabase_key",
      detail: "Replace the placeholder VITE_SUPABASE_ANON_KEY in .env with your real anon key.",
    };
  }

  if (isAdminPasswordConfigured()) return { ok: true, mode: "env" };

  return { ok: false, reason: "configure_supabase" };
}

export async function isAdminAuthConfigured(): Promise<boolean> {
  const status = await getAdminSetupStatus();
  return status.ok;
}

export async function usesDatabaseAdminAuth(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  return db.hasAdminUsers();
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured && (await db.hasAdminUsers())) {
    try {
      const ok = await db.verifyAdminLogin(username, password);
      if (!ok) return { ok: false };
      sessionStorage.setItem(AUTH_KEY, "1");
      sessionStorage.setItem(ADMIN_USER_KEY, username.trim().toLowerCase());
      return { ok: true };
    } catch (error) {
      console.error("Admin login failed:", error);
      return { ok: false, error: db.formatDbError(error) };
    }
  }

  if (password === getAdminPassword() && getAdminPassword().length > 0) {
    sessionStorage.setItem(AUTH_KEY, "1");
    sessionStorage.setItem(ADMIN_USER_KEY, username.trim() || "admin");
    return { ok: true };
  }

  return { ok: false };
}

export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Password change requires Supabase admin users." };
  }

  try {
    const ok = await db.updateAdminPassword(getAdminUsername(), oldPassword, newPassword);
    if (!ok) return { ok: false, error: "Current password is incorrect." };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: db.formatDbError(error) };
  }
}

export function logoutAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}
