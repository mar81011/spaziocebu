import { isSupabaseConfigured } from "./supabase";
import * as db from "./supabaseDb";

const AUTH_KEY = "spazio_admin_auth";
const ADMIN_USER_KEY = "spazio_admin_user";

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

export async function isAdminAuthConfigured(): Promise<boolean> {
  if (isSupabaseConfigured) {
    const hasDbAdmin = await db.hasAdminUsers();
    if (hasDbAdmin) return true;
  }
  return isAdminPasswordConfigured();
}

export async function usesDatabaseAdminAuth(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  return db.hasAdminUsers();
}

export async function loginAdmin(username: string, password: string): Promise<boolean> {
  if (isSupabaseConfigured && (await db.hasAdminUsers())) {
    try {
      const ok = await db.verifyAdminLogin(username, password);
      if (!ok) return false;
      sessionStorage.setItem(AUTH_KEY, "1");
      sessionStorage.setItem(ADMIN_USER_KEY, username.trim().toLowerCase());
      return true;
    } catch (error) {
      console.error("Admin login failed:", error);
      return false;
    }
  }

  if (password === getAdminPassword() && getAdminPassword().length > 0) {
    sessionStorage.setItem(AUTH_KEY, "1");
    sessionStorage.setItem(ADMIN_USER_KEY, username.trim() || "admin");
    return true;
  }

  return false;
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
