begin;
create table public.lunch_draw_settings (
  id boolean primary key default true check(id),
  enabled boolean not null default false,
  frequency text not null default 'weekly' check(frequency in ('weekly','weekdays'))
);
insert into public.lunch_draw_settings(id) values(true);
create table public.lunch_draw_rounds (
  id uuid primary key default gen_random_uuid(),
  frequency text not null check(frequency in ('weekly','weekdays')),
  opens_at timestamptz not null,
  closes_at timestamptz not null unique,
  winner_entry uuid,
  drawn_at timestamptz,
  prize_code uuid not null default gen_random_uuid(),
  valid_from date,
  valid_until date,
  redeemed_at timestamptz,
  announced_at timestamptz
);
create table public.lunch_draw_entries (
  receipt uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.lunch_draw_rounds(id),
  name text not null check(char_length(name) between 2 and 80),
  phone text not null check(phone ~ '^\+[1-9][0-9]{7,14}$'),
  public_first_name boolean not null default false,
  rules_version text not null default 'lunch-v1',
  created_at timestamptz not null default now(),
  unique(round_id,phone)
);
alter table public.lunch_draw_settings enable row level security;
alter table public.lunch_draw_rounds enable row level security;
alter table public.lunch_draw_entries enable row level security;
revoke all on public.lunch_draw_settings, public.lunch_draw_rounds, public.lunch_draw_entries from anon, authenticated;

-- No raw participant lists, phone numbers, receipts or prize codes are public.
create function public.lunch_draw_current() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.lunch_draw_settings; r public.lunch_draw_rounds; d date;
  local_now timestamp := now() at time zone 'Europe/Stockholm';
begin
  select * into s from public.lunch_draw_settings where id for update;
  if not s.enabled then return jsonb_build_object('enabled',false); end if;
  select * into r from public.lunch_draw_rounds where closes_at>now() and drawn_at is null order by closes_at limit 1;
  if not found then
    if s.frequency='weekly' then
      d := date_trunc('week',local_now)::date;
      if local_now >= d+interval '4 days 13 hours' then d:=d+7; end if;
      insert into public.lunch_draw_rounds(frequency,opens_at,closes_at)
      values(s.frequency,d::timestamp at time zone 'Europe/Stockholm',(d+interval '4 days 13 hours') at time zone 'Europe/Stockholm')
      on conflict(closes_at) do nothing;
    else
      d:=local_now::date;
      if local_now::time >= time '13:00' then d:=d+1; end if;
      while extract(isodow from d)>5 loop d:=d+1; end loop;
      insert into public.lunch_draw_rounds(frequency,opens_at,closes_at)
      values(s.frequency,d::timestamp at time zone 'Europe/Stockholm',(d+time '13:00') at time zone 'Europe/Stockholm')
      on conflict(closes_at) do nothing;
    end if;
    select * into r from public.lunch_draw_rounds where closes_at>now() and drawn_at is null order by closes_at limit 1;
  end if;
  return jsonb_build_object('enabled',true,'id',r.id,'frequency',r.frequency,'opens_at',r.opens_at,'closes_at',r.closes_at);
end $$;

create function public.enter_lunch_draw(p_round uuid,p_name text,p_phone text,p_public_name boolean,p_rules text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.lunch_draw_rounds; phone_value text; receipt_value uuid;
begin
  if p_rules is distinct from 'lunch-v1' then raise exception 'Godkänn tävlingsreglerna.'; end if;
  if not exists(select 1 from public.lunch_draw_settings where id and enabled) then raise exception 'Tävlingen är pausad.'; end if;
  select * into r from public.lunch_draw_rounds where id=p_round for update;
  if not found or r.drawn_at is not null or now()<r.opens_at or now()>=r.closes_at then raise exception 'Omgången är stängd. Uppdatera och försök igen.'; end if;
  phone_value:=regexp_replace(trim(p_phone),'[ ()-]','','g');
  if phone_value like '0046%' then phone_value:='+'||substr(phone_value,3);
  elsif phone_value like '0%' then phone_value:='+46'||substr(phone_value,2); end if;
  if phone_value !~ '^\+[1-9][0-9]{7,14}$' or char_length(trim(p_name)) not between 2 and 80 then raise exception 'Kontrollera namn och telefonnummer.'; end if;
  insert into public.lunch_draw_entries(round_id,name,phone,public_first_name)
  values(p_round,trim(p_name),phone_value,coalesce(p_public_name,false)) returning receipt into receipt_value;
  return receipt_value;
exception when unique_violation then raise exception 'Telefonnumret deltar redan i denna omgång.';
end $$;

create function public.my_lunch_draw(p_receipt uuid) returns jsonb
language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('round_id',r.id,'drawn',r.drawn_at is not null,'winner',r.winner_entry=e.receipt,
 'prize_code',case when r.winner_entry=e.receipt then r.prize_code end,
 'valid_from',r.valid_from,'valid_until',r.valid_until,'redeemed',r.redeemed_at is not null)
 from public.lunch_draw_entries e join public.lunch_draw_rounds r on r.id=e.round_id where e.receipt=p_receipt;
$$;

create function public.manage_lunch_draw(p_action text,p_round uuid default null,p_frequency text default null,p_enabled boolean default null,p_code uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.lunch_draw_rounds; e public.lunch_draw_entries; n bigint; result jsonb;
  local_now timestamp:=now() at time zone 'Europe/Stockholm';
begin
  if not coalesce(public.is_restaurant_admin(),false) then raise exception 'Ägarbehörighet krävs.'; end if;
  if p_action='settings' then
    if p_frequency is not null and p_frequency not in ('weekly','weekdays') then raise exception 'Ogiltig frekvens.'; end if;
    update public.lunch_draw_settings set frequency=coalesce(p_frequency,frequency),enabled=coalesce(p_enabled,enabled) where id;
  elsif p_action in ('draw','redeem','announced') then
    select * into r from public.lunch_draw_rounds where id=p_round for update;
    if not found then raise exception 'Omgången saknas.'; end if;
    if p_action='draw' and r.drawn_at is null then
      if now()<r.closes_at then raise exception 'Deltagandet är fortfarande öppet.'; end if;
      select * into e from public.lunch_draw_entries where round_id=r.id order by random() limit 1;
      if not found then raise exception 'Inga deltagare i denna omgång.'; end if;
      update public.lunch_draw_rounds set winner_entry=e.receipt,drawn_at=now(),
        valid_from=date_trunc('week',r.closes_at at time zone 'Europe/Stockholm')::date+7,
        valid_until=date_trunc('week',r.closes_at at time zone 'Europe/Stockholm')::date+11 where id=r.id;
    elsif p_action='redeem' then
      if r.winner_entry is null or p_code is distinct from r.prize_code then raise exception 'Fel vinstkod.'; end if;
      if r.redeemed_at is not null then raise exception 'Vinsten är redan använd.'; end if;
      if local_now::date not between r.valid_from and r.valid_until or extract(isodow from local_now)>5 or local_now::time<time '09:00' or local_now::time>=time '14:00' then raise exception 'Vinsten gäller under angiven vecka, vardagar kl. 09–14.'; end if;
      update public.lunch_draw_rounds set redeemed_at=now() where id=r.id;
    elsif p_action='announced' then
      if r.winner_entry is null then raise exception 'Dra vinnaren först.'; end if;
      update public.lunch_draw_rounds set announced_at=coalesce(announced_at,now()) where id=r.id;
    end if;
  elsif p_action<>'list' then raise exception 'Okänd åtgärd.'; end if;
  -- Start the next available round without altering an already advertised round.
  perform public.lunch_draw_current();
  select jsonb_build_object('settings',(select to_jsonb(s) from public.lunch_draw_settings s where id),
    'rounds',coalesce(jsonb_agg(x order by x.closes_at desc),'[]'::jsonb)) into result
  from (select rr.id,rr.frequency,rr.opens_at,rr.closes_at,rr.drawn_at,rr.prize_code,rr.valid_from,rr.valid_until,rr.redeemed_at,rr.announced_at,
      ee.name as winner_name,ee.phone as winner_phone,ee.public_first_name,
      (select count(*) from public.lunch_draw_entries where round_id=rr.id) as entry_count
    from public.lunch_draw_rounds rr left join public.lunch_draw_entries ee on ee.receipt=rr.winner_entry
    order by rr.closes_at desc limit 20) x;
  return result;
end $$;
revoke all on function public.lunch_draw_current(),public.enter_lunch_draw(uuid,text,text,boolean,text),public.my_lunch_draw(uuid),public.manage_lunch_draw(text,uuid,text,boolean,uuid) from public;
grant execute on function public.lunch_draw_current(),public.enter_lunch_draw(uuid,text,text,boolean,text),public.my_lunch_draw(uuid) to anon,authenticated;
grant execute on function public.manage_lunch_draw(text,uuid,text,boolean,uuid) to authenticated;
commit;
