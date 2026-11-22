-- গল্পঘর: view analytics, author revenue estimates and compliant ad slots
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  view_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique(story_id, viewer_id, view_date)
);
create index if not exists story_views_story_idx on public.story_views(story_id);
alter table public.story_views enable row level security;
drop policy if exists "authors and admins read relevant views" on public.story_views;
create policy "authors and admins read relevant views" on public.story_views
for select to authenticated using (
  public.current_user_role() = 'admin'
  or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
);
create or replace function public.record_story_view(p_story_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted_count integer;
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from public.stories where id=p_story_id and status='published') then return false; end if;
  insert into public.story_views(story_id,viewer_id,view_date)
  values(p_story_id,auth.uid(),(now() at time zone 'utc')::date)
  on conflict (story_id,viewer_id,view_date) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end; $$;
revoke all on function public.record_story_view(uuid) from public;
grant execute on function public.record_story_view(uuid) to authenticated;

create table if not exists public.platform_settings (
  id integer primary key default 1 check (id=1),
  rate_bdt_per_1000_views numeric(12,2) not null default 0 check(rate_bdt_per_1000_views>=0),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(id,rate_bdt_per_1000_views)
values(1,0) on conflict(id) do nothing;
alter table public.platform_settings enable row level security;
drop policy if exists "settings readable" on public.platform_settings;
drop policy if exists "admins manage settings" on public.platform_settings;
create policy "settings readable" on public.platform_settings for select using (true);
create policy "admins manage settings" on public.platform_settings for all to authenticated
using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

create table if not exists public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  placement text not null check(placement in ('before_story','in_story','after_story')),
  title text not null default 'স্পন্সর',
  target_url text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ad_slots enable row level security;
drop policy if exists "enabled ads are public" on public.ad_slots;
drop policy if exists "admins manage ad slots" on public.ad_slots;
create policy "enabled ads are public" on public.ad_slots for select using(enabled=true);
create policy "admins manage ad slots" on public.ad_slots for all to authenticated
using(public.current_user_role()='admin') with check(public.current_user_role()='admin');
