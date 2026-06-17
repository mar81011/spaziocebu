-- Run this if you already created tables before profit tracking was added.
-- https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new

alter table public.menu_items
  add column if not exists cost numeric(10, 2) not null default 0;

update public.menu_items set cost = 70 where id = 'i-1';
update public.menu_items set cost = 55 where id = 'i-2';
update public.menu_items set cost = 60 where id = 'i-3';
update public.menu_items set cost = 50 where id = 'i-4';
update public.menu_items set cost = 52 where id = 'i-5';
update public.menu_items set cost = 80 where id = 'i-6';
update public.menu_items set cost = 55 where id = 'i-7';
update public.menu_items set cost = 15 where id = 'i-8';
update public.menu_items set cost = 12 where id = 'i-9';
update public.menu_items set cost = 8 where id = 'i-10';
