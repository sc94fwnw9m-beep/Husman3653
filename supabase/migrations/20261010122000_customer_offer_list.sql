begin;

-- Soft removal retains send deduplication and can be undone by the owner.
alter table public.offer_campaigns add column if not exists hidden_at timestamptz;

-- Expose only public offer text. Audience, owner identity and delivery data stay private.
create or replace function public.list_customer_offers()
returns table (id uuid, title text, body text, created_at timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select c.id, c.title, c.body, c.created_at
  from public.offer_campaigns c
  where c.status in ('completed', 'partial') and c.hidden_at is null
  order by c.created_at desc, c.id desc
  limit 50;
$$;
revoke all on function public.list_customer_offers() from public;
grant execute on function public.list_customer_offers() to anon, authenticated;

create or replace function public.list_owner_offers()
returns table (id uuid, title text, body text, created_at timestamptz, hidden_at timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_restaurant_admin() is distinct from true then
    raise exception 'Ägarbehörighet krävs.' using errcode = '42501';
  end if;
  return query select c.id, c.title, c.body, c.created_at, c.hidden_at
    from public.offer_campaigns c where c.status in ('completed', 'partial')
    order by (c.hidden_at is not null), c.created_at desc, c.id desc limit 100;
end;
$$;
revoke all on function public.list_owner_offers() from public;
grant execute on function public.list_owner_offers() to authenticated;

create or replace function public.set_customer_offer_hidden(p_id uuid, p_hidden boolean)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_restaurant_admin() is distinct from true then
    raise exception 'Ägarbehörighet krävs.' using errcode = '42501';
  end if;
  if p_hidden is null then raise exception 'Välj radera eller återställ.'; end if;
  update public.offer_campaigns set hidden_at = case when p_hidden then now() else null end
    where id = p_id and status in ('completed', 'partial');
  return found;
end;
$$;
revoke all on function public.set_customer_offer_hidden(uuid, boolean) from public;
grant execute on function public.set_customer_offer_hidden(uuid, boolean) to authenticated;

commit;
