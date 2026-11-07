-- Preserve existing bookings. Only new requests and rescheduled requests are validated.
begin;
create or replace function public.validate_booking_hours()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare requested_at timestamp; is_event boolean;
begin
  is_event := split_part(coalesce(new.message, ''), E'\n', 1) = 'Catering och festlokal';
  if new.booking_date is null or new.booking_time is null then
    raise exception 'BOOKING_TIME_INVALID: Datum och tid krävs.' using errcode = '22023';
  end if;
  requested_at := new.booking_date::date + new.booking_time::time;
  if not isfinite(requested_at) or requested_at <= (clock_timestamp() at time zone 'Europe/Stockholm') then
    raise exception 'BOOKING_TIME_INVALID: Datumet eller tiden har passerat.' using errcode = '22023';
  end if;
  if not is_event and (extract(isodow from requested_at) in (6,7)
      or requested_at::time < time '08:00' or requested_at::time >= time '14:00') then
    raise exception 'BOOKING_CLOSED: Bord kan bokas måndag–fredag 08:00–14:00, före stängning.' using errcode = '22023';
  end if;
  return new;
end; $$;
drop trigger if exists validate_booking_hours on public.bookings;
create trigger validate_booking_hours before insert or update of booking_date, booking_time, message
on public.bookings for each row execute function public.validate_booking_hours();

-- Catering and party requests are accepted even when the lunch restaurant is closed.
create or replace function public.reject_closed_restaurant_date()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_date date;
begin
  if tg_table_name = 'orders' then
    requested_date := new.pickup_date::date;
  elsif tg_table_name = 'bookings' then
    if split_part(coalesce(new.message, ''), E'\n', 1) = 'Catering och festlokal' then return new; end if;
    requested_date := new.booking_date::date;
  else raise exception 'Unsupported closure guard table'; end if;
  if exists (select 1 from public.restaurant_closures where requested_date between start_date and end_date) then
    raise exception 'RESTAURANT_CLOSED: Restaurangen är stängd det datumet.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
revoke all on function public.reject_closed_restaurant_date() from public, anon, authenticated;
drop trigger if exists bookings_reject_closed_date on public.bookings;
create trigger bookings_reject_closed_date before insert or update of booking_date, message
on public.bookings for each row execute function public.reject_closed_restaurant_date();
commit;
