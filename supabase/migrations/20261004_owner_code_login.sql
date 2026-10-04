-- Activate after the private owner-login endpoint is configured.
-- Inside this transaction set husman.owner_email to the verified existing Auth email.
-- No customer rows are modified. Existing unauthenticated admin builds lose access.
begin;
select set_config('husman.owner_email', 'messe_1980@hotmail.com', true);

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
      and email_confirmed_at is not null) <> 1 then
    raise exception 'Exactly one confirmed owner Auth account is required';
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

commit;

begin;
create schema if not exists husman_private;
revoke all on schema husman_private from public, anon, authenticated;
create table if not exists husman_private.owner_login_attempts (
  email text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table husman_private.owner_login_attempts enable row level security;
revoke all on husman_private.owner_login_attempts from public, anon, authenticated;
create or replace function public.owner_login_attempt_v1(p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
  -- Only the configured owner address is passed by the server. An atomic row
  -- update shares the five-attempt limit across workers and IP addresses.
  insert into husman_private.owner_login_attempts(email, window_start, attempts)
  values (lower(p_email), now(), 1)
  on conflict(email) do update set
    window_start = case when husman_private.owner_login_attempts.window_start <= now() - interval '15 minutes'
      then now() else husman_private.owner_login_attempts.window_start end,
    attempts = case when husman_private.owner_login_attempts.window_start <= now() - interval '15 minutes'
      then 1 else least(husman_private.owner_login_attempts.attempts + 1, 6) end
  returning attempts <= 5 into allowed;
  return allowed;
end $$;
revoke all on function public.owner_login_attempt_v1(text) from public, anon, authenticated;
grant execute on function public.owner_login_attempt_v1(text) to service_role;
create or replace function public.owner_login_account_v1(p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  return exists(select 1 from auth.users u
    join husman_private.restaurant_admins a on a.user_id = u.id
    where lower(u.email) = lower(p_email) and u.email_confirmed_at is not null);
end $$;
revoke all on function public.owner_login_account_v1(text) from public, anon, authenticated;
grant execute on function public.owner_login_account_v1(text) to service_role;
commit;
