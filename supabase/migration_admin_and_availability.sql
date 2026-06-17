-- Run in Supabase SQL Editor if you already have tables:
-- https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new

create extension if not exists pgcrypto;

-- Menu item availability (hide from customer site when off)
alter table public.menu_items
  add column if not exists is_available boolean not null default true;

-- Admin login (username + password hash — never store plain passwords)
create table if not exists public.admin_users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No policies: anon cannot read admin_users directly.

create or replace function public.has_admin_users()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users);
$$;

create or replace function public.verify_admin_login(p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash
  from public.admin_users
  where username = lower(trim(p_username));

  if stored_hash is null then
    return false;
  end if;

  return stored_hash = crypt(p_password, stored_hash);
end;
$$;

create or replace function public.update_admin_password(
  p_username text,
  p_old_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
  normalized text := lower(trim(p_username));
begin
  if length(trim(p_new_password)) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  select password_hash into stored_hash
  from public.admin_users
  where username = normalized;

  if stored_hash is null or stored_hash <> crypt(p_old_password, stored_hash) then
    return false;
  end if;

  update public.admin_users
  set password_hash = crypt(p_new_password, gen_salt('bf'))
  where username = normalized;

  return true;
end;
$$;

grant execute on function public.has_admin_users() to anon, authenticated;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;
grant execute on function public.update_admin_password(text, text, text) to anon, authenticated;

-- Default admin: username `admin` / password `SpazioAdmin2026` — change after first login in Settings
insert into public.admin_users (username, password_hash)
values ('admin', crypt('SpazioAdmin2026', gen_salt('bf')))
on conflict (username) do nothing;
