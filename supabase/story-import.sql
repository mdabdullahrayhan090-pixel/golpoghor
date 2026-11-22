-- গল্পঘর: external source URL for imported stories
alter table public.stories add column if not exists source_url text;
