-- Customer reviews (public comments + 1–5 stars)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new

create table if not exists public.order_reviews (
  id bigint generated always as identity primary key,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  order_id bigint references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists order_reviews_order_id_unique
  on public.order_reviews (order_id)
  where order_id is not null;

alter table public.order_reviews enable row level security;

create policy "order_reviews_anon_all"
  on public.order_reviews for all to anon, authenticated
  using (true) with check (true);

alter publication supabase_realtime add table public.order_reviews;
