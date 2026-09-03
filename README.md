# SwipeMusic

SwipeMusic é uma aplicação web mobile-first para avaliar músicas que já existem em um pendrive. O projeto é desenvolvido de forma incremental, com código simples de manter.

## Escopo do MVP

- Carregar uma biblioteca de músicas cadastrada no Supabase.
- Apresentar uma música ainda não avaliada por vez.
- Reproduzir áudio com play/pause, timeline navegável, tempo atual e duração.
- Exibir capa, nome da música e artista quando disponíveis.
- Classificar cada música como **Gosto**, **Indiferente** ou **Não gosto**.
- Avançar apenas após a avaliação ser persistida, sem repetir músicas concluídas.
- Desfazer a última avaliação persistida.

## Fora do escopo atual

Painel administrativo completo, edição de metadados, exclusão automática do pendrive, recomendações, integrações com Spotify ou YouTube, descoberta musical, múltiplos usuários, playlists e funcionalidades sociais.

## Tecnologias

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Supabase
- ESLint

## Configuração do Supabase

1. Crie um projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. Abra o **SQL Editor** do projeto.
3. Copie e execute todo o conteúdo de `supabase/schema.sql`. Além das tabelas, o script cria os buckets `music` (privado) e `covers` (público).
4. Para adicionar as quatro músicas locais de desenvolvimento, execute depois `supabase/seed.sql`.
5. No dashboard, encontre a URL do projeto e a publishable key nas configurações de API do projeto.
6. Copie `.env.example` para `.env.local` e preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Encontre a URL e a publishable key em **Project Settings > API Keys**. A service role key fica na seção de chaves secretas/legadas do mesmo projeto. A nomenclatura da tela pode variar conforme a versão do Dashboard.

`SUPABASE_SERVICE_ROLE_KEY` é um segredo administrativo. Ela é usada apenas pelo importador local e pela Route Handler server-side que cria URLs temporárias para o bucket privado. Nunca use o prefixo `NEXT_PUBLIC_`, nunca coloque essa chave em componentes cliente, commits, relatórios ou logs. Configure-a também como variável secreta do ambiente server-side na Vercel; ela não é enviada ao navegador.

## Banco de dados

O schema cria:

- `songs`: músicas e informações necessárias para localizar futuramente o arquivo original no pendrive;
- `ratings`: uma avaliação por música, limitada a `LIKE`, `NEUTRAL` ou `DISLIKE`;
- unicidade de `ratings.song_id`;
- unicidade de `songs.file_hash` quando o hash não for nulo;
- índices, constraints, RLS, grants e policies do MVP.

## Supabase Storage

O final de `supabase/schema.sql` configura:

- `music`: privado, aceita MP3 (`audio/mpeg`);
- `covers`: público, aceita JPEG, PNG, WebP e GIF;
- nenhuma policy de upload, alteração ou exclusão para `anon`.

O importador usa a service role e ignora RLS para fazer os uploads. O navegador nunca faz upload. As capas são lidas pela URL pública do bucket `covers`; os áudios são acessados por uma URL assinada com duração de uma hora, criada no servidor em `/api/media/audio`.

Se as tabelas já existirem, execute novamente `supabase/schema.sql` no SQL Editor para criar/configurar os buckets. Não crie policies públicas de escrita em `storage.objects`.

### Aviso de segurança sobre RLS

As policies do banco ainda não exigem autenticação: qualquer cliente com a publishable key pode ler músicas e ler, criar ou excluir avaliações. Isso atende ao uso privado com um único avaliador, mas **não é seguro para uma aplicação pública ou multiusuário**.

Antes de publicar amplamente ou adicionar múltiplos usuários, implemente autenticação e substitua as policies por regras vinculadas ao usuário. A publishable key não é um segredo; a segurança depende das policies e dos privilégios do banco.

## Acesso administrativo

As rotas `/admin` e `/importacao` exigem uma sessão Supabase Auth válida. A tela de avaliação `/` e a rota de reprodução de áudio continuam públicas. O MVP usa somente login por e-mail e senha, sem cadastro público ou recuperação de senha.

Crie o único administrador manualmente em **Authentication > Users > Add user** no Supabase Dashboard. Use um e-mail real e uma senha forte; não é necessário adicionar novas variáveis de ambiente. Depois, acesse `/login`. A sessão é mantida em cookies pelo `@supabase/ssr`, e o botão **Sair** encerra a sessão.

A autenticação protege as páginas administrativas, mas não muda as policies RLS simplificadas já usadas pelo fluxo público de avaliação. Antes de transformar o sistema em uma aplicação pública multiusuário, as policies também devem ser revistas e vinculadas a usuários/perfis autorizados.

## Importação local das músicas

O importador roda somente no computador do administrador. Ele percorre a pasta recursivamente, processa arquivos `.mp3`, lê tags ID3, calcula SHA-256, envia áudio/capa ao Storage e insere a música no banco.

O importador definitivo reutiliza o resolved metadata da Auditoria V2. Também registra `bitrate`, `sample_rate`, `metadata_status` e `metadata_review_required`. Execute novamente `supabase/schema.sql` antes da primeira importação para adicionar essas colunas ao projeto existente.

Antes de executar:

1. Execute `supabase/schema.sql` no projeto correto.
2. Preencha `.env.local` com as três variáveis mostradas acima.
3. Instale as dependências com `pnpm install`.
4. Conecte o pendrive ou disponibilize a pasta de músicas no computador.

### Plano final, sem upload

Antes da execução real, gere o plano completo:

```powershell
npm.cmd run import-music -- "E:\Musicas" --plan
```

Esse modo não cria cliente Supabase, não faz upload ou insert e não altera os MP3s. Ele gera:

- `reports/import-plan-YYYY-MM-DD-HHmmss.json`;
- `reports/import-plan-YYYY-MM-DD-HHmmss.csv`.

O plano importa um representante por SHA-256 e por grupo `LIKELY_DUPLICATE`. O representante é escolhido por erro de leitura, status dos metadados, confiança de título/artista, capa, bitrate, sample rate, tamanho e, por último, `relative_path`. Grupos `POSSIBLE_DUPLICATE` e arquivos `NEEDS_REVIEW` são preservados.

### Importação real

Exemplo no Windows PowerShell:

```powershell
npm.cmd run import-music -- "E:\Musicas"
```

Depois de montar e mostrar o plano, o comando exige que o administrador digite exatamente `IMPORTAR`. Qualquer outra entrada cancela sem upload ou insert.

Também é possível executar diretamente:

```powershell
pnpm tsx scripts/import-music.ts "E:\MusicasVan"
```

Para cada arquivo, o script mostra progresso e resultado. Uma música cujo SHA-256 já exista em `songs.file_hash` é marcada como `skipped_duplicate`: não há novo upload nem novo registro. Falhas individuais não interrompem os próximos arquivos.

No banco, `source_folder` é relativo à raiz informada. Por exemplo, `E:\MusicasVan\Sertanejo\Antigas\musica.mp3` produz `Sertanejo/Antigas`; nenhum caminho absoluto do computador é salvo em `songs`. `audio_path` e `cover_path` guardam somente o nome baseado no hash dentro de seus respectivos buckets, nunca uma URL assinada.

Ao final, o terminal mostra encontrados, importados, duplicados, sem artista, sem capa e erros. Um relatório detalhado sem secrets é salvo em `reports/import-YYYY-MM-DD-HHmmss.json`; essa pasta é ignorada pelo Git. Os contadores “sem artista” e “sem capa” consideram os arquivos novos processados, não duplicatas ignoradas.

### Auditoria V2 antes da importação

Antes da primeira importação real, execute somente a análise:

```powershell
pnpm analyze-music "E:\MusicasVan"
```

Com npm:

```powershell
npm run analyze-music -- "E:\MusicasVan"
```

O comando equivalente é:

```powershell
pnpm import-music "E:\MusicasVan" --dry-run
```

O modo de análise não precisa acessar o Supabase e não faz upload, insert, alteração de ID3, exclusão, movimentação ou renomeação. Ele apenas lê os MP3s e gera:

- `reports/library-analysis-v2-YYYY-MM-DD-HHmmss.json`, com resumo, arquivos e grupos;
- `reports/library-analysis-v2-YYYY-MM-DD-HHmmss.csv`, com uma linha por arquivo e BOM UTF-8 para abertura amigável no Excel.

O V2 separa `metadata_status` (`GOOD`, `INFERRED`, `NEEDS_REVIEW`) de `duplicate_status` (`EXACT_DUPLICATE`, `LIKELY_DUPLICATE`, `POSSIBLE_DUPLICATE`, `UNIQUE`). Metadado ruim nunca transforma uma música em duplicata.

As classificações de duplicidade são conservadoras:

- `EXACT_DUPLICATE`: SHA-256 idêntico, confiança `1.0`;
- `LIKELY_DUPLICATE`: título e artista resolvidos com similaridade mínima de `0.95`, duração com diferença de até 5 segundos e nenhuma versão conflitante;
- `POSSIBLE_DUPLICATE`: título e artista resolvidos com similaridade mínima de `0.90`, duração ausente ou com diferença de até 15 segundos e nenhuma versão conflitante;
- `UNIQUE`: nenhum sinal suficiente para agrupamento.

ID3 suspeito — valores genéricos, numéricos, domínios e marcas de sites de download — é preservado para auditoria, mas não é usado como evidência confiável. O resolved metadata usa, em ordem conservadora, ID3 confiável, padrões explícitos do filename e pasta específica. Cada campo registra origem e confiança.

Título e artista são normalizados somente para comparação. A normalização remove acentos, caixa, pontuação, prefixos numéricos e termos acessórios como “official audio”, mas preserva informações como live, remix, acústico, remastered e feat. Duração nunca é usada isoladamente.

Grupos não usam componentes conexos. O agrupamento é de ligação completa: cada membro precisa ser compatível diretamente com todos os outros, impedindo que relações transitivas formem grupos gigantes. Grupos prováveis acima de 10 arquivos geram um warning para revisão.

## Desenvolvimento local

Requisitos: Node.js 20.9 ou superior e pnpm.

```bash
pnpm install
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Para validar o projeto:

```bash
pnpm lint
pnpm build
```

Os caminhos do `supabase/seed.sql` continuam apontando para arquivos locais de desenvolvimento em `public/audio` e `public/covers`. Músicas importadas usam os buckets do Storage automaticamente.
