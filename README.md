# Spazio

Specialty coffee ordering via chat — React app with customer homepage and admin panel.

## Stack

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **React Router** — `/` customer site, `/admin` orders, `/admin/menu` menu manager
- **Supabase** (optional) — Postgres + realtime sync

## Development

```powershell
cd e:\Spazio
npm install
npm run dev
```

- Customer site: http://localhost:5173/
- Admin: http://localhost:5173/admin

### Supabase (recommended)

1. Run [`supabase/schema.sql`](./supabase/schema.sql) in your [Supabase SQL editor](https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new)
2. Copy `.env.example` → `.env` and add your [API keys](https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/settings/api)
3. Restart `npm run dev`

See [`supabase/README.md`](./supabase/README.md) for step-by-step setup.

Without `.env`, the app falls back to **localStorage** in the browser.

## Deploy to Vercel

See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for pushing to GitHub and deploying (replace your old Spazio repo).

## Prototype reference

Static HTML prototypes are in [`prototype/`](./prototype/) for design reference.

## Project structure

```
src/
  components/customer/   Homepage + chat widget
  components/admin/      Orders + menu management
  lib/                   Storage + chat logic
  pages/                 HomePage, AdminPage
```

## Next steps

- Add authentication for `/admin`
- Connect chat to a real LLM backend
- Tighten Supabase RLS before public launch
