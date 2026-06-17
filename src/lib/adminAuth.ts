const AUTH_KEY = "spazio_admin_auth";

export function getAdminPassword(): string {
  return import.meta.env.VITE_ADMIN_PASSWORD ?? "";
}

export function isAdminPasswordConfigured(): boolean {
  return getAdminPassword().length > 0;
}

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

export function loginAdmin(password: string): boolean {
  if (password !== getAdminPassword()) return false;
  sessionStorage.setItem(AUTH_KEY, "1");
  return true;
}

export function logoutAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
}
