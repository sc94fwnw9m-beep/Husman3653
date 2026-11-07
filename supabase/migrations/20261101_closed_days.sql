-- Run in this app's Supabase SQL editor before publishing the update.
-- This migration does not add any closed dates or change existing menu data.
begin;

-- Reuse the app's existing private owner role; fail setup if it is absent.
do $$ begin
  if to_regprocedure('public.is_restaurant_admin()') is null then
    raise exception 'Existing owner authorization must be installed first';
  end if;
end $$;

create table if not exists public.restaurant_closures (
  id bigint generated always as identity primary key,
  start_date date not null,
  end_date date not null,
  message text not null default 'Stängt',
  created_at timestamptz not null default now(),
  constraint closure_dates_ordered check (end_date >= start_date),
  constraint closure_message_length check (length(btrim(message)) between 1 and 160)
);
alter table public.restaurant_closures enable row level security;
revoke all on public.restaurant_closures from anon, authenticated;
grant select on public.restaurant_closures to anon, authenticated;
grant insert, update, delete on public.restaurant_closures to authenticated;
grant usage, select on sequence public.restaurant_closures_id_seq to authenticated;

drop policy if exists "Public read closed days" on public.restaurant_closures;
create policy "Public read closed days" on public.restaurant_closures
  for select to anon, authenticated using (true);
drop policy if exists "Restaurant admins manage closed days" on public.restaurant_closures;
create policy "Restaurant admins manage closed days" on public.restaurant_closures
  for all to authenticated
  using ((select public.is_restaurant_admin()))
  with check ((select public.is_restaurant_admin()));

-- Guard old app versions as well as updates; a client-side check alone is insufficient.
create or replace function public.reject_closed_restaurant_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_date date;
begin
  if tg_table_name = 'orders' then
    requested_date := new.pickup_date::date;
  elsif tg_table_name = 'bookings' then
    requested_date := new.booking_date::date;
  else
    raise exception 'Unsupported closure guard table';
  end if;
  if exists (
    select 1 from public.restaurant_closures
    where requested_date between start_date and end_date
  ) then
    raise exception 'RESTAURANT_CLOSED: Restaurangen är stängd det datumet.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.reject_closed_restaurant_date() from public, anon, authenticated;

drop trigger if exists orders_reject_closed_date on public.orders;
create trigger orders_reject_closed_date
  before insert or update of pickup_date on public.orders
  for each row execute function public.reject_closed_restaurant_date();
drop trigger if exists bookings_reject_closed_date on public.bookings;
create trigger bookings_reject_closed_date
  before insert or update of booking_date on public.bookings
  for each row execute function public.reject_closed_restaurant_date();

-- Polling/foreground refresh remains the fallback when Realtime is not enabled.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'restaurant_closures') then
    alter publication supabase_realtime add table public.restaurant_closures;
  end if;
end $$;
commit;

