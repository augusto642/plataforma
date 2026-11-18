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
openssl rand -hex 32   # -> CERTIFICATE_HMAC_SECRET
openssl rand -hex 32   # -> GITEA_WEBHOOK_SECRET
openssl rand -hex 32   # -> BILLING_WEBHOOK_SECRET
#    Cole os valores no .env

# 3. Subir a aplicação local e o Piston local.
#    Em produção, não use --profile local-piston: consulte a seção
#    "Runner Piston dedicado" em docs/OPERATIONS-SECURITY.md.
docker compose --profile local-piston up -d --build

# 4. O piston-init instala Node, Python e Java; o init Portugol provisiona
#    o pacote customizado. Confira os logs antes de usar:
docker compose --profile local-piston logs piston-init piston-portugol-init

# 5. Aplicar migrations (o container da API já faz no boot; localmente:)
pnpm db:migrate

# 6. Seed do Gitea (instala a instancia + cria org e service account)
pnpm seed:gitea
#   -> imprime um GITEA_TOKEN; copie para o .env (GITEA_TOKEN=<valor>)

# 7. Seed dos dados demo (usuarios, cursos, atividades)
pnpm seed:data

# 8. Reiniciar a API para carregar o GITEA_TOKEN
docker compose --profile local-piston up -d api
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

A página inicial (`/`) oferece três desafios sem cadastro. O editor avalia
expressões simples no navegador, sem chamar a IA ou o executor da plataforma
e sem salvar o progresso na conta. Depois do desafio, o cadastro segue em `/register`.
A seção da Torre na página inicial usa WebGL quando disponível e uma animação 2D
quando não há suporte. Com movimento reduzido, os dados podem ser sorteados sem
animação. O botão **Abrir a Torre** leva ao guia ilustrado em `/conheca-a-torre`;
a partida continua em `/torre`.
O cadastro por e-mail pede e-mail, senha e uma única caixa para aceitar os Termos
de Uso, declarar ciência da Política de Privacidade e confirmar idade de 18 anos
ou mais. Já o perfil de aprendizagem (`/perfil-inicial`)
é opcional e fica para o primeiro acesso. Quem pular pode preenchê-lo em
Configurações → Perfil. A API requer a migração `20261117193500_learning_profile_pending`.
Em `/login`, **Esqueci minha senha** solicita um link de uso único, válido por
30 minutos, para contas com senha. Para habilitar o envio, aplique a migração
`20261117205600_password_reset` e configure o SMTP da API (`MAILER_PROVIDER=smtp`)
e `WEB_PUBLIC_URL` com a URL pública da plataforma.
O e-mail digitado no login é reaproveitado ao navegar para a recuperação, sem
entrar na URL. A confirmação do pedido permite corrigir o endereço sem revelar
se ele está cadastrado. Links inválidos ou expirados levam a um novo pedido.
As prévias de [login](http://localhost:3001/prototype/acesso/login) e
[cadastro](http://localhost:3001/prototype/acesso/cadastro) simulam apenas a interface,
sem autenticar, criar contas ou substituir as rotas reais.
O [protótipo do painel do aluno](http://localhost:3001/prototype/dashboard) usa dados
fictícios para simular o primeiro acesso, praticar com dicas preparadas e acompanhar
a missão do dia e o extrato de XP de exemplo. Os atalhos para páginas reais ficam
em **Recursos da plataforma**, com as restrições de plano indicadas junto aos links.
Ao recarregar, a prévia volta ao estado inicial; ela não altera
`/dashboard` nem salva dados na conta.

> Os dois modos (docker vs. local) disputam as mesmas portas. Use um de cada vez.
> Rodando fora do compose, a API usa `PISTON_URL` (default `http://localhost:2000`).
> Para runner remoto, configure também `PISTON_AUTH_TOKEN` e use o worker dedicado
> descrito em `docs/OPERATIONS-SECURITY.md`.

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
