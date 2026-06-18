import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isPlaceholderSupabaseKey(key: string | undefined): boolean {
  if (!key?.trim()) return true;
  const normalized = key.trim().toLowerCase();
  return (
    normalized === "your-anon-key-here" ||
    normalized.includes("your-anon-key") ||
    normalized.includes("your_anon_key") ||
    normalized.startsWith("eyj...") ||
    normalized.startsWith("sb_publishable_...")
  );
}

export const isSupabaseConfigured = Boolean(
  url && anonKey && !isPlaceholderSupabaseKey(anonKey)
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;
