-- Fix admin login on Supabase (pgcrypto lives in the extensions schema).
-- Run in SQL Editor: https://supabase.com/dashboard/project/rsaoiobpvszinripuocc/sql/new

create extension if not exists pgcrypto with schema extensions;

create or replace function public.verify_admin_login(p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
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
set search_path = public, extensions
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

grant execute on function public.verify_admin_login(text, text) to anon, authenticated;
grant execute on function public.update_admin_password(text, text, text) to anon, authenticated;

-- Reset admin password (change the string if you want a different password)
update public.admin_users
set password_hash = crypt('SpazioAdmin2026', gen_salt('bf'))
where username = 'admin';

-- Should return true when the fix worked:
select public.verify_admin_login('admin', 'SpazioAdmin2026') as login_works;
