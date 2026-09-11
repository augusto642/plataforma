---
name: test-foundation
description: Use when setting up the real test infrastructure (jest + supertest) for apps/api, wiring package scripts, and writing regression specs for security fixes. Não use para outras mudanças.
---

# Skill: test-foundation

## Objetivo

Substituir o falso `pnpm test` (gerador que muta source) por uma suíte real de testes unitários/integração — e escrever os specs de regressão dos fixes de segurança desta rodada.

## Regras

1. **`pnpm test` nunca pode mutar código-fonte.** Remover `scripts/generate-ai-runner.js` do script `test`; deixá-lo acessível apenas como `pnpm codegen:ai-runner` (explícito), ou remover se obsoleto.
2. Setup `apps/api`:
   - devDeps: `jest`, `ts-jest`, `@types/jest`, `@nestjs/testing`, `supertest`, `@types/supertest`, `ts-node` (se necessário).
   - `jest.config.js` (ou `package.json#jest`): `preset: 'ts-jest'`, `testEnvironment: 'node'`, `rootDir: 'src'`, `moduleFileExtensions` padrão, `testRegex: '.*\\.spec\\.ts$'`, cobertura `collectCoverageFrom: ['**/*.service.ts','**/*.controller.ts','**/*.guard.ts']`.
   - Scripts: `test`, `test:unit`, `test:watch`, `test:coverage`.
3. Raiz `package.json`: `"test": "pnpm -r test"`, `"test:unit": "pnpm -r test:unit"`. Nenhum script raiz aponta para scripts/ se não for teste real.
4. Testes da API **não dependem de Postgres/Redis/Gitea/Piston em CI**: services testados com mocks (PrismaService mockado simples ou `jest-mock-extended` se já existente; HttpService mockado). Não adicionar libs de mock novas sem necessidade.
5. Specs de regressão a criar (na área correspondente do código):
   - `submissions/runner/*.spec.ts`: cliente Piston (mock HTTP) — sucesso, TO→timeout, OL/EL→output_limit, RE→runtime_error, rede indisponível→sandbox_unavailable, portugol→unsupported, payload contém run_memory_limit/run_timeout.
   - `webhooks/*.spec.ts`: os 7 casos da skill webhook-hardening (mock Prisma+Gitea — o controller deve receber mocks injetados).
   - `auth/*.spec.ts`: `validateRequiredSecrets` (casos da skill secrets-failfast); sanitização de PII do AiService se já testável.
   - `users/*.spec.ts` (se LGPD já aplicada): export inclui codeSnapshot; delete chama propagação Gitea.
6. `pnpm lint` deve ficar funcional: se `eslint` ausente nas devDeps e sem config, **instalar ESLint (versão compatível com Node 20) + config Nest padrão** (`@nestjs/eslint-plugin`, `typescript-eslint`) OU (se o tempo apertar) adicionar script `lint:fix` correto; ao menos `pnpm -r lint` não pode falhar por ausência de binário. O orquestrador valida.
7. Não editar `docker-compose.yml`, `.env*`, README, nem source de produção fora de adicionar specs (correções em production só quando o spec expuser bug óbvio do contrato — então registrar no relatório).

## Critérios de aceite

- `pnpm --filter @plataforma/api test` roda jest e passa.
- `pnpm test` (raiz) roda a suíte e **não altera nenhum arquivo** (verificar com checksum antes/depois).
- Cobertura inicial ≥ 30% com os specs novos (reporte número real).
- Lista de specs entregues com o que cada um prova.