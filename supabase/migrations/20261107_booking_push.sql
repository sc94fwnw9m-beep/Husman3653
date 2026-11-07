begin;
create table if not exists husman_private.owner_booking_push_requests (
 id bigint generated always as identity primary key,
 request_id bigint,
 booking_id text not null,
 queue_error text,
 created_at timestamptz not null default now()
);
alter table husman_private.owner_booking_push_requests enable row level security;
revoke all on husman_private.owner_booking_push_requests from public, anon, authenticated;
create or replace function husman_private.send_owner_booking_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare device record; request_id bigint; is_event boolean;
begin
 if coalesce(new.status, 'Ny') <> 'Ny' then return new; end if;
 is_event := split_part(coalesce(new.message, ''), E'\n', 1) = 'Catering och festlokal';
 for device in
  select distinct d.token from husman_private.owner_push_devices d
  join husman_private.restaurant_admins a on a.user_id = d.user_id
 loop
  begin
   select net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
     'to', device.token,
     'title', case when is_event then 'Ny förfrågan: Fest & Catering!' else 'Ny bordsbokning!' end,
     'body', case when is_event then 'Förfrågan #' else 'Bokning #' end || new.id::text || '. Öppna appen och logga in för att se förfrågan.',
     'sound', 'default', 'priority', 'high', 'channelId', 'owner-orders', 'ttl', 3600,
     'data', jsonb_build_object('type', case when is_event then 'owner-event' else 'owner-booking' end, 'bookingId', new.id::text)
    ), timeout_milliseconds := 5000
   ) into request_id;
   insert into husman_private.owner_booking_push_requests(request_id, booking_id) values(request_id, new.id::text);
  exception when others then
   insert into husman_private.owner_booking_push_requests(booking_id, queue_error) values(new.id::text, sqlstate);
  end;
 end loop;
 return new;
end; $$;
revoke all on function husman_private.send_owner_booking_push() from public, anon, authenticated;
drop trigger if exists husman_owner_booking_push on public.bookings;
create trigger husman_owner_booking_push after insert on public.bookings
 for each row execute function husman_private.send_owner_booking_push();
commit;
