begin;
create or replace function public.valid_restaurant_hours(value jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare h jsonb;
begin
 if jsonb_typeof(value) is distinct from 'array' then return false; end if;
 if jsonb_array_length(value) <> 7 then return false; end if;
 for h in select jsonb_array_elements(value) loop
  if jsonb_typeof(h->'closed') is distinct from 'boolean'
   or coalesce(h->>'open','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   or coalesce(h->>'close','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   or (not (h->>'closed')::boolean and h->>'open' >= h->>'close') then return false; end if;
 end loop;
 return true;
end $$;
create table if not exists public.restaurant_opening_hours (
 id integer primary key check(id=1),
 hours jsonb not null check(public.valid_restaurant_hours(hours)),
 notice text not null default '' check(length(notice)<=1000)
);
insert into public.restaurant_opening_hours(id,hours) values(1,
 '[{"closed":false,"open":"08:00","close":"14:00"},{"closed":false,"open":"08:00","close":"14:00"},{"closed":false,"open":"08:00","close":"14:00"},{"closed":false,"open":"08:00","close":"14:00"},{"closed":false,"open":"08:00","close":"14:00"},{"closed":true,"open":"08:00","close":"14:00"},{"closed":true,"open":"08:00","close":"14:00"}]'::jsonb)
 on conflict(id) do nothing;
alter table public.restaurant_opening_hours enable row level security;
revoke all on public.restaurant_opening_hours from anon,authenticated;
grant select on public.restaurant_opening_hours to anon,authenticated;
grant update(hours,notice) on public.restaurant_opening_hours to authenticated;
drop policy if exists "Public opening hours" on public.restaurant_opening_hours;
create policy "Public opening hours" on public.restaurant_opening_hours for select to anon,authenticated using(true);
drop policy if exists "Owner updates opening hours" on public.restaurant_opening_hours;
create policy "Owner updates opening hours" on public.restaurant_opening_hours for update to authenticated
 using((select public.is_restaurant_admin())) with check((select public.is_restaurant_admin()));

create or replace function public.restaurant_time_is_open(requested_at timestamp, is_table boolean default false)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare h jsonb;
begin
 select hours->(extract(isodow from requested_at)::integer-1) into h
 from public.restaurant_opening_hours where id=1;
 if h is null or (h->>'closed')::boolean then return false; end if;
 return requested_at::time >= (h->>'open')::time
  and (case when is_table then requested_at::time < (h->>'close')::time
       else requested_at::time <= (h->>'close')::time end);
end $$;
revoke all on function public.restaurant_time_is_open(timestamp,boolean) from public,anon,authenticated;

create or replace function public.validate_order_pickup_time()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_at timestamp;
begin
 if new.pickup_date is null or new.pickup_time is null then
  raise exception 'ORDER_TIME_INVALID: Datum och tid krävs.' using errcode='22023'; end if;
 requested_at := new.pickup_date::date + new.pickup_time::time;
 if not isfinite(requested_at) or requested_at <= (clock_timestamp() at time zone 'Europe/Stockholm') then
  raise exception 'ORDER_TIME_INVALID: Datumet eller tiden har passerat.' using errcode='22023'; end if;
 if not public.restaurant_time_is_open(requested_at,false) then
  raise exception 'ORDER_CLOSED: Välj en tid inom restaurangens aktuella öppettider.' using errcode='22023'; end if;
 return new;
end $$;
create or replace function public.validate_booking_hours()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_at timestamp; is_event boolean;
begin
 is_event := split_part(coalesce(new.message,''), E'\n',1)='Catering och festlokal';
 if new.booking_date is null or new.booking_time is null then
  raise exception 'BOOKING_TIME_INVALID: Datum och tid krävs.' using errcode='22023'; end if;
 requested_at := new.booking_date::date + new.booking_time::time;
 if not isfinite(requested_at) or requested_at <= (clock_timestamp() at time zone 'Europe/Stockholm') then
  raise exception 'BOOKING_TIME_INVALID: Datumet eller tiden har passerat.' using errcode='22023'; end if;
 if not is_event and not public.restaurant_time_is_open(requested_at,true) then
  raise exception 'BOOKING_CLOSED: Välj en tid före stängning inom restaurangens aktuella öppettider.' using errcode='22023'; end if;
 return new;
end $$;
revoke all on function public.validate_order_pickup_time() from public,anon,authenticated;
revoke all on function public.validate_booking_hours() from public,anon,authenticated;
commit;
