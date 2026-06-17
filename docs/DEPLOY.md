# Deploy Spazio to Vercel

Replace your old Spazio GitHub repo with this React app and deploy to Vercel.

## What you need

- GitHub account (with your old `spazio` repo)
- [Vercel](https://vercel.com) account (free)
- Supabase project already set up (tables + `.env` values)

---

## Step 1 — Push this code to GitHub

Open **Git Bash** or **Terminal** in `e:\Spazio`:

### Option A: Replace everything in the existing repo (recommended)

```bash
cd /e/Spazio

git init
git add .
git commit -m "Replace with Spazio React app — chat ordering, admin, Supabase"

# Use your real repo URL, e.g.:
git remote add origin https://github.com/YOUR_USERNAME/spazio.git

git branch -M main
git push -u origin main --force
```

`--force` overwrites the old code on GitHub with this project. Only do this if you want to fully replace the old site.

### Option B: New repo

Create a new repo on GitHub, then:

```bash
git init
git add .
git commit -m "Spazio React app"
git remote add origin https://github.com/YOUR_USERNAME/NEW_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub `spazio` repository
3. Vercel should auto-detect **Vite**. Settings:

| Setting | Value |
|---------|--------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

4. **Environment variables** — add these (Production + Preview):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://rsaoiobpvszinripuocc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your `sb_publishable_...` key |

5. Click **Deploy**

---

## Step 3 — Custom domain (optional)

If your old Spazio had a domain on Vercel:

1. Vercel project → **Settings** → **Domains**
2. Add your domain (e.g. `spazio.yoursite.com`)
3. If the old Vercel project used the same domain, remove it from the old project first

---

## Step 4 — Verify

After deploy:

- `https://your-app.vercel.app/` — customer site + chat
- `https://your-app.vercel.app/admin` — orders, menu, transactions
- Admin sidebar should say **Supabase** (not localStorage)

Place a test order and confirm it appears in Supabase **Table Editor → orders**.

---

## Deploy from CLI (optional)

```bash
npm i -g vercel
cd e:\Spazio
vercel login
vercel
```

Add env vars in the Vercel dashboard or:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

---

## Files that matter for Vercel

- `vercel.json` — SPA routing (`/admin`, `/admin/menu` work on refresh)
- `api/send-sms.js` — optional SMS proxy (only if you use Semaphore)
- `.env` is **not** pushed to git — set vars in Vercel dashboard only

---

## Troubleshooting

**Blank page on `/admin`**  
Redeploy after `vercel.json` is in the repo (handles client-side routes).

**Supabase not connecting**  
Check env vars in Vercel → Settings → Environment Variables, then **Redeploy**.

**Old site still showing**  
Clear browser cache or check you updated the correct Vercel project / domain.
