-- Install only after checking the live menu_items schema and owner-only RLS.
-- This function deliberately uses caller permissions; it does not bypass RLS.
-- Existing rows are kept, and removed dishes are marked inactive.
begin;

create or replace function public.publish_menu_section_v1(
  p_category text, p_day text, p_items jsonb, p_expected jsonb
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  current_rows jsonb;
  saved_rows jsonb;
  existing_row record;
  item jsonb;
  item_count integer;
  position integer := 0;
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_category is null or p_day is null or p_items is null or p_expected is null
     or jsonb_typeof(p_items) <> 'array' or jsonb_typeof(p_expected) <> 'array' then
    raise exception 'Invalid menu payload';
  end if;
  if not (
    (p_category = 'Lunch' and p_day in ('Måndag','Tisdag','Onsdag','Torsdag','Fredag'))
    or (p_category in ('Pasta','Hamburgare','Tips','Pizza','Kebab','Sallader',
      'Veganska maträtter','Frukost','Frysta matlådor') and p_day = '')
  ) then
    raise exception 'Invalid menu section';
  end if;
  item_count := jsonb_array_length(p_items);
  if item_count > 200 then raise exception 'Too many dishes'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item->'name') is distinct from 'string'
       or btrim(item->>'name') = ''
       or jsonb_typeof(item->'price') is distinct from 'number'
       or (item->>'price')::numeric <= 0 then
      raise exception 'Every dish needs a name and positive price';
    end if;
  end loop;

  -- Serializes calls for this section, including sections with no rows yet.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_category || ':' || p_day, 0));
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'category', category, 'day', day,
    'name', name, 'price', price, 'active', active
  ) order by id), '[]'::jsonb) into current_rows
  from public.menu_items where category = p_category and day = p_day;
  if current_rows <> p_expected then
    raise exception 'Menu changed elsewhere. Reload before saving.';
  end if;

  for existing_row in
    select id from public.menu_items
    where category = p_category and day = p_day order by id
  loop
    if position < item_count then
      item := p_items->position;
      update public.menu_items set
        name = btrim(item->>'name'), price = (item->>'price')::numeric, active = true
      where id = existing_row.id;
    else
      update public.menu_items set active = false where id = existing_row.id;
    end if;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu update denied'; end if;
    position := position + 1;
  end loop;
  while position < item_count loop
    item := p_items->position;
    insert into public.menu_items(category, day, name, price, active)
    values(p_category, p_day, btrim(item->>'name'), (item->>'price')::numeric, true);
    position := position + 1;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'category', category, 'day', day,
    'name', name, 'price', price, 'active', active
  ) order by id), '[]'::jsonb) into saved_rows
  from public.menu_items where category = p_category and day = p_day;
  return saved_rows;
end;
$$;

revoke all on function public.publish_menu_section_v1(text,text,jsonb,jsonb) from public, anon;
grant execute on function public.publish_menu_section_v1(text,text,jsonb,jsonb) to authenticated;
commit;
