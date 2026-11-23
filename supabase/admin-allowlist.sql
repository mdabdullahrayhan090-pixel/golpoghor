-- Golpoghor: only the designated owner account can hold the Admin role.
-- Run this once in Supabase SQL Editor.

create or replace function public.enforce_golpoghor_admin_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  account_email text;
begin
  if new.role = 'admin' then
    select lower(email) into account_email
    from auth.users
    where id = new.id;

    if coalesce(account_email, '') <> 'baginam674@gmail.com' then
      raise exception 'Only the designated owner account can have the admin role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_golpoghor_admin_allowlist_trigger on public.profiles;
create trigger enforce_golpoghor_admin_allowlist_trigger
before insert or update of role on public.profiles
for each row execute function public.enforce_golpoghor_admin_allowlist();

-- Demote any other accounts that currently have Admin.
update public.profiles p
set role = 'reader'
from auth.users u
where p.id = u.id
  and lower(u.email) <> 'baginam674@gmail.com'
  and p.role = 'admin';
