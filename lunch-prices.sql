begin;
create table public.husman_lunch_prices (
  id integer primary key check (id = 1),
  dine_in numeric not null check (dine_in > 0 and dine_in <= 10000),
  takeaway numeric not null check (takeaway > 0 and takeaway <= 10000),
  box_only numeric not null check (box_only > 0 and box_only <= 10000)
);
insert into public.husman_lunch_prices values (1, 139, 129, 119);
alter table public.husman_lunch_prices enable row level security;
grant select on public.husman_lunch_prices to anon, authenticated;
grant update on public.husman_lunch_prices to authenticated;
create policy lunch_prices_read on public.husman_lunch_prices for select to anon, authenticated using (true);
create policy lunch_prices_owner_update on public.husman_lunch_prices for update to authenticated using (public.is_restaurant_admin()) with check (public.is_restaurant_admin());
commit;
