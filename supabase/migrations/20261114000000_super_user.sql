-- Super user: an administrator with one extra power, deciding who else is an administrator.
alter table public.profiles add column if not exists is_superuser boolean not null default false;

create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_superuser);
$$;
revoke all on function public.is_superuser() from public, anon;
grant execute on function public.is_superuser() to authenticated;

-- Roles: admins manage tenants, students and owners; only the super user adds or removes administrators.
-- The super user flag itself can only be set from the database, never from the app.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or auth.uid() is null then
    return new;
  end if;
  if new.is_superuser is distinct from old.is_superuser then
    raise exception 'The super user can only be changed by Rentpply support.';
  end if;
  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Only an administrator can change account roles';
    end if;
    if (old.role = 'admin' or new.role = 'admin') and not public.is_superuser() then
      raise exception 'Only the super user can add or remove administrators.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_change on public.profiles;
create trigger protect_profile_role_change
before update of role, is_superuser on public.profiles
for each row execute function public.protect_profile_role();
