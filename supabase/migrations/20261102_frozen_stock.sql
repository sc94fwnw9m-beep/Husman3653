begin;
create table if not exists public.frozen_meal_stock (
  name text primary key check (length(btrim(name)) between 1 and 160),
  quantity integer not null check (quantity between 0 and 99999)
);
alter table public.frozen_meal_stock enable row level security;
revoke all on public.frozen_meal_stock from anon, authenticated;
grant select on public.frozen_meal_stock to anon, authenticated;
grant insert, update, delete on public.frozen_meal_stock to authenticated;
drop policy if exists frozen_stock_read on public.frozen_meal_stock;
create policy frozen_stock_read on public.frozen_meal_stock for select to anon,authenticated using(true);
drop policy if exists frozen_stock_owner on public.frozen_meal_stock;
create policy frozen_stock_owner on public.frozen_meal_stock for all to authenticated
using ((select public.is_restaurant_admin())) with check ((select public.is_restaurant_admin()));

create or replace function public.publish_frozen_menu_v1(
  p_items jsonb, p_expected jsonb, p_stock jsonb, p_expected_stock jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_stock jsonb; saved jsonb; dish jsonb;
begin
  if not coalesce(public.is_restaurant_admin(),false) or auth.uid() is null then
    raise exception 'Restaurant owner authorization required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)>20
    or p_stock is null or jsonb_typeof(p_stock)<>'object'
    or p_expected_stock is null or jsonb_typeof(p_expected_stock)<>'object' then
    raise exception 'Invalid frozen menu';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('husman:frozen-stock',0));
  select coalesce(jsonb_object_agg(name,quantity),'{}'::jsonb) into current_stock from public.frozen_meal_stock;
  if current_stock <> p_expected_stock then raise exception 'Stock changed elsewhere. Reload before saving.'; end if;
  if (select count(*) from jsonb_object_keys(p_stock)) <> jsonb_array_length(p_items)
    or (select count(distinct lower(btrim(value->>'name'))) from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then
    raise exception 'Invalid frozen stock names';
  end if;
  for dish in select value from jsonb_array_elements(p_items) loop
    if not (p_stock ? (dish->>'name')) or jsonb_typeof(p_stock->(dish->>'name')) is distinct from 'number'
      or (p_stock->>(dish->>'name')) !~ '^[0-9]{1,5}$' or (dish->>'price')::numeric <> 65 then
      raise exception 'Invalid frozen stock count or price';
    end if;
  end loop;
  saved := public.publish_menu_section_v1('Frysta matlådor','',p_items,p_expected);
  for dish in select value from jsonb_array_elements(p_items) loop
    insert into public.frozen_meal_stock(name,quantity)
      values (dish->>'name',(p_stock->>(dish->>'name'))::integer)
      on conflict(name) do update set quantity=excluded.quantity;
  end loop;
  -- Keep historical stock rows at zero, without deleting menu/order history.
  update public.frozen_meal_stock set quantity=0 where not (p_stock ? name);
  return saved;
end; $$;
revoke all on function public.publish_frozen_menu_v1(jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.publish_frozen_menu_v1(jsonb,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.consume_frozen_meal_stock()
returns trigger language plpgsql security definer set search_path='' as $$
declare bundle jsonb; dish jsonb; requested record; count_in_pack numeric; pack numeric; pack_price numeric;
begin
  if not exists(select 1 from jsonb_array_elements(new.items::jsonb) b where b->>'category'='Frysta matlådor') then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('husman:frozen-stock',0));
  for bundle in select value from jsonb_array_elements(new.items::jsonb) where value->>'category'='Frysta matlådor' loop
    if jsonb_typeof(bundle->'frozenItems') is distinct from 'array'
      or jsonb_typeof(bundle->'qty') is distinct from 'number' or (bundle->>'qty') !~ '^[1-9][0-9]{0,3}$'
      or jsonb_typeof(bundle->'frozenPack') is distinct from 'number'
      or (bundle->>'frozenPack') not in ('1','5','10') then
      raise exception 'FROZEN_STOCK: Välj matlådorna igen.';
    end if;
    pack := (bundle->>'frozenPack')::numeric;
    pack_price := case pack when 1 then 65 when 5 then 290 when 10 then 550 end;
    if jsonb_typeof(bundle->'price') is distinct from 'number' or (bundle->>'price')::numeric <> pack_price then
      raise exception 'FROZEN_STOCK: Ogiltigt paketpris.';
    end if;
    count_in_pack := 0;
    for dish in select value from jsonb_array_elements(bundle->'frozenItems') loop
      if jsonb_typeof(dish->'name') is distinct from 'string'
        or jsonb_typeof(dish->'qty') is distinct from 'number' or (dish->>'qty') !~ '^[1-9][0-9]?$'
        or not exists(select 1 from public.menu_items m where m.category='Frysta matlådor'
          and m.day='' and m.active is not false and m.name=dish->>'name') then
        raise exception 'FROZEN_STOCK: Maträtten är inte tillgänglig.';
      end if;
      count_in_pack := count_in_pack + (dish->>'qty')::numeric;
    end loop;
    if count_in_pack <> pack then raise exception 'FROZEN_STOCK: Fel antal i paketet.'; end if;
  end loop;
  -- Aggregate across every package and cart multiplier; one transaction rejects all on shortage.
  for requested in
    select d->>'name' as name, sum((d->>'qty')::numeric * (b->>'qty')::numeric) as quantity
    from jsonb_array_elements(new.items::jsonb) b
    cross join lateral jsonb_array_elements(b->'frozenItems') d
    where b->>'category'='Frysta matlådor' group by d->>'name' order by d->>'name'
  loop
    update public.frozen_meal_stock set quantity=quantity-requested.quantity::integer
      where name=requested.name and quantity>=requested.quantity;
    if not found then raise exception 'FROZEN_STOCK: Slut i lager eller för få lådor av %.',requested.name; end if;
  end loop;
  return new;
end; $$;
revoke all on function public.consume_frozen_meal_stock() from public,anon,authenticated;
drop trigger if exists orders_consume_frozen_stock on public.orders;
create trigger orders_consume_frozen_stock before insert on public.orders
for each row execute function public.consume_frozen_meal_stock();
commit;
