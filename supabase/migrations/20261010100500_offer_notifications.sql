begin;

-- Offer consent is separate from order/booking notifications. No customer
-- phone numbers or order records are copied into this audience.
create table public.offer_subscriptions (
  push_token text primary key check (push_token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$'),
  enabled boolean not null default false,
  consent_version text not null default 'offers-v1',
  consent_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.offer_campaigns (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'sending' check (status in ('sending', 'completed', 'partial')),
  accepted integer not null default 0,
  failed integer not null default 0,
  uncertain integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.offer_push_tickets (
  id text primary key,
  campaign_id uuid not null references public.offer_campaigns(id),
  push_token text not null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);
create index offer_subscriptions_enabled on public.offer_subscriptions(push_token) where enabled;
create index offer_push_tickets_unchecked on public.offer_push_tickets(created_at) where not checked;

alter table public.offer_subscriptions enable row level security;
alter table public.offer_campaigns enable row level security;
alter table public.offer_push_tickets enable row level security;
revoke all on public.offer_subscriptions, public.offer_campaigns, public.offer_push_tickets from anon, authenticated;
grant all on public.offer_subscriptions, public.offer_campaigns, public.offer_push_tickets to service_role;

-- Only the Edge Function may claim an id. The lock prevents parallel sends
-- from bypassing the cooldown; retries of an existing id never send again.
create function public.claim_offer_campaign(p_id uuid, p_owner uuid, p_title text, p_body text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(10100525);
  if exists(select 1 from public.offer_campaigns where id = p_id) then
    return false;
  end if;
  if exists(select 1 from public.offer_campaigns where created_at > now() - interval '5 minutes') then
    raise exception 'OFFER_COOLDOWN';
  end if;
  insert into public.offer_campaigns(id, owner_id, title, body) values(p_id, p_owner, p_title, p_body);
  return true;
end;
$$;
revoke all on function public.claim_offer_campaign(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_offer_campaign(uuid, uuid, text, text) to service_role;

commit;
