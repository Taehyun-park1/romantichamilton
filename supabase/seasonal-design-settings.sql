create table if not exists public.site_design_settings (
  id text primary key default 'active',
  preset_id text not null default 'default'
    check (preset_id in ('default', 'chuseok', 'christmas', 'seollal', 'valentine')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_design_settings (
  id,
  preset_id
)
values (
  'active',
  'default'
)
on conflict (id) do nothing;

alter table public.site_design_settings enable row level security;

drop policy if exists "site_design_settings_public_select" on public.site_design_settings;
create policy "site_design_settings_public_select"
on public.site_design_settings
for select
using (id = 'active');

drop policy if exists "site_design_settings_admin_all" on public.site_design_settings;
create policy "site_design_settings_admin_all"
on public.site_design_settings
for all
using (public.is_admin())
with check (public.is_admin());
