-- Apply in the Supabase SQL Editor after enabling administrative login.
-- Additive and safe to run again: no rows or existing anon permissions change.

grant select on table public.songs to authenticated;
grant select on table public.ratings to authenticated;

drop policy if exists "MVP authenticated can read songs" on public.songs;
create policy "MVP authenticated can read songs"
  on public.songs
  for select
  to authenticated
  using (true);

drop policy if exists "MVP authenticated can read ratings" on public.ratings;
create policy "MVP authenticated can read ratings"
  on public.ratings
  for select
  to authenticated
  using (true);
