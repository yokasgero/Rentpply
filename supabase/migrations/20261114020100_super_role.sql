-- The super user is now role 'super' instead of an administrator with a flag.
-- A super user can do everything an administrator can, and alone can add or remove administrators.

update public.profiles set role = 'super' where is_superuser;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super'));
$$;

create or replace function public.is_superuser()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super');
$$;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role then
    if old.role = 'super' or new.role = 'super' then
      raise exception 'The super user can only be changed by Rentpply support.';
    end if;
    if not public.is_admin() then
      raise exception 'Only an administrator can change account roles';
    end if;
    if (old.role = 'admin' or new.role = 'admin') and not public.is_superuser() then
      raise exception 'Only the super user can add or remove administrators.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_role_change on public.profiles;
alter table public.profiles drop column if exists is_superuser;
create trigger protect_profile_role_change before update of role on public.profiles
  for each row execute function public.protect_profile_role();
