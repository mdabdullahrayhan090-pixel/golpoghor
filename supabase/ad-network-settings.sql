-- Ad network code settings for Golpoghor Admin Panel
create table if not exists public.ad_network_settings (
  id integer primary key default 1 check (id = 1),
  home_enabled boolean not null default false,
  home_code text not null default '',
  story_enabled boolean not null default false,
  story_code text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.ad_network_settings(id) values (1)
on conflict (id) do nothing;
alter table public.ad_network_settings enable row level security;
drop policy if exists "admins manage ad network settings" on public.ad_network_settings;
create policy "admins manage ad network settings"
on public.ad_network_settings for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
