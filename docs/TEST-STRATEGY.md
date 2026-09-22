# Estratégia de Testes — Nexus Code

## Estado atual (medido 2026-09-22)

- API: 21 suites / 204 testes jest verdes (~60s), coverage global 41,4% stmts / 38,1% branches / 32,2% funcs / 41,5% lines (thresholds no jest.config.js: 40/35/30/40; submissions 75/67/65/74; webhooks 84/64/80/84)
- Coverage por módulo: evaluator 100% | admin 88-91% | runner 87% | webhooks 86% | gamification 82% | metrics 76% | cache.service 69% | users.service 64% | auth.service 62% | gitea 57% | socratic-cat 56% | ai.service 37% | 0%: line-feedback, courses, activities, talent, housekeeping, requests controllers exceto admin/webhooks | guards: roles 43%, jwt-auth 54%
- Web: Vitest configurado (pnpm --filter @plataforma/web test) — 95 testes de game engine (88→95 após correção da Onda 2); 3 specs e2e Playwright fora do CI ainda

## Lacunas priorizadas (risco)

1. courses/ e talent/ sem teste — autorização (IDOR de report/certificado) e LGPD B2B
2. auth.refresh/register no service — rotação de token, auto-registro nunca admin
3. submissions.findOne — anti-IDOR e strip de hidden tests
4. roles.guard/jwt-auth guard — autorização por decorator
5. ai line-feedback + fetch path real do LLM com LlmClient mockado
6. webhook em HTTP-level (supertest + rawBody real) — hoje testado só em nível de controller
7. e2e no CI: job com docker compose (api+web+piston+gitea) + fixtures próprias (NUNCA seeds de produção)

## Regras do time

- Toda correção de segurança recebe spec de regressão no mesmo commit
- Coverage thresholds só sobem (nunca caem sem aprovação)
- Testes de segurança da API rodam no CI com NODE_ENV=test

Assinatura: orquestrador Hermes, Fase 2.