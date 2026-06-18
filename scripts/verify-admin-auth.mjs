/**
 * Verifies admin auth RPCs via the Supabase anon key (same as the app).
 * Usage: npm run verify:admin
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env") });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey || anonKey === "your-anon-key-here") {
  console.error(
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example)."
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const { data: hasAdmin, error: hasError } = await supabase.rpc("has_admin_users");
const { data: loginWorks, error: loginError } = await supabase.rpc("verify_admin_login", {
  p_username: "admin",
  p_password: "SpazioAdmin2026",
});

console.log("Supabase URL:", url);
console.log("has_admin_users():", hasAdmin, hasError ? `(error: ${hasError.message})` : "");
console.log(
  "verify_admin_login('admin', 'SpazioAdmin2026'):",
  loginWorks,
  loginError ? `(error: ${loginError.message})` : ""
);

if (hasError?.message?.includes("Could not find the function")) {
  console.error("\n→ Run: npm run setup:admin  (or migration_admin_and_availability.sql in SQL Editor)");
  process.exit(1);
}

if (!hasAdmin) {
  console.error("\n→ No admin users found. Run: npm run setup:admin");
  process.exit(1);
}

if (!loginWorks) {
  console.error("\n→ Login verify failed. Run: npm run setup:admin (includes fix migration)");
  process.exit(1);
}

console.log("\nAdmin auth is configured correctly.");
