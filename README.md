# SwipeMusic

SwipeMusic é uma aplicação web mobile-first para avaliar músicas que já existem em um pendrive. O projeto será desenvolvido de forma incremental, com código simples de manter.

## Escopo do MVP

- Cadastrar uma biblioteca de músicas no sistema.
- Apresentar uma música ainda não avaliada por vez.
- Reproduzir o áudio com play/pause, timeline navegável, tempo atual e duração.
- Exibir capa, nome da música e artista quando disponíveis.
- Classificar cada música como **Gosto**, **Indiferente** ou **Não gosto**.
- Avançar imediatamente após a avaliação, sem repetir músicas avaliadas na fila normal.
- Persistir futuramente o progresso no Supabase.
- Disponibilizar futuramente uma área administrativa com totais de músicas, avaliações, itens restantes e resultados por classificação.

## Fora do escopo deste MVP

Recomendações, IA, integrações com Spotify ou YouTube, descoberta de músicas, detecção de refrão, análise de áudio, múltiplos usuários, autenticação complexa, playlists, edição automática do pendrive e funcionalidades sociais.

## Tecnologias

- Next.js com App Router
- TypeScript
- Tailwind CSS
- ESLint
- Supabase e deploy na Vercel em etapas posteriores

## Desenvolvimento local

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
pnpm install
pnpm dev
```

Depois, acesse [http://localhost:3000](http://localhost:3000).

Para validar o projeto:

```bash
pnpm lint
pnpm build
```
