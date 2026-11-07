-- Only publish a version here after confirming it is available in Sweden in that store.
create table if not exists public.app_releases (
 platform text primary key check (platform in ('ios','android')),
 available_version text not null check (available_version ~ '^\d+\.\d+\.\d+$'),
 minimum_version text not null default '0.0.0' check (minimum_version ~ '^\d+\.\d+\.\d+$'),
 published boolean not null default false
);
alter table public.app_releases enable row level security;
revoke all on public.app_releases from anon, authenticated;
grant select on public.app_releases to anon, authenticated;
create policy "Read published app releases" on public.app_releases for select to anon, authenticated using (published = true);
-- Confirmed public versions; 1.0.11 is still awaiting store review and is not advertised.
insert into public.app_releases (platform,available_version,published) values
 ('ios','1.0.9',true), ('android','1.0.10',true)
on conflict (platform) do nothing;
