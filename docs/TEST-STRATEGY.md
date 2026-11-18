# Estratégia de Testes — Nexus Code

## Estado atual (medido 2026-09-22)

- API: 21 suites / 204 testes jest verdes (~60s), coverage global 41,4% stmts / 38,1% branches / 32,2% funcs / 41,5% lines (thresholds no jest.config.js: 40/35/30/40; submissions 75/67/65/74; webhooks 84/64/80/84)
- Coverage por módulo: evaluator 100% | admin 88-91% | runner 87% | webhooks 86% | gamification 82% | metrics 76% | cache.service 69% | users.service 64% | auth.service 62% | gitea 57% | socratic-cat 56% | ai.service 37% | 0%: line-feedback, courses, activities, talent, housekeeping, requests controllers exceto admin/webhooks | guards: roles 43%, jwt-auth 54%
- Web: Vitest configurado (pnpm --filter @plataforma/web test) — 95 testes de game engine (88→95 após correção da Onda 2); o smoke E2E do Playwright roda no job `e2e` de `.github/workflows/ci.yml` com Postgres, Redis, migrations e seed próprios.

## Lacunas priorizadas (risco)

1. courses/ e talent/ sem teste — autorização (IDOR de report/certificado) e LGPD B2B
2. auth.refresh/register no service — rotação de token, auto-registro nunca admin
3. submissions.findOne — anti-IDOR e strip de hidden tests
4. roles.guard/jwt-auth guard — autorização por decorator
5. ai line-feedback + fetch path real do LLM com LlmClient mockado
6. webhook em HTTP-level (supertest + rawBody real) — hoje testado só em nível de controller
7. Expandir o smoke E2E no CI para cobrir fluxos críticos; o job atual valida o smoke web com API, Postgres/Redis e seed de teste, mas não sobe Piston nem Gitea.

## Regras do time

- Toda correção de segurança recebe spec de regressão no mesmo commit
- Coverage thresholds só sobem (nunca caem sem aprovação)
- Testes de segurança da API rodam no CI com NODE_ENV=test

## Incremento — resultados do tutor e controles de IA

- Suíte completa da API: 133 suítes passaram, 1 foi ignorada; 1.447 testes passaram e 18 foram ignorados.
- Coverage medido: 77,13% statements / 61,68% branches / 70,59% functions / 78,51% lines. Linhas por grupo: auth 90,06%, submissions 88,74%, webhooks 90,20% — acima da meta de 60%.
- API e web compilam; `prisma validate` confirma o schema dos registros de feedback/auditoria.
- Feedback é categórico e não persiste código nem texto de conversa. A avaliação live continua opt-in e não roda chamadas pagas no CI padrão.
- O refactor de `ide/page.tsx` e `runner.service.ts` continua pendente, separado da meta de cobertura já atendida.

Assinatura: orquestrador Hermes, Fase 2.

## Evidência de habilidades (teste local)

`pnpm --filter @plataforma/api test -- --runTestsByPath src/dynamic-track/skill-evidence.service.spec.ts src/dynamic-track/dynamic-track.controller.spec.ts src/knowledge/research/jobs-market.provider.spec.ts src/ai/tutor-chat.service.spec.ts src/ai/socratic-guidance.service.spec.ts` usa vagas e avaliações simuladas, sem credenciais externas. Fontes reais continuam exigindo configuração e orçamento; não há fallback de vagas fictícias.

Na trilha sugerida, apenas JavaScript, TypeScript e Python podem ser recomendados, e somente quando há no curso inicial uma atividade de funções com testes; os demais sinais canônicos são observações excluídas, com motivo, não recomendações. Java também é excluído do portfólio: o runner não acrescenta os testes a código que já declara uma classe. Isso não afirma cobertura de outros cursos ou habilidades. O portfólio privado lista as 200 submissões aprovadas mais recentes elegíveis com testes e permite exportação selecionada, não assinada. Os testes são executados no mesmo programa da submissão; não são evidência resistente a código adversarial ou comprovação de domínio. Dados da atividade são atuais, não um snapshot histórico; cópias exportadas não podem ser revogadas. O filtro do tutor reduz vazamentos de blocos longos, mas não garante que uma resposta curta ou em prosa não revele a solução.

A avaliação de transferência é um exercício separado de interpretação de função e condições, com cinco entradas e rubrica determinística no servidor. Exige submissão própria aprovada de atividade etiquetada `funcoes`, permite uma tentativa por submissão e armazena somente versão, pontuação, aprovação e data, não respostas ou código. Não usa o tutor integrado; ajuda externa e múltiplas submissões de prática não podem ser verificadas ou impedidas. É evidência limitada de interpretação, não prova supervisionada de autonomia nem avaliação de implementação de código. Seu resultado entra no portfólio e, quando presente, na credencial emitida depois da tentativa, inclusive se não atingir o critério. A migration `20261115150000_add_transfer_attempts` deve ser aplicada antes de habilitar a versão nova.

As fixtures sintéticas `market-role-fixtures.mjs` representam dois perfis exclusivamente nos testes e não são registradas como provedores de produção. O teste integrado usa runner simulado: não comprova execução em Piston real, acesso HTTP completo, resultado de mercado real ou eficácia pedagógica. Pilotos externos com alunos/empregadores continuam bloqueados até recrutamento, consentimento e avaliação reais.

## Credenciais assinadas

Após `pnpm --filter @plataforma/api build`, execute `pnpm --filter @plataforma/api test:credentials`. Os testes geram uma chave Ed25519 determinística exclusivamente em memória, sem rede, e validam expansão JSON-LD segura, prova, alterações indevidas, autorização, ausência de configuração e assets do build. A emissão é acionada pelo aluno em um resultado próprio, sem armazenamento ou publicação automática da credencial. O arquivo assinado contém identificador estável da conta, critérios e resultado resumido; o aluno deve avaliar a privacidade antes de compartilhá-lo. O identificador não prova o controle de uma identidade externa. Sem estado de revogação implementado, cópias não podem ser revogadas.

O formato usa VC Data Model 2.0 e `DataIntegrityProof` com `eddsa-rdfc-2022`, conforme a [especificação Open Badges](https://standards.1edtech.org/open-badges/specifications/standards/v3p0) e o [guia de conformidade](https://standards.1edtech.org/open-badges/specifications/standards/v3p0/cert); o [guia de implementação](https://standards.1edtech.org/open-badges/guides/standards/v3p0/impl) descreve a emissão. Esses testes não constituem certificação 1EdTech nem avaliação externa de valor da conquista.

Para implantação, provisionar externamente par Multikey Ed25519 e `OB_ISSUER_ID`, `OB_ISSUER_NAME`, `OB_ED25519_PUBLIC_KEY_MULTIBASE`, `OB_ED25519_SECRET_KEY_MULTIBASE` no gerenciador de segredos; sem todos, ou com chaves incompatíveis, a emissão falha fechada. O identificador HTTPS configurado deve corresponder ao endpoint público `/credentials/issuer`, com a rota `/credentials/issuer/keys/<publicKeyMultibase>` acessível pelo mesmo domínio, para resolução independente. Em produção as chaves públicas das fixtures são rejeitadas. Antes de rotacionar uma chave, manter externamente disponíveis os documentos públicos antigos e o método de asserção correspondente no perfil do emissor: a API somente expõe a chave configurada atualmente. Definir política operacional de guarda, rotação e eventual revogação antes de uso real.