-- Run this file in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 role text not null default 'reader' check (role in ('reader','author','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.stories (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null, category text default 'ছোটগল্প', excerpt text default '', content text not null,
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists stories_status_created_idx on public.stories(status,created_at desc);
create index if not exists stories_author_idx on public.stories(author_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','নতুন পাঠক')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.current_user_role() returns text language sql stable security definer set search_path=public as $$
 select role from public.profiles where id=auth.uid();
$$;
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
drop policy if exists "profiles visible to authenticated" on public.profiles;
drop policy if exists "profile owner can update name" on public.profiles;
drop policy if exists "published stories are public" on public.stories;
drop policy if exists "authors read own stories" on public.stories;
drop policy if exists "authors create own drafts" on public.stories;
drop policy if exists "authors update own drafts" on public.stories;
create policy "profiles visible to authenticated" on public.profiles for select to authenticated using (true);
create policy "profile owner can update name" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id and role=public.current_user_role());
create policy "published stories are public" on public.stories for select using (status='published');
create policy "authors read own stories" on public.stories for select to authenticated using (author_id=auth.uid() or public.current_user_role()='admin');
create policy "authors create own drafts" on public.stories for insert to authenticated with check (author_id=auth.uid() and status='draft');
create policy "authors update own drafts" on public.stories for update to authenticated using (author_id=auth.uid() and status='draft') with check (author_id=auth.uid() and status='draft');
create or replace function public.admin_publish_story(story_id uuid, publish boolean) returns void language plpgsql security definer set search_path=public as $$
begin if public.current_user_role() is distinct from 'admin' then raise exception 'Admin permission required'; end if; update public.stories set status=case when publish then 'published' else 'draft' end,updated_at=now() where id=story_id; end; $$;
revoke all on function public.admin_publish_story(uuid,boolean) from public;
grant execute on function public.admin_publish_story(uuid,boolean) to authenticated;
