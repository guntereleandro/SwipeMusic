insert into public.songs (
  id,
  library_id,
  title,
  artist,
  album,
  original_filename,
  source_folder,
  audio_path,
  cover_path,
  file_hash
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    (select id from public.libraries where slug = 'norair'),
    'Aurora Lenta',
    'Marina Vale',
    null,
    'aurora-lenta.mp3',
    '/Musicas/Teste',
    '/audio/aurora-lenta.mp3',
    '/covers/aurora-lenta.svg',
    'seed-aurora-lenta'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    (select id from public.libraries where slug = 'norair'),
    'Cidade em Azul',
    'Caio Norte',
    null,
    'cidade-em-azul.mp3',
    '/Musicas/Teste',
    '/audio/cidade-em-azul.mp3',
    '/covers/cidade-em-azul.svg',
    'seed-cidade-em-azul'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    (select id from public.libraries where slug = 'norair'),
    'Entre Estações',
    'Clara Dias',
    null,
    'entre-estacoes.mp3',
    '/Musicas/Teste',
    '/audio/entre-estacoes.mp3',
    '/covers/entre-estacoes.svg',
    'seed-entre-estacoes'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    (select id from public.libraries where slug = 'norair'),
    'Passos de Luz',
    'Horizonte Sul',
    null,
    'passos-de-luz.mp3',
    '/Musicas/Teste',
    '/audio/passos-de-luz.mp3',
    '/covers/passos-de-luz.svg',
    'seed-passos-de-luz'
  )
on conflict do nothing;
