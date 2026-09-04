-- Multi-library migration. Safe to run against the existing SwipeMusic schema.
-- The transaction aborts if any existing song cannot be assigned to Norair.
begin;

create table if not exists public.libraries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint libraries_slug_key unique (slug),
  constraint libraries_slug_format_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

insert into public.libraries (name, slug)
values ('Norair', 'norair')
on conflict (slug) do update set name = excluded.name;

alter table public.songs add column if not exists library_id uuid null;

update public.songs
set library_id = (select id from public.libraries where slug = 'norair')
where library_id is null;

do $$
begin
  if exists (select 1 from public.songs where library_id is null) then
    raise exception 'Migration aborted: songs without library_id remain';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'songs_library_id_fkey'
      and conrelid = 'public.songs'::regclass
  ) then
    alter table public.songs
      add constraint songs_library_id_fkey
      foreign key (library_id) references public.libraries(id) on delete restrict;
  end if;
end $$;

alter table public.songs alter column library_id set not null;

drop index if exists public.songs_file_hash_unique_idx;
create unique index if not exists songs_library_file_hash_unique_idx
  on public.songs (library_id, file_hash)
  where file_hash is not null;
create index if not exists songs_library_created_at_idx
  on public.songs (library_id, created_at, id);

alter table public.libraries enable row level security;
revoke all on table public.libraries from anon, authenticated;
grant select on table public.libraries to anon, authenticated;

drop policy if exists "Public can read libraries" on public.libraries;
create policy "Public can read libraries"
  on public.libraries for select to anon, authenticated using (true);

-- Songs remain public read-only. Ratings retain the MVP's public read/create/delete
-- behavior. There are deliberately no public write grants or policies on libraries/songs.

commit;

-- Post-migration verification (read-only):
select
  (select count(*) from public.songs) as songs,
  (select count(*) from public.ratings) as ratings,
  (select count(*) from public.songs s join public.libraries l on l.id = s.library_id where l.slug = 'norair') as norair_songs,
  (select count(*) from public.songs where library_id is null) as songs_without_library;
