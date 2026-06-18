/**
 * Applies admin auth migration to Supabase Postgres.
 * Requires DATABASE_URL in .env (Supabase → Project Settings → Database → Connection string).
 *
 * Usage: npm run setup:admin
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
      "1. Open Supabase → Project Settings → Database → Connection string (URI)\n" +
      "2. Add to .env: DATABASE_URL=postgresql://postgres.[ref]:[password]@...\n" +
      "3. Run: npm run setup:admin\n\n" +
      "Or paste supabase/migration_admin_and_availability.sql in the SQL Editor manually."
  );
  process.exit(1);
}

const migrations = [
  "migration_admin_and_availability.sql",
  "migration_fix_admin_login.sql",
];

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Connected to database. Applying admin auth migrations…\n");

  for (const file of migrations) {
    const sql = readFileSync(join(root, "supabase", file), "utf8");
    console.log(`→ ${file}`);
    await client.query(sql);
  }

  const hasAdmin = await client.query("select public.has_admin_users() as ok");
  const loginWorks = await client.query(
    "select public.verify_admin_login('admin', 'SpazioAdmin2026') as ok"
  );

  console.log("\nVerification:");
  console.log("  has_admin_users():", hasAdmin.rows[0]?.ok);
  console.log("  verify_admin_login('admin', 'SpazioAdmin2026'):", loginWorks.rows[0]?.ok);

  if (!hasAdmin.rows[0]?.ok || !loginWorks.rows[0]?.ok) {
    console.error("\nMigration ran but verification failed. Check Supabase logs.");
    process.exit(1);
  }

  console.log("\nAdmin auth ready. Sign in at /admin with:");
  console.log("  Username: admin");
  console.log("  Password: SpazioAdmin2026");
  console.log("\nChange the password in Admin → Settings after first login.");
} catch (error) {
  console.error("\nSetup failed:", error.message ?? error);
  process.exit(1);
} finally {
  await client.end();
}
