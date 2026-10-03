-- Price settings only. Requires the existing, verified owner authorization function.
-- This migration intentionally does not change menu rows, orders, bookings or login.
begin;
do $$ begin
  if to_regprocedure('public.is_restaurant_admin()') is null then
    raise exception 'Verified owner authorization must be installed first';
  end if;
end $$;
create table public.order_type_prices (
  id integer primary key check (id=1),
  eat_here numeric(6,2) not null check(eat_here>0 and eat_here<=9999),
  takeaway numeric(6,2) not null check(takeaway>0 and takeaway<=9999),
  box numeric(6,2) not null check(box>0 and box<=9999),
  revision integer not null default 1 check(revision>0)
);
insert into public.order_type_prices(id,eat_here,takeaway,box) values(1,139,129,119);
alter table public.order_type_prices enable row level security;
revoke all on public.order_type_prices from public,anon,authenticated;
grant select on public.order_type_prices to anon,authenticated;
create policy prices_read on public.order_type_prices for select to anon,authenticated using(true);
create policy prices_owner_update on public.order_type_prices for update to authenticated
  using((select public.is_restaurant_admin())) with check((select public.is_restaurant_admin()));
-- Only the RPC can write, using an explicit owner check and fixed empty search_path.
create function public.set_order_type_prices(p_revision integer,p_eat_here numeric,p_takeaway numeric,p_box numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.order_type_prices;
begin
  if not coalesce(public.is_restaurant_admin(),false) then
    raise exception 'Owner authorization required' using errcode='42501';
  end if;
  if p_eat_here is null or p_takeaway is null or p_box is null
    or p_eat_here<=0 or p_eat_here>9999 or p_takeaway<=0 or p_takeaway>9999 or p_box<=0 or p_box>9999
    or p_eat_here<>round(p_eat_here,2) or p_takeaway<>round(p_takeaway,2) or p_box<>round(p_box,2) then
    raise exception 'Invalid prices' using errcode='22023';
  end if;
  update public.order_type_prices set eat_here=p_eat_here,takeaway=p_takeaway,box=p_box,revision=revision+1
    where id=1 and revision=p_revision returning * into result;
  if not found then raise exception 'Prices changed; reload before saving' using errcode='40001'; end if;
  return to_jsonb(result);
end $$;
revoke all on function public.set_order_type_prices(integer,numeric,numeric,numeric) from public,anon;
grant execute on function public.set_order_type_prices(integer,numeric,numeric,numeric) to authenticated;
commit;
