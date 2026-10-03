-- Run together with the verified native release, not before the owner can sign in.
-- Inside this transaction set husman.owner_email to the verified existing Auth email.
-- No customer rows are modified. Existing unauthenticated admin builds lose access.
begin;

create schema if not exists husman_private;
revoke all on schema husman_private from public, anon, authenticated;
create table if not exists husman_private.restaurant_admins (
  user_id uuid primary key references auth.users(id)
);
revoke all on husman_private.restaurant_admins from public, anon, authenticated;

do $$
declare owner_email text := nullif(current_setting('husman.owner_email', true), '');
        owner_id uuid;
begin
  if owner_email is null then raise exception 'Verified owner email must be supplied'; end if;
  if (select count(*) from auth.users where lower(email)=lower(owner_email)
      and email_confirmed_at is not null and encrypted_password <> '') <> 1 then
    raise exception 'Exactly one confirmed password-based owner Auth account is required';
  end if;
  select id into owner_id from auth.users where lower(email)=lower(owner_email);
  if exists(select 1 from husman_private.restaurant_admins where user_id<>owner_id) then
    raise exception 'Existing admin differs; review authorization before changing it';
  end if;
  insert into husman_private.restaurant_admins(user_id) values(owner_id)
    on conflict(user_id) do nothing;
  if exists(select 1 from pg_policies where schemaname='public'
    and tablename in ('menu_items','orders','bookings')
    and policyname not in ('Public create orders','Public delete orders',
      'Public read orders','Public update orders','Public insert menu',
      'Public read menu','Public update menu','Public create bookings',
      'Public read bookings','husman_menu_read','husman_menu_insert',
      'husman_menu_update','husman_order_create','husman_order_read',
      'husman_order_update','husman_order_delete','husman_booking_create',
      'husman_booking_read')) then
    raise exception 'Unexpected policies exist; review before replacing authorization';
  end if;
end $$;

create or replace function public.is_restaurant_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from husman_private.restaurant_admins
  where user_id=(select auth.uid())) $$;
revoke all on function public.is_restaurant_admin() from public, anon;
grant execute on function public.is_restaurant_admin() to authenticated;

alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.bookings enable row level security;
revoke all on public.menu_items, public.orders, public.bookings from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update on public.menu_items to authenticated;
grant insert on public.orders, public.bookings to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant select on public.bookings to authenticated;

-- Preserve only the sequence usage needed by the identity inserts.
do $$ declare seq text; t text; begin
  foreach t in array array['menu_items','orders','bookings'] loop
    seq:=pg_get_serial_sequence('public.'||t,'id');
    if seq is not null then
      execute format('revoke all on sequence %s from anon, authenticated',seq);
      execute format('grant usage on sequence %s to authenticated',seq);
      if t<>'menu_items' then
        execute format('grant usage on sequence %s to anon',seq);
      end if;
    end if;
  end loop;
end $$;

do $$ declare p record; begin
  for p in select tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('menu_items','orders','bookings') loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;

-- Menu has no customer details. Include inactive rows to preserve empty sections
-- and the administrator's optimistic-concurrency snapshot.
create policy husman_menu_read on public.menu_items for select to anon,authenticated using(true);
create policy husman_menu_insert on public.menu_items for insert to authenticated
  with check((select public.is_restaurant_admin()));
create policy husman_menu_update on public.menu_items for update to authenticated
  using((select public.is_restaurant_admin())) with check((select public.is_restaurant_admin()));
create policy husman_order_create on public.orders for insert to anon,authenticated
  with check(status='Ny' and length(btrim(customer_name))>0 and length(btrim(phone))>0
    and pickup_date is not null and length(btrim(pickup_time))>0
    and jsonb_typeof(items)='array' and jsonb_array_length(items)>0 and total>0);
create policy husman_order_read on public.orders for select to authenticated
  using((select public.is_restaurant_admin()));
create policy husman_order_update on public.orders for update to authenticated
  using((select public.is_restaurant_admin())) with check((select public.is_restaurant_admin()));
create policy husman_order_delete on public.orders for delete to authenticated
  using((select public.is_restaurant_admin()) and status='Maten färdig');
create policy husman_booking_create on public.bookings for insert to anon,authenticated
  with check(status='Ny' and length(btrim(customer_name))>0 and length(btrim(phone))>0
    and booking_date is not null and length(btrim(booking_time))>0 and guests>0);
create policy husman_booking_read on public.bookings for select to authenticated
  using((select public.is_restaurant_admin()));
commit;
