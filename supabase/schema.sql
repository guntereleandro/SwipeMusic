-- SwipeMusic MVP database schema.
-- This project intentionally allows the unauthenticated `anon` role to manage
-- ratings. See README.md before exposing the application publicly.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text null,
  album text null,
  original_filename text not null,
  source_folder text null,
  audio_path text not null,
  cover_path text null,
  file_hash text null,
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  bitrate integer null check (bitrate is null or bitrate >= 0),
  sample_rate integer null check (sample_rate is null or sample_rate >= 0),
  metadata_status text null check (metadata_status is null or metadata_status in ('GOOD', 'INFERRED', 'NEEDS_REVIEW')),
  metadata_review_required boolean not null default false,
  created_at timestamptz not null default now()
);

-- Compatible migration for projects where `songs` already exists.
alter table public.songs add column if not exists bitrate integer null;
alter table public.songs add column if not exists sample_rate integer null;
alter table public.songs add column if not exists metadata_status text null;
alter table public.songs add column if not exists metadata_review_required boolean not null default false;

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  rating text not null,
  created_at timestamptz not null default now(),
  constraint ratings_song_id_key unique (song_id),
  constraint ratings_rating_check check (rating in ('LIKE', 'NEUTRAL', 'DISLIKE'))
);

create unique index if not exists songs_file_hash_unique_idx
  on public.songs (file_hash)
  where file_hash is not null;

create index if not exists songs_created_at_idx on public.songs (created_at);
create index if not exists ratings_created_at_idx on public.ratings (created_at desc);
create index if not exists ratings_rating_idx on public.ratings (rating);

alter table public.songs enable row level security;
alter table public.ratings enable row level security;

revoke all on table public.songs from anon, authenticated;
revoke all on table public.ratings from anon, authenticated;

grant select on table public.songs to anon;
grant select, insert, delete on table public.ratings to anon;

drop policy if exists "MVP anon can read songs" on public.songs;
create policy "MVP anon can read songs"
  on public.songs
  for select
  to anon
  using (true);

drop policy if exists "MVP anon can read ratings" on public.ratings;
create policy "MVP anon can read ratings"
  on public.ratings
  for select
  to anon
  using (true);

drop policy if exists "MVP anon can create ratings" on public.ratings;
create policy "MVP anon can create ratings"
  on public.ratings
  for insert
  to anon
  with check (rating in ('LIKE', 'NEUTRAL', 'DISLIKE'));

drop policy if exists "MVP anon can delete ratings" on public.ratings;
create policy "MVP anon can delete ratings"
  on public.ratings
  for delete
  to anon
  using (true);

-- Storage used by the local importer. No anon upload/update/delete policies are
-- created. `music` stays private; `covers` exposes only public object delivery.
insert into storage.buckets (id, name, public, allowed_mime_types)
values
  ('music', 'music', false, array['audio/mpeg']),
  ('covers', 'covers', true, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types;
