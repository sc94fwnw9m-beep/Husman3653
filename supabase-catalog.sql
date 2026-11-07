-- Run in the existing project's Supabase SQL editor before releasing the app.
-- Create/confirm the owner's Auth account, then insert its UUID in catalog_owners
-- via the SQL editor. No client can grant itself ownership.
begin;
create table if not exists public.catalog_owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.catalog_owners enable row level security;
create policy "Owner can read own catalog membership" on public.catalog_owners
for select to authenticated using (user_id = auth.uid());
grant select on public.catalog_owners to authenticated;

create table if not exists public.menu_categories (
  name text primary key check (length(trim(name)) between 1 and 60),
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.menu_categories enable row level security;
create policy "Customers read categories" on public.menu_categories
for select to anon, authenticated using (true);
create policy "Owner manages categories" on public.menu_categories
for all to authenticated
using (exists (select 1 from public.catalog_owners where user_id = auth.uid()))
with check (exists (select 1 from public.catalog_owners where user_id = auth.uid()));
grant select on public.menu_categories to anon;
grant select, insert, update, delete on public.menu_categories to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 6291456, array['image/jpeg'])
on conflict (id) do nothing;
create policy "Customers read menu pictures" on storage.objects
for select to anon, authenticated using (bucket_id = 'menu-images');
create policy "Owner manages menu pictures" on storage.objects
for all to authenticated
using (bucket_id = 'menu-images' and exists (select 1 from public.catalog_owners where user_id = auth.uid()))
with check (bucket_id = 'menu-images' and exists (select 1 from public.catalog_owners where user_id = auth.uid()));
commit;
