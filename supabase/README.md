# Supabase setup for Spazio

Project dashboard: [rsaoiobpvszinripuocc](https://supabase.com/dashboard/project/rsaoiobpvszinripuocc)

## 1. Create tables

1. Open **SQL Editor** → [New query](https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new)
2. Paste the full contents of [`schema.sql`](./schema.sql)
3. Click **Run**

If menu saves fail with a missing `cost` column, also run [`migration_add_cost.sql`](./migration_add_cost.sql) in the SQL Editor.

For **admin login** and **menu availability toggles**, run [`migration_admin_and_availability.sql`](./migration_admin_and_availability.sql).

Default admin after migration:
- Username: `admin`
- Password: `SpazioAdmin2026` (change in Admin → Settings)

This creates:

| Table | Purpose |
|-------|---------|
| `store_config` | Open/closed, GCash, ntfy alerts (single row) |
| `menu_categories` | Menu sections (Coffee, Add-Ons, …) |
| `menu_items` | Drinks and add-ons |
| `orders` | Customer orders |

It also enables **Realtime** so admin and customer tabs stay in sync.

## 2. Connect the app

1. Open **Project Settings → API**: [API settings](https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/settings/api)
2. Copy **Project URL** and **anon public** key
3. In the project root, copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

4. Paste your values into `.env`:

```
VITE_SUPABASE_URL=https://rsaoiobpvszinripuocc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

5. Restart the dev server:

```powershell
npm.cmd run dev
```

The admin sidebar should show **Supabase** instead of “localStorage”.

## Without `.env`

The app still works with **localStorage** (same as before). Supabase is only used when both env vars are set.

## Security note

The included RLS policies allow public read/write for the MVP. Before a real launch, add admin authentication and restrict who can change menu/settings or see all orders.
