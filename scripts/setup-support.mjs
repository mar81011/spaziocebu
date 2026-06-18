/**
 * Adds support columns to store_config (chat Help links).
 * Requires DATABASE_URL in .env.
 *
 * Usage: npm run setup:support
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env") });

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in .env\n\n" +
      "Option A — SQL Editor (no password needed):\n" +
      "  1. Open https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new\n" +
      "  2. Paste supabase/migration_add_support.sql and click Run\n\n" +
      "Option B — from terminal:\n" +
      "  1. Supabase → Project Settings → Database → Connection string (URI)\n" +
      "  2. Add DATABASE_URL=... to .env\n" +
      "  3. Run: npm run setup:support"
  );
  process.exit(1);
}

const sql = readFileSync(join(root, "supabase", "migration_add_support.sql"), "utf8");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Applying migration_add_support.sql…\n");
  await client.query(sql);
  const check = await client.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'store_config'
       and column_name in ('messenger_url', 'support_phone', 'support_page_label', 'support_phone_label')
     order by column_name`
  );
  console.log("Columns present:", check.rows.map((r) => r.column_name).join(", "));
  console.log("\nDone. Refresh admin Settings — the error should be gone.");
} catch (error) {
  console.error("\nMigration failed:", error.message ?? error);
  process.exit(1);
} finally {
  await client.end();
}
