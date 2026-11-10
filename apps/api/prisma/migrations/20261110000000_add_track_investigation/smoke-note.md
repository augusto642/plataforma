# Smoke da migration 20261110000000_add_track_investigation

## O que foi validado (nesta VM, 2026-11-10)

- `prisma validate` — schema válido (inclui `TrackInvestigation`,
  `MarketSignal` e o enum `TrackInvestigationStatus`).
- `prisma generate` — client gerado com os novos modelos
  (`prisma.trackInvestigation`, `prisma.marketSignal`).
- `nest build` — compila; `jest` (API, 1082 testes) e `vitest` (web, 201
  testes) verdes; `next build` verde.
- **Smoke real em banco vazio (Postgres 16 local, 2026-11-10):**
  `prisma migrate deploy` num banco vazio aplicou as 28 migrations com
  sucesso, incluindo esta; `\d track_investigations` e
  `\d market_signals` conferem com o schema (tipos, defaults, índices
  únicos, FKs com `ON DELETE CASCADE`); `_prisma_migrations` registra
  `20261110000000_add_track_investigation`.
- **Diff de conferência:** `prisma migrate diff --from-migrations
  prisma/migrations --to-schema prisma/schema.prisma` (com
  `SHADOW_DATABASE_URL` num banco vazio) NÃO menciona
  `track_investigations` nem `market_signals` — a migration reproduz o
  schema exatamente. O diff restante (66 linhas: `DROP DEFAULT` de
  `id` em várias tabelas + 1 FK de `interview_reports`) é deriva
  PRÉ-EXISTENTE de migrations antigas, já documentada na migration da
  Torre — não é desta migration e não foi tocada aqui.
- O SQL desta migration foi escrito à mão no formato do
  `prisma migrate diff` (nomes de índices/constraints no padrão do
  Prisma: `*_pkey`, `*_key`, `*_idx`, `*_fkey`). Ele contém SÓ as duas
  tabelas novas — nenhuma coluna em tabela existente é tocada.
