create or replace function public.send_roommate_request(target_user uuid)
returns public.roommate_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  sender public.profiles%rowtype;
  recipient public.profiles%rowtype;
  request_row public.roommate_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if target_user = auth.uid() then raise exception 'You cannot request yourself'; end if;
  select * into sender from public.profiles where id = auth.uid();
  select * into recipient from public.profiles where id = target_user and role in ('tenant', 'student');
  if not found then raise exception 'This roommate profile is unavailable'; end if;
  if not exists (select 1 from public.roommate_profiles where user_id = target_user and is_verified) then
    raise exception 'This roommate profile is not available';
  end if;
  if exists (
    select 1 from public.roommate_requests
    where from_user_id = auth.uid() and to_user_id = target_user and status = 'pending'
  ) then raise exception 'You already sent a request to this person'; end if;

  insert into public.roommate_requests (from_user_id, to_user_id, status)
  values (auth.uid(), target_user, 'pending') returning * into request_row;

  insert into public.notifications (user_id, type, title, message, data)
  values (target_user, 'roommate_request', 'Roommate request', sender.full_name || ' would like to connect as a roommate.',
    jsonb_build_object('request_id', request_row.id, 'from_user_id', auth.uid()));
  return request_row;
end;
$$;

create or replace function public.respond_roommate_request(request_uuid uuid, accept_request boolean)
returns public.roommate_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.roommate_requests%rowtype;
  responder public.profiles%rowtype;
  next_status text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into request_row from public.roommate_requests
  where id = request_uuid and to_user_id = auth.uid() for update;
  if not found or request_row.status <> 'pending' then raise exception 'This roommate request is no longer pending'; end if;
  select * into responder from public.profiles where id = auth.uid();
  next_status := case when accept_request then 'accepted' else 'declined' end;
  update public.roommate_requests set status = next_status where id = request_uuid returning * into request_row;

  insert into public.notifications (user_id, type, title, message, data)
  values (request_row.from_user_id, 'roommate_' || next_status,
    case when accept_request then 'Roommate request accepted' else 'Roommate request declined' end,
    case when accept_request then responder.full_name || ' accepted your roommate request.' else responder.full_name || ' declined your roommate request.' end,
    jsonb_build_object('request_id', request_row.id, 'to_user_id', auth.uid()));
  return request_row;
end;
$$;

revoke all on function public.send_roommate_request(uuid) from public, anon;
grant execute on function public.send_roommate_request(uuid) to authenticated;
revoke all on function public.respond_roommate_request(uuid, boolean) from public, anon;
grant execute on function public.respond_roommate_request(uuid, boolean) to authenticated;
