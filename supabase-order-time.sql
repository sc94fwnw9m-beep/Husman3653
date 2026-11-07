-- Apply in the Husman Supabase SQL editor before releasing the client update.
-- Existing orders and status updates are preserved. No permissions are changed.
begin;
create or replace function public.validate_order_pickup_time()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  requested_at timestamp;
begin
  if new.pickup_date is null or new.pickup_time is null then
    raise exception 'ORDER_TIME_INVALID: Datum och tid krävs.' using errcode = '22023';
  end if;
  begin
    requested_at := new.pickup_date::date + new.pickup_time::time;
  exception when others then
    raise exception 'ORDER_TIME_INVALID: Ogiltigt datum eller tid.' using errcode = '22023';
  end;
  if not isfinite(requested_at) or requested_at <= (clock_timestamp() at time zone 'Europe/Stockholm') then
    raise exception 'ORDER_TIME_INVALID: Datumet eller tiden har passerat.' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_order_pickup_time on public.orders;
create trigger validate_order_pickup_time
before insert or update of pickup_date, pickup_time on public.orders
for each row execute function public.validate_order_pickup_time();
commit;
