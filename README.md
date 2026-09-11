# Plataforma — Ensino de Programação

Plataforma LMS para ensinar programação com prática executável, feedback de testes/pipeline e tutoria de IA.

## Stack

- **API**: NestJS + PostgreSQL + Redis/BullMQ
- **Web**: Next.js (App Router)
- **Git**: Gitea self-hosted
- **Sandbox**: [Piston](https://github.com/engineer-man/piston) (container dedicado com Isolate: namespaces, chroot, usuário sem privilégios, cgroups, rede desabilitada). O código do aluno **nunca** roda no processo da API.

## Setup local

```bash
# 1. Copiar environment
cp .env.example .env

# 2. Gerar segredos obrigatórios (a API recusa subir sem eles)
#    Linux/macOS:
openssl rand -hex 48   # -> JWT_ACCESS_SECRET
openssl rand -hex 48   # -> JWT_REFRESH_SECRET
openssl rand -hex 32   # -> GITEA_WEBHOOK_SECRET
#    Cole os valores no .env

# 3. Subir tudo (postgres, redis, gitea, piston, api, web)
docker compose up -d --build

# 4. Instalar runtimes no Piston (uma vez, após o primeiro boot)
docker exec plataforma-piston-1 sh -c "cd /piston && ./cli/index.js ppman install node python java typescript"

# 5. Aplicar migrations (o container da API já faz no boot; localmente:)
pnpm db:migrate

# 6. Seed do Gitea (instala a instancia + cria org e service account)
pnpm seed:gitea
#   -> imprime um GITEA_TOKEN; copie para o .env (GITEA_TOKEN=<valor>)

# 7. Seed dos dados demo (usuarios, cursos, atividades)
pnpm seed:data

# 8. Reiniciar a API para carregar o GITEA_TOKEN
docker compose up -d api
```

Após isso:

| Serviço    | URL                    |
| ---------- | ---------------------- |
| API        | http://localhost:3000  |
| Web        | http://localhost:3001  |
| Gitea      | http://localhost:3030  |
| Piston     | interno (sem porta no host) |
| PostgreSQL | localhost:5432         |
| Redis      | localhost:6379         |

Healthcheck da API: `curl http://localhost:3000/health`.

### Rodar API e web localmente (alternativa ao docker)

```bash
pnpm install
pnpm dev:api   # http://localhost:3000
pnpm dev:web   # http://localhost:3001
```

> Os dois modos (docker vs. local) disputam as mesmas portas. Use um de cada vez.
> Rodando fora do compose, a API usa `PISTON_URL` (default `http://localhost:2000`)
> — suba o Piston standalone ou aponte para outra instância.

### Portas ocupadas

Se alguma porta já estiver em uso (ex.: um PostgreSQL nativo do Windows na
`5432`), sobrescreva no `.env`:

```bash
POSTGRES_PORT=5433
API_PORT=3100
# etc. (veja .env.example para a lista completa)
```

O `docker-compose.yml` expõe as portas com defaults que podem ser sobrescritos
por essas variáveis.

## Testes

```bash
pnpm test          # roda a suíte real (jest) de todos os workspaces
pnpm --filter @plataforma/api test:coverage   # cobertura da API
```

A suíte cobre as regressões de segurança: cliente do sandbox (fail-closed,
timeouts, limites de saída, linguagens não suportadas), webhook Gitea
(HMAC fail-closed, anti-replay por delivery ID, limite de payload),
validação de segredos no boot, exportação/exclusão LGPD.

## Segurança (resumo da Wave 1)

- Execução de código isolada via Piston (rede `sandbox-net` separada); sem `eval`/`new Function`/`execSync` no processo da API.
- Webhook do Gitea fail-closed: HMAC SHA-256 (`GITEA_WEBHOOK_SECRET`) sobre o raw body, anti-replay por `x-gitea-delivery`, limite de payload de 1 MB, idempotência por commit.
- Segredos sem defaults: boot falha se `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` ou `GITEA_WEBHOOK_SECRET` estiverem ausentes **ou com placeholders** (`change_me`).
- Auto-registro só cria `student`/`instructor` — nunca `admin`.
- Contas Gitea de alunos com senha aleatória e troca obrigatória no primeiro login.
- LGPD mínima: exportação completa (incluindo código das submissões) e exclusão propagada ao Gitea (repos + conta), logs sem PII.

> ⚠️ Os seeds (`seed:gitea`, `seed:data`) criam contas com senhas conhecidas para desenvolvimento local. **NUNCA rode os seeds contra ambientes de produção ou expostos à internet.**

## Estrutura

```
apps/
  api/    — NestJS API
  web/    — Next.js web
packages/
  (compartilhado, futuro)
```
