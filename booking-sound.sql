begin;
alter table public.bookings add column admin_seen boolean not null default false;
grant update (admin_seen) on public.bookings to authenticated;
create policy husman_booking_seen_update on public.bookings for update to authenticated using (public.is_restaurant_admin()) with check (public.is_restaurant_admin());
commit;
