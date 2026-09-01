-- Remove somente as quatro músicas criadas por supabase/seed.sql.
-- Os ratings relacionados são removidos pelo FK com ON DELETE CASCADE.
-- Os caminhos abaixo são arquivos locais de teste, não objetos do Storage real.

do $$
declare
  matching_seed_rows integer;
begin
  select count(*)
    into matching_seed_rows
  from public.songs
  where (id, file_hash, audio_path) in (
    ('11111111-1111-4111-8111-111111111111'::uuid, 'seed-aurora-lenta', '/audio/aurora-lenta.mp3'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'seed-cidade-em-azul', '/audio/cidade-em-azul.mp3'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'seed-entre-estacoes', '/audio/entre-estacoes.mp3'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'seed-passos-de-luz', '/audio/passos-de-luz.mp3')
  );

  if matching_seed_rows <> 4 then
    raise exception 'Limpeza cancelada: eram esperadas exatamente 4 músicas do seed, mas % correspondem integralmente.', matching_seed_rows;
  end if;

  delete from public.songs
  where (id, file_hash, audio_path) in (
    ('11111111-1111-4111-8111-111111111111'::uuid, 'seed-aurora-lenta', '/audio/aurora-lenta.mp3'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'seed-cidade-em-azul', '/audio/cidade-em-azul.mp3'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'seed-entre-estacoes', '/audio/entre-estacoes.mp3'),
    ('44444444-4444-4444-8444-444444444444'::uuid, 'seed-passos-de-luz', '/audio/passos-de-luz.mp3')
  );
end
$$;
