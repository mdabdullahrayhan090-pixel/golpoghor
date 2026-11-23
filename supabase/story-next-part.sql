-- গল্পঘর: add optional next-part URL to stories
alter table public.stories
  add column if not exists next_part_url text;

comment on column public.stories.next_part_url is
  'Optional URL to the next part of this story';
