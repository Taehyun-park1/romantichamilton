-- Romantic Hamilton authentication schema
-- Run this in Supabase SQL Editor after enabling Email and Kakao Auth providers.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  provider_user_id text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_name text not null,
  preferred_date date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.class_reservations enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own_non_admin" on public.profiles;
create policy "profiles_update_own_non_admin"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "class_reservations_insert_own" on public.class_reservations;
create policy "class_reservations_insert_own"
on public.class_reservations
for insert
with check (auth.uid() = user_id);

drop policy if exists "class_reservations_select_own_or_admin" on public.class_reservations;
create policy "class_reservations_select_own_or_admin"
on public.class_reservations
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "class_reservations_admin_update" on public.class_reservations;
create policy "class_reservations_admin_update"
on public.class_reservations
for update
using (public.is_admin())
with check (public.is_admin());
