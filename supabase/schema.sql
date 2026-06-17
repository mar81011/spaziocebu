-- Spazio cafe schema
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.store_config (
  id int primary key default 1 check (id = 1),
  is_open boolean not null default true,
  gcash_number text not null default '09171234567',
  gcash_account_name text not null default 'Spazio Coffee',
  alerts_enabled boolean not null default true,
  owner_phone text not null default '',
  semaphore_api_key text not null default '',
  ntfy_topic text not null default 'Spazio',
  owner_email text not null default '',
  email_alerts_enabled boolean not null default false,
  webhook_url text not null default '',
  browser_alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id text primary key,
  title text not null,
  sort_order int not null default 0
);

create table if not exists public.menu_items (
  id text primary key,
  category_id text not null references public.menu_categories (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null,
  cost numeric(10, 2) not null default 0,
  sort_order int not null default 0
);

create table if not exists public.orders (
  id bigint generated always as identity (start with 1043 increment by 1) primary key,
  customer_name text not null,
  items jsonb not null,
  total numeric(10, 2) not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'preparing', 'ready', 'completed')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Realtime (orders + menu updates sync across tabs/devices)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.menu_categories;
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.store_config;

-- ---------------------------------------------------------------------------
-- Row Level Security (MVP — open policies; lock down before public launch)
-- ---------------------------------------------------------------------------

alter table public.store_config enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

create policy "store_config_anon_all"
  on public.store_config for all to anon, authenticated
  using (true) with check (true);

create policy "menu_categories_anon_all"
  on public.menu_categories for all to anon, authenticated
  using (true) with check (true);

create policy "menu_items_anon_all"
  on public.menu_items for all to anon, authenticated
  using (true) with check (true);

create policy "orders_anon_all"
  on public.orders for all to anon, authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed: store config + default menu
-- ---------------------------------------------------------------------------

insert into public.store_config (id) values (1)
on conflict (id) do nothing;

insert into public.menu_categories (id, title, sort_order) values
  ('cat-coffee', 'Coffee', 0),
  ('cat-addons', 'Add-Ons', 1)
on conflict (id) do nothing;

insert into public.menu_items (id, category_id, name, description, price, cost, sort_order) values
  ('i-1', 'cat-coffee', 'Spazio Signature', 'Espresso, oat milk, orange blossom', 185, 70, 0),
  ('i-2', 'cat-coffee', 'Flat White', 'Double ristretto, silky microfoam', 165, 55, 1),
  ('i-3', 'cat-coffee', 'Pour Over', 'Rotating single-origin, hand-brewed', 175, 60, 2),
  ('i-4', 'cat-coffee', 'Cortado', 'Equal parts espresso & warm milk', 155, 50, 3),
  ('i-5', 'cat-coffee', 'Cappuccino', 'Espresso with thick foam', 160, 52, 4),
  ('i-6', 'cat-coffee', 'Matcha Latte', 'Ceremonial grade, oat or dairy', 195, 80, 5),
  ('i-7', 'cat-addons', 'Almond Croissant', 'House laminated, twice-baked', 145, 55, 0),
  ('i-8', 'cat-addons', 'Extra shot', 'Additional espresso shot', 45, 15, 1),
  ('i-9', 'cat-addons', 'Oat milk swap', 'Substitute dairy with oat milk', 35, 12, 2),
  ('i-10', 'cat-addons', 'Vanilla syrup', 'House-made vanilla', 25, 8, 3)
on conflict (id) do nothing;
