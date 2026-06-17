# Spazio — HTML Prototypes

Static prototypes for design reference and MVP validation. Open directly in a browser — no build step required.

## Files

| File | Purpose |
|------|---------|
| [`index.html`](./index.html) | Customer homepage + chat ordering |
| [`admin.html`](./admin.html) | Admin panel — view and manage orders |
| [`orders-store.js`](./orders-store.js) | Shared localStorage order data (prototype only) |

## How to preview

```powershell
# Customer site
start e:\Spazio\prototype\index.html

# Admin panel
start e:\Spazio\prototype\admin.html
```

## How orders flow (prototype)

1. Customer places an order on **index.html** via chat (say items, then type **confirm**, then your name).
2. Order is saved to **localStorage** (`spazio_orders`).
3. **admin.html** reads the same storage — refresh to see new orders.
4. In admin, update status: **Pending → Preparing → Ready → Completed**, or add orders manually.

## Menu management (prototype)

1. Open **admin.html** → **Menu** in the sidebar.
2. Categories work like **Coffee → item list** and **Add-Ons → item list**.
3. **+ Add category** to create a new section (e.g. Pastries, Seasonal).
4. Edit category titles inline; add items at the bottom of each category card.
5. Changes save to `spazio_menu` and appear on the customer homepage automatically.

> **Note:** localStorage is per-browser. Customer and admin tabs in the same browser share data. A real app will use a database + API instead.

## Design notes

- No physical store / no café photos (pre-launch)
- Homepage focus: hero, how it works, menu highlights, chat widget
- Admin focus: order queue, status updates, manual order entry

## Next step (real build)

Replace `orders-store.js` with a backend (e.g. Supabase `orders` table) and connect the chat to `POST /api/chat` + `POST /api/orders`.
