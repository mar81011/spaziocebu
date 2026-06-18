-- Customer support contacts for chat Help panel
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new

alter table public.store_config
  add column if not exists support_phone text not null default '09171234567';

alter table public.store_config
  add column if not exists messenger_url text not null default '';

alter table public.store_config
  add column if not exists support_page_label text not null default 'Visit this page';

alter table public.store_config
  add column if not exists support_phone_label text not null default '';

-- Refresh PostgREST schema cache so the API sees new columns immediately
notify pgrst, 'reload schema';

-- Verify (optional — should return one row with the new columns)
select support_phone, messenger_url, support_page_label, support_phone_label
from public.store_config
where id = 1;
