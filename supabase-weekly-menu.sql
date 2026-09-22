create table if not exists public.weekly_menu (
  day text primary key,
  dishes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.weekly_menu enable row level security;

drop policy if exists "Alla kan läsa veckomenyn" on public.weekly_menu;
create policy "Alla kan läsa veckomenyn"
on public.weekly_menu for select
to anon, authenticated
using (true);

drop policy if exists "Inloggad admin kan ändra veckomenyn" on public.weekly_menu;
create policy "Inloggad admin kan ändra veckomenyn"
on public.weekly_menu for all
to authenticated
using (true)
with check (true);

grant select on public.weekly_menu to anon;
grant select, insert, update, delete on public.weekly_menu to authenticated;

insert into public.weekly_menu (day, dishes)
values
  ('Måndag', '["Piccata milanese med ris, tomatsås", "Hackad biff med stekt potatis, krämig paprikasås", "Panerad fiskfilé med kokt potatis, remouladsås"]'::jsonb),
  ('Tisdag', '["Raggmunk med stekt fläsk, lingonsylt eller löksås, kokt potatis", "Kyckling bourguignon med grönsaker, ris, vitlökskräm", "Panerad flundrafilé med kokt potatis, kall dillsås"]'::jsonb),
  ('Onsdag', '["Wallenbergare med potatismos, gräddsås, lingonsylt", "Korv stroganoff med paprika, lök, krämig chilisås, ris", "Panerad rödspättafilé med kokt potatis, avokadoröra"]'::jsonb),
  ('Torsdag', '["Fläskschnitzel med stekt potatis och sås", "Dagens husmanskost", "Dagens fisk"]'::jsonb),
  ('Fredag', '["Dagens husmanskost", "Dagens alternativ", "Dagens fisk"]'::jsonb)
on conflict (day) do nothing;
