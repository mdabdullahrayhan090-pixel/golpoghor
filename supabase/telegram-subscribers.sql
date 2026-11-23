-- গল্পঘর Telegram notification subscribers
create table if not exists public.telegram_subscribers (
  chat_id bigint primary key,
  user_id bigint not null,
  username text,
  first_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_subscribers enable row level security;
revoke all on table public.telegram_subscribers from anon, authenticated;
grant all on table public.telegram_subscribers to service_role;
