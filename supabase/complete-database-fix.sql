-- গল্পঘর: complete, repeatable database setup for story analytics and ad settings
-- Run in Supabase SQL Editor as the project owner.

create extension if not exists pgcrypto;

-- Existing installations may have created a simpler story_views table already.
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  view_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);

alter table public.story_views
  add column if not exists view_date date
    not null default (now() at time zone 'utc')::date,
  add column if not exists created_at timestamptz
    not null default now();

create index if not exists story_views_story_idx
  on public.story_views(story_id);

-- Remove duplicate daily rows before enforcing the one-view-per-day rule.
with duplicates as (
  select id,
         row_number() over (
           partition by story_id, viewer_id, view_date
           order by created_at, id
         ) as row_num
  from public.story_views
  where viewer_id is not null
)
delete from public.story_views
where id in (select id from duplicates where row_num > 1);

create unique index if not exists story_views_story_viewer_date_key
  on public.story_views(story_id, viewer_id, view_date)
  where viewer_id is not null;

alter table public.story_views enable row level security;
drop policy if exists "authors and admins read relevant views" on public.story_views;
create policy "authors and admins read relevant views"
on public.story_views for select to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.stories s
    where s.id = story_id and s.author_id = auth.uid()
  )
);

create or replace function public.record_story_view(p_story_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  if not exists (
    select 1 from public.stories
    where id = p_story_id and status = 'published'
  ) then
    return false;
  end if;

  insert into public.story_views(story_id, viewer_id, view_date)
  values (p_story_id, auth.uid(), (now() at time zone 'utc')::date)
  on conflict (story_id, viewer_id, view_date)
    where viewer_id is not null
  do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function public.record_story_view(uuid) from public;
grant execute on function public.record_story_view(uuid) to authenticated;

create table if not exists public.platform_settings (
  id integer primary key default 1 check (id = 1),
  rate_bdt_per_1000_views numeric(12,2) not null default 0
    check (rate_bdt_per_1000_views >= 0),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(id, rate_bdt_per_1000_views)
values (1, 0) on conflict (id) do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists "settings readable" on public.platform_settings;
drop policy if exists "admins manage settings" on public.platform_settings;
create policy "settings readable" on public.platform_settings
for select to authenticated using (true);
create policy "admins manage settings" on public.platform_settings
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create table if not exists public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  placement text not null
    check (placement in ('before_story', 'in_story', 'after_story')),
  title text not null default 'স্পন্সর',
  target_url text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ad_slots enable row level security;
drop policy if exists "enabled ads are public" on public.ad_slots;
drop policy if exists "admins manage ad slots" on public.ad_slots;
create policy "enabled ads are public" on public.ad_slots
for select to anon, authenticated using (enabled = true);
create policy "admins manage ad slots" on public.ad_slots
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create table if not exists public.ad_network_settings (
  id integer primary key default 1 check (id = 1),
  home_enabled boolean not null default false,
  home_code text not null default '',
  story_enabled boolean not null default false,
  story_code text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.ad_network_settings(id)
values (1) on conflict (id) do nothing;
alter table public.ad_network_settings enable row level security;
drop policy if exists "admins manage ad network settings" on public.ad_network_settings;
create policy "admins manage ad network settings"
on public.ad_network_settings for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- SQL privileges are separate from RLS policies; both are required.
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.stories to authenticated;
grant select on public.story_views to authenticated;
grant select, insert, update, delete on public.ad_slots to authenticated;
grant select, insert, update, delete on public.ad_network_settings to authenticated;
grant select, insert, update, delete on public.platform_settings to authenticated;
