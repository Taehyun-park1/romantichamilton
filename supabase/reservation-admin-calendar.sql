create table if not exists public.reservation_blocked_dates (
  blocked_date date primary key,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservation_blocked_dates enable row level security;

drop policy if exists "reservation_blocked_dates_public_select" on public.reservation_blocked_dates;
create policy "reservation_blocked_dates_public_select"
on public.reservation_blocked_dates
for select
using (true);

drop policy if exists "reservation_blocked_dates_admin_all" on public.reservation_blocked_dates;
create policy "reservation_blocked_dates_admin_all"
on public.reservation_blocked_dates
for all
using (public.is_admin())
with check (public.is_admin());
