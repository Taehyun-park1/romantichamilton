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

create table if not exists public.workshop_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 2 and 80),
  content text not null check (char_length(content) between 10 and 1000),
  invite_id uuid,
  review_type text not null default 'class' check (review_type in ('class', 'product', 'offline', 'other')),
  product_name text,
  class_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workshop_reviews
  alter column user_id drop not null;

alter table public.workshop_reviews
  add column if not exists invite_id uuid,
  add column if not exists review_type text not null default 'class' check (review_type in ('class', 'product', 'offline', 'other')),
  add column if not exists product_name text,
  add column if not exists class_name text;

create table if not exists public.review_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  customer_name text,
  review_type text not null default 'offline' check (review_type in ('class', 'product', 'offline', 'other')),
  product_name text,
  class_name text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workshop_reviews
  drop constraint if exists workshop_reviews_invite_id_fkey;

alter table public.workshop_reviews
  add constraint workshop_reviews_invite_id_fkey
  foreign key (invite_id) references public.review_invites(id) on delete set null;

create table if not exists public.site_products (
  id text primary key,
  name text not null,
  description text not null,
  price integer not null default 0 check (price >= 0),
  colors text[] not null default '{}',
  badge text check (badge in ('NEW', 'BEST', 'CUSTOM')),
  image text not null,
  category text not null check (category in ('wallets', 'bags', 'desk', 'gifts')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_classes (
  id text primary key,
  name text not null,
  description text not null,
  duration text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  price integer not null default 0 check (price >= 0),
  image text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'admin-images',
  'admin-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.class_reservations enable row level security;
alter table public.workshop_reviews enable row level security;
alter table public.review_invites enable row level security;
alter table public.site_products enable row level security;
alter table public.workshop_classes enable row level security;

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

create or replace function public.get_review_invite(invite_token text)
returns table (
  customer_name text,
  review_type text,
  product_name text,
  class_name text,
  expires_at timestamptz,
  used_at timestamptz,
  is_valid boolean
)
language sql
security definer
set search_path = public
as $$
  select
    review_invites.customer_name,
    review_invites.review_type,
    review_invites.product_name,
    review_invites.class_name,
    review_invites.expires_at,
    review_invites.used_at,
    review_invites.used_at is null and review_invites.expires_at > now() as is_valid
  from public.review_invites
  where review_invites.token = invite_token
  limit 1;
$$;

create or replace function public.submit_invite_review(
  invite_token text,
  display_name text,
  rating integer,
  title text,
  content text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invite public.review_invites%rowtype;
  review_id uuid;
begin
  select *
  into target_invite
  from public.review_invites
  where token = invite_token
  for update;

  if target_invite.id is null then
    raise exception 'Invalid review invite.';
  end if;

  if target_invite.used_at is not null then
    raise exception 'This review invite was already used.';
  end if;

  if target_invite.expires_at <= now() then
    raise exception 'This review invite has expired.';
  end if;

  if rating < 1 or rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  insert into public.workshop_reviews (
    user_id,
    invite_id,
    display_name,
    rating,
    title,
    content,
    review_type,
    product_name,
    class_name,
    status
  )
  values (
    null,
    target_invite.id,
    coalesce(nullif(trim(display_name), ''), target_invite.customer_name, '고객'),
    rating,
    trim(title),
    trim(content),
    target_invite.review_type,
    target_invite.product_name,
    target_invite.class_name,
    'pending'
  )
  returning id into review_id;

  update public.review_invites
  set used_at = now()
  where id = target_invite.id;

  return review_id;
end;
$$;

create or replace function public.create_review_invite(
  invite_token text,
  customer_name text,
  review_type text,
  product_name text,
  class_name text
)
returns table (
  id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can create review invites.';
  end if;

  if review_type not in ('class', 'product', 'offline', 'other') then
    raise exception 'Invalid review type.';
  end if;

  return query
  insert into public.review_invites (
    token,
    customer_name,
    review_type,
    product_name,
    class_name,
    expires_at
  )
  values (
    invite_token,
    nullif(trim(customer_name), ''),
    review_type,
    case when review_type = 'product' then nullif(trim(product_name), '') else null end,
    case when review_type = 'class' then nullif(trim(class_name), '') else null end,
    now() + interval '7 days'
  )
  returning
    review_invites.id,
    review_invites.token,
    review_invites.expires_at;
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

drop policy if exists "workshop_reviews_select_approved_own_or_admin" on public.workshop_reviews;
create policy "workshop_reviews_select_approved_own_or_admin"
on public.workshop_reviews
for select
using (status = 'approved' or auth.uid() = user_id or public.is_admin());

drop policy if exists "workshop_reviews_insert_own" on public.workshop_reviews;
create policy "workshop_reviews_insert_own"
on public.workshop_reviews
for insert
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "workshop_reviews_update_own_pending" on public.workshop_reviews;
create policy "workshop_reviews_update_own_pending"
on public.workshop_reviews
for update
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "workshop_reviews_admin_all" on public.workshop_reviews;
create policy "workshop_reviews_admin_all"
on public.workshop_reviews
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "review_invites_admin_all" on public.review_invites;
create policy "review_invites_admin_all"
on public.review_invites
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "site_products_public_select_active" on public.site_products;
create policy "site_products_public_select_active"
on public.site_products
for select
using (is_active = true or public.is_admin());

drop policy if exists "site_products_admin_all" on public.site_products;
create policy "site_products_admin_all"
on public.site_products
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workshop_classes_public_select_active" on public.workshop_classes;
create policy "workshop_classes_public_select_active"
on public.workshop_classes
for select
using (is_active = true or public.is_admin());

drop policy if exists "workshop_classes_admin_all" on public.workshop_classes;
create policy "workshop_classes_admin_all"
on public.workshop_classes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_images_public_select" on storage.objects;
create policy "admin_images_public_select"
on storage.objects
for select
using (bucket_id = 'admin-images');

drop policy if exists "admin_images_admin_insert" on storage.objects;
create policy "admin_images_admin_insert"
on storage.objects
for insert
with check (bucket_id = 'admin-images' and public.is_admin());

drop policy if exists "admin_images_admin_update" on storage.objects;
create policy "admin_images_admin_update"
on storage.objects
for update
using (bucket_id = 'admin-images' and public.is_admin())
with check (bucket_id = 'admin-images' and public.is_admin());

drop policy if exists "admin_images_admin_delete" on storage.objects;
create policy "admin_images_admin_delete"
on storage.objects
for delete
using (bucket_id = 'admin-images' and public.is_admin());
