# Plano: Adoção de @plataforma/contracts + Job E2E Playwright no CI

Status: proposto · Autor: Staff Eng · Escopo: `packages/contracts`, `apps/api`, `apps/web`, `.github/workflows/ci.yml`

---

## Parte 1 — Adoção do packages/contracts

### Decisões estruturais (não negociáveis)

1. **Contracts é type-only.** `main`/`types` já apontam para `src/index.ts` (sem build). Todo
   import nos apps usa `import type { ... } from '@plataforma/contracts'` — types são apagados
   na compilação, então não há impacto em runtime, no bundle do Next, no `nest build` (CJS),
   nem necessidade de `transpilePackages`. Proibido exportar valores (const/enum TS) do pacote.
2. **Regra anti-ciclo:** `packages/contracts` nunca importa de `apps/*` nem de `@prisma/client`.
   O schema Prisma continua fonte do banco; contracts é a fonte do **wire format** (DTOs HTTP).
3. **Divergência `orderIndex` (contracts) vs `order` (schema):** decisão — o wire format padrão
   é `orderIndex`; a API faz o mapeamento `activity.order -> orderIndex` nos serializers de
   Course/Activity. NÃO renomear a coluna no schema (migração arriscada sem ganho). O web passa
   a ler `orderIndex` dos DTOs; usos internos de `order` no web (`app/ide/page.tsx` etc.) são
   migrados por componente.
4. **Divergência `JwtPayload`:** `apps/api/src/auth/interfaces/jwt-payload.interface.ts` tem
   `role: string`; contracts tem `role: Role`. Decisão — contracts vence; o arquivo local vira
   re-export (`export type { JwtPayload } from '@plataforma/contracts'`) e depois é deletado.
   `jwt.strategy.ts` passa a validar `role` contra a união `Role` (type guard simples).

### Mecânica de import

- Adicionar em `apps/api/package.json` e `apps/web/package.json`:
  `"@plataforma/contracts": "workspace:*"` (o `pnpm-workspace.yaml` já cobre `packages/*`).
- **Não usar TS paths** para resolução de produção — pnpm workspace já linka o pacote; paths
  só confundem o `nest build` (CJS) e o Next (bundler). Nenhum `paths` novo nos tsconfigs.
- **Build order:** `pnpm -r build` já é topológico; como contracts não tem script `build`,
  nada muda. Único requisito: `prisma generate` antes do build da API (já existe no CI).

### Ordem de migração (passos incrementais, cada um sem breaking change)

| Passo | Conteúdo | Verificação |
|---|---|---|
| 1 | Adicionar dep `workspace:*` nos 2 apps + 1 import type smoke em cada (ex.: `Role` num DTO do auth) | `pnpm install`, 204 testes API verdes, `next build` ok |
| 2 | Enums divergidos: `Role`, `Language`, `SubmissionStatus` — API troca uniões locais pelos tipos de contracts; web idem (`app/profile/types.ts` re-exporta) | testes + build |
| 3 | `JwtPayload` da API vira re-export de contracts; ajustar `jwt.strategy.ts` e `current-user.decorator.ts` | testes de auth |
| 4 | DTOs de response: `SubmissionResponseDto`, `TestCaseResultDto`, `ActivitySummaryDto`, `CourseDetailDto`, `UserProfileDto` — serviços da API anotam retornos com `satisfies XDto` (mapeando `order`→`orderIndex`); web tipa fetches com os mesmos DTOs | testes + typecheck dos 2 apps |
| 5 | Remover tipos duplicados restantes no web e interfaces mortas na API | grep: zero declarações duplicadas |

Passos 2–5 são PRs separados. `satisfies` (não `as`) garante que o serializer real confere
com o contrato — divergência vira erro de compilação, não runtime.

### CI: falhar se tipos divergirem

- **Teste de compilação (principal):** criar `apps/api/src/contracts/contracts-alignment.spec.ts`
  com type tests que rodam no `test:coverage` existente (ts-jest compila = falha se divergir):
  ```ts
  import { Role as PrismaRole, SubmissionStatus as PrismaStatus } from '@prisma/client';
  import type { Role, SubmissionStatus } from '@plataforma/contracts';
  type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
  const roleOk: Equal<PrismaRole, Role> = true;          // falha build se enum do schema mudar
  const statusOk: Equal<PrismaStatus, SubmissionStatus> = true;
  ```
  Cobrir `Role`, `Language`, `SubmissionStatus`. Se alguém adicionar um valor ao enum Prisma,
  o CI quebra no mesmo PR.
- **Typecheck do pacote:** step no job `validate`:
  `pnpm --filter @plataforma/contracts exec tsc --noEmit` (antes do lint).
- **Guarda de duplicação (opcional, passo 5):** regra ESLint `no-restricted-declarations`/
  `no-restricted-syntax` proibindo redeclarar `interface SubmissionResponseDto|ActivitySummaryDto|...`
  fora de `packages/contracts`.

### Riscos

- **Ciclo contracts↔prisma:** mitigado pela regra 2 + teste de alinhamento ( contracts não gera
  nada a partir do Prisma; o teste só compara).
- **`role: string`→`Role` no JWT estreita o tipo:** tokens antigos com role inválido quebrariam
  no parse — mitigar com validação explícita e fallback 401 (já é o comportamento do guard).
- **Mapeamento `order`→`orderIndex` incompleto no web:** componentes que leem `order` do JSON
  ficam `undefined` silenciosamente — mitigar migrando por componente com typecheck estrito
  (`satisfies` nos fetchers) antes de remover o campo antigo.
- **Next + pacote TS sem build:** como só há `import type`, o bundler nunca resolve o arquivo;
  risco zero de ESM/CJS mismatch. Se um dia contracts exportar runtime, adicionar
  `transpilePackages: ['@plataforma/contracts']` no `next.config.js`.

---

## Parte 2 — Job E2E Playwright no CI

### Topologia do job `e2e` (novo job, `needs: [validate]`)

- **postgres/redis: manter como `services:` do runner** (iguais ao job `validate` — healthcheck
  pronto, zero build). Rodar `infra/postgres/init-gitea.sql` via `psql` num step para criar o
  database `gitea` que o serviço de container precisa.
- **api/web/piston/gitea via docker compose** com override `docker-compose.ci.yml` (a criar):
  - `gitea`: igual ao compose raiz, mas `GITEA__database__HOST: host.docker.internal:5432`
    (aponta para o service postgres do runner) e portas `3030:3000`, `2222:22`.
  - `piston`: adicionar `ports: ['2000:2000']` (o compose raiz só usa `expose`).
  - **api e web NÃO sobem via compose no CI** — rodam nativos no runner
    (`pnpm --filter @plataforma/api start:prod` e `pnpm --filter @plataforma/web start`),
    aproveitando o build já feito no step anterior. Motivo: os Dockerfiles de dev montam
    volumes de src e rodam `nest start --watch` (lento e flaky em CI); nativo é ~2x mais rápido
    e o Playwright já espera `http://localhost:3001`.
  - Steps: `docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d --wait piston gitea`
    (após `piston-init` completar) → `prisma migrate deploy` → seed de teste (abaixo) →
    start api → poll `GET /health` → start web → `playwright test`.
  - `extra_hosts: [host.docker.internal:host-gateway]` nos containers que acessam o service DB.

### Piston runtimes: cache de imagem

O `piston-init` baixa node/python/java a cada boot (~2–4 min, flaky por rede). Decisão:
- Criar `infra/piston/Dockerfile.ci`: `FROM ghcr.io/engineer-man/piston:latest` +
  `ppman install node 20.11.1 python 3.12.0 java 15.0.2` no build.
- No job e2e: `docker/build-push-action` com `cache-from/cache-to: type=gha,scope=piston-runtimes`
  e tag local `piston:ci`; o override usa essa imagem e remove o `piston-init`.
- Hit de cache = ~20s; miss = uma vez por mudança do Dockerfile.ci.

### Fixtures de teste (sem seed de produção)

Proibido rodar `scripts/seed-data.mjs` no CI (senhas conhecidas `aluno12345`, dados de dev).
- Criar `scripts/seed-e2e.mjs`: idempotente, lê `E2E_*` do env, cria **somente**:
  1 aluno (`e2e-aluno@plataforma.local`), 1 instrutor, 1 curso com 2 atividades (1 java, 1
  python — cobre o Piston), badges mínimas. Senhas geradas por run
  (`openssl rand -hex 16` → env `E2E_STUDENT_PASSWORD`), nunca hardcoded.
- **Auth cookie-only:** helper `e2e/fixtures/auth.ts` faz login 1x via `request` fixture
  (POST /auth/login) e salva `storageState` por perfil (aluno/instrutor/visitante); specs usam
  `test.use({ storageState })` — elimina login repetido por teste e reduz flake de timing.
- **Isolamento entre specs:** cada spec usa um usuário próprio (fábrica `createE2EUser(prefix)`
  via API admin ou seed), porque `rpg-game-flow` muta estado (onboarding/pet) enquanto `smoke`
  só lê. Sem estado compartilhado mutável, os 3 specs podem rodar em paralelo.
- Specs atuais referenciam `aluno@plataforma.local/aluno12345` (smoke.spec.ts): migrar para
  `process.env.E2E_STUDENT_EMAIL/PASSWORD` no mesmo PR que introduz o job.

### Paralelização dos 3 specs

- `playwright.config.ts`: `workers: process.env.CI ? 2 : undefined` (era 1). Com 3 specs
  independentes e storageState por perfil, 2 workers dão ~40% de ganho sem contention
  (1 runner GH = 2 vCPU; workers=3 saturaria o Postgres service).
- Manter `fullyParallel: true`. Sharding (`--shard`) não vale para 3 specs: overhead de
  provisionar infra 3x. Reavaliar se passar de ~8 specs.

### Retries e anti-flake

- Manter `retries: 2` no CI + `trace: 'on-first-retry'`; subir trace/HTML report como artifact
  (`actions/upload-artifact`, name `playwright-report-${{ github.run_number }}`) só em falha.
- `webServer` do Playwright **desabilitado no CI** (a web já está de pé via step próprio):
  condicionar `webServer` a `!process.env.CI` no config; Playwright aponta `WEB_URL=http://localhost:3001`.
- Esperas determinísticas: aguardar `GET /health` da API e `GET /` da web com poll (timeout 60s)
  antes do `playwright test`; nos specs, proibir `waitForTimeout` (regra de review; usar
  locators/`expect.poll`).
- `forbidOnly: true` no CI (já ativo) impede `.only` esquecido de quebrar a cobertura do suite.
- Timeout global do job: 20 min. Se o suite passar de 10 min, revisar antes de escalar workers.

### Critérios de merge

1. Job `e2e` entra como **não-bloqueante por 1 semana** (ou 20 runs em PRs, o que vier antes);
   flake rate < 5% medido pelos retries (run que passa só no retry = flake, investigar).
2. Depois: `e2e` vira **required check** para PRs em `main`/`develop`, junto de `validate`.
3. PR só mergeia com: `validate` verde, `docker-build` verde, `e2e` verde sem retry em >1 spec
   (retry pontual tolerado; retry recorrente no mesmo spec = bloquear e abrir issue de flake).
4. Alterações em `contracts`, DTOs da API, specs e2e ou `docker-compose*.yml` exigem e2e verde
   (paths filter opcional para acelerar PRs de docs).
