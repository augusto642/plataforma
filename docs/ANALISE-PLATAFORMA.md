# Nexus Code — Análise Profunda da Plataforma

> Auditoria estática do repositório `augusto642/plataforma` (branch de análise, sem dependências instaladas — testes não executados), cruzada com a proposta de produto fornecida e pesquisa de mercado web. Evidências em `caminho:linha`. Pontos marcados com **(verificado)** foram conferidos diretamente por mim; os demais vêm dos agentes de exploração e devem ser confirmados antes de ação pública.

---

## 0. Veredito em uma página

| Dimensão | Nota | Síntese |
|---|---|---|
| Arquitetura/engenharia | **8/10** | Monorepo bem organizado, 37 módulos NestJS, Prisma 7, BullMQ, fail-closed em segredos, auth cookie-only com reuse detection. Acima da média para o estágio. |
| Aderência à proposta "1 line" | **~60%** | Esqueleto de quase tudo existe, mas vários pilares-chave são **PARCIAIS ou simulados**: pesquisa de vagas (hardcoded), busca semântica KMS (sem embeddings), progresso 48h (fictício), Jenkins/runners efêmeros (ausentes), Party multiplayer (sem websockets), billing (simulado). |
| Segurança | **7/10** | Boa base, mas 3 P1 reais: webhooks Sonar/CI aceitam requisição sem assinatura; Sonar falha "para cima" (dá nota A em erro); Piston `privileged: true` + `latest`. |
| Experiência do aluno | **6/10** | Jornada existe ponta a ponta, mas o "uau" da proposta (trilha minerada de vagas reais, IA que não entrega resposta, Torre viva) ainda é mais promessa de UI que mecânica comprovada. |
| Operabilidade por IA | **4/10** | Há logs, métricas Prometheus, eventos de uso de IA e filas; **não há** painel de custo, monitor de filas, auto-remediação, nem contrato de ferramentas para um agente operar. |
| Posicionamento de mercado | **Forte, se entregue** | Nenhum concorrente pesquisado faz "trilha derivada de vagas reais + ferramentas reais (Git/CI/Sonar) + certificado verificável + anti-cheat". Boot.dev é o mais próximo conceitualmente (só back-end, inglês). |

**Frase-resumo:** a plataforma tem corpo de produto sério e vários órgãos ainda de látex. A prioridade não é construir mais features, e sim trocar os 6–8 "stubs honestos" por implementações reais e corrigir os 3 P1 de segurança.

---

## 1. Aderência à proposta — item a item

Legenda: ✅ Implementado · 🟡 Parcial · 🔴 Ausente/Simulado

### 1.1 Entrada e diagnóstico
| Item da proposta | Status | Evidência |
|---|---|---|
| Cadastro + onboarding em etapas | ✅ | `apps/web/app/(app)/register/page.tsx:96,491` |
| Desafio em camadas com explicação própria | 🟡 | `register/components/StepExperienceChallenge.tsx:258-278` |
| Classificação semântica por IA (iniciante/júnior/pleno) | 🟡 | `apps/api/src/ai/registration-level.service.ts:773,836` — LLM com **fallback heurístico silencioso**; resultado pode ser apresentado como "IA" sendo regra. |
| Follow-up de 60 s | 🟡 | Existe no registro (`StepExperienceChallenge.tsx:234-248`), não no diagnóstico de skills. |
| Anti-cheat (copiar/colar, troca de aba) | 🟡 | `StepExperienceChallenge.tsx:204-229,648,726` — **só client-side**; contagem de blur é estado local, não há telemetria persistida nem detector no backend. |
| Diagnóstico de skills | 🟡 | `apps/api/src/diagnostic/diagnostic.service.ts:147-202` — quiz determinístico, não semântico. |

### 1.2 As 3 frentes de aprendizagem
| Item | Status | Evidência |
|---|---|---|
| Trilha dinâmica com investigação 48h em workers | 🟡 | Fila BullMQ real, concorrência 1 (`dynamic-track.processor.ts:28`), SLA 48h (`dynamic-track.rules.ts:640`). **Porém** o endpoint de progresso é cosmético **(verificado)**: `dynamic-track.controller.ts:135-166` calcula % por horas decorridas e retorna `workersActive: 4` fixo. |
| Mineração de vagas BR + internacionais | 🔴 | `knowledge/research/web-search.provider.ts` lança `ProviderUnavailable` ("Q3 pendente") **(verificado)**; `jobs-market.provider.ts:30-100` devolve **benchmarks hardcoded** (8.420 vagas, salários fixos) **(verificado)**. |
| YouTube / GitHub / livros | 🟡 | YouTube e GitHub reais (`youtube.provider.ts`, `github.provider.ts:17`); sem chave YouTube → fonte indisponível rotulada. Livros: sem provedor. |
| Módulo de imersão visual (espera) | 🟡 | `trilha/aguardando/page.tsx:170-176,364-387` — bonita, mas alimentada pelos dados fictícios acima. |
| Cursos avulsos + equivalência automática com trilha | 🟡 | Catálogo ok (`courses/page.tsx:29-48`); equivalência automática não encontrada. |
| Projetos guiados com árvore de pré-requisitos | 🟡 | Backend tem pré-requisitos (`guided-projects.service.ts:39,176`); UI lista, não desenha árvore. |

### 1.3 Níveis, IDE, execução
| Item | Status | Evidência |
|---|---|---|
| 3 níveis com desafios de graduação | 🟡 | Níveis existem; fluxo de graduação ponta a ponta não localizado. |
| IDE Monaco + preview | ✅ | `ide/components/IdeEditorPane.tsx`, `ide/page.tsx:1499-1525` (1.886 linhas — refatorar). |
| Preview Sandpack/WebContainers | 🔴 | É `iframe srcdoc` (`FrontendPreviewPane.tsx:59-80`). Suficiente para HTML/CSS/JS puro, não para Node/React com deps. |
| Piston (nível 1) | ✅ | `submissions/runner/runner.service.ts` (1.364 linhas). |
| Gitea + webhook HMAC | ✅ | `webhooks.controller.ts:120-179` fail-closed, timing-safe. |
| SonarQube | 🟡⚠️ | Integração real, **fallback inseguro** (ver §2). |
| Jenkins | 🔴 | Só string em tipos/docs. |
| Runners efêmeros / FinOps | 🔴 | Piston é serviço fixo; limite de concorrência por réplica (`runner.service.ts:269-290`). |

### 1.4 IA pedagógica
| Item | Status | Evidência |
|---|---|---|
| Gateway LLM multi-provider, kill switch, cota por plano | ✅ | `ai/llm-client.ts:28-60` **(verificado)** — ótimo desenho. Default `gemini-3.5-flash-lite`, thinking budget 128. |
| Tutor socrático que não dá resposta | 🟡 | Guardrails + golden set (`ai/golden/golden-set.spec.ts`), mas `socratic-guidance.service.ts:51-71` é por palavras-chave; LLM pode vazar solução — nenhuma avaliação viva contínua. |
| 3 dicas graduais com desconto de XP (10/25/50%) | 🟡 | `ai/socratic-tier.service.ts:52-103`; falhas de persistência são engolidas (fallback permissivo). |
| Cache semântico | 🔴 | Cache por string exata apenas. |
| Simulador de entrevista | ✅ | `interview/interview.service.ts` — LLM, cota, rubrica, fallback. |
| Code review IA (worker) | ✅ | `reviews/reviews.processor.ts:42-94` — exclui testes ocultos. Bom. |
| Certprep | 🟡 | Controller/service sem pipeline IA evidente. |

### 1.5 Gamificação e Torre
| Item | Status | Evidência |
|---|---|---|
| XP / níveis / badges | 🟡 | Vários caminhos de concessão (submissão, battle, torre, webhook) → risco de duplicação; existe CLI de reconciliação manual (`gamification/xp-reconciliation.ts`). |
| Nexus Coins | 🟡 | Torre credita 15 (`tower.service.ts:468,496`); economia geral rasa. |
| Streak com descanso | ✅ | Permite 2 dias de intervalo (regra mais frouxa que a proposta). |
| Ligas semanais / temporadas / hall da fama | 🟡 | Endpoints existem; promoção/rebaixamento automático não confirmado. |
| Torre 3D (three.js puro) | ✅ | `app/torre/components/Tower3DScene.tsx` |
| Dado no servidor, jogadas/dia, timer, origem−1 | ✅ | `tower.service.ts:166-298` — transação com `FOR UPDATE`, fail-closed se sandbox cai. Bem feito. |
| Mercador / itens / sabotagem | 🟡 | Dado duplo e escudo; `catch {}` em `tower.service.ts:207-218` engole erro de persistência (bug). |
| Multiplayer / Party em tempo real | 🔴 | Só persistência `TowerParty`; sem gateway WebSocket. |
| 4 tipos de desafio (código, lacuna, bug, quiz) | 🟡 | Só código via Activity; quiz/mini-game "atravessa a casa" (comentário no próprio serviço). |
| Jogo 2D (`(app)/game`) | ⚠️ | Engine Canvas de 1.840 linhas, **separada da Torre**, aleatoriedade local. Produto legado ou duplicado — decidir. |

### 1.6 Carreira, planos, operação
| Item | Status | Evidência |
|---|---|---|
| Certificados verificáveis | 🟡 | HMAC + páginas públicas (`certificate.service.ts:32`, `(public)/verify`); QR e Open Badges 3.0 não. |
| Match de vagas / Talent | 🟡 | `talent/match.service.ts`; sem fonte real de vagas (ver 1.2). |
| Freemium / Pro / B2B | 🟡 | Entitlements e guards ok (`plans/plan-entitlements.ts`); **billing 100% simulado** (`billing.module.ts:10-40`), Mercado Pago desligado, Pix ausente. |
| KMS/RAG (.md/.html, pgvector+FTS, MinIO) | 🔴 | JSON em `content/knowledge/`, busca por tags (`knowledge.service.ts:83-97`), sem pgvector/embeddings/MinIO. |
| Backoffice admin | 🟡 | Curadoria KMS, review queue, segmentos, orçamento (`admin.controller.ts:103-285`); **sem** monitor de filas nem dashboard de custos de IA. |

---

## 2. Erros e problemas priorizados

### P0 — corrigir antes de qualquer usuário real
1. **Webhooks Sonar e CI aceitam requisições sem autenticação** **(verificado)**. `webhooks.controller.ts:400-419`: `if (sonarSecret && signature)` — sem header, pula a verificação e segue creditando XP. Mesmo padrão em `:508-520` (`if (expectedSecret && (ciToken || ciSignature))`). Correção: exigir segredo configurado **e** assinatura presente; rejeitar 401 caso contrário; validar DTO do payload.
2. **Sonar falha "para cima"** **(verificado)**. `sonar/sonar.service.ts:117-120,146-148`: erro HTTP ou exceção retorna `qualityGateStatus: 'OK', rating A, coverage 80-85` → libera bônus de XP como se a análise tivesse passado. Correção: retornar `unavailable` e não conceder bônus (mesmo padrão fail-closed já usado em Piston/Torre).
3. **Piston `privileged: true` + imagem `latest`** (`docker-compose.yml:95-104`). Escape do sandbox = host. Fixar digest, remover privileged (Piston funciona com `cap_add` mínimo + seccomp), isolar rede (já em `sandbox-net`), limites de CPU/mem/pids.

### P1 — alto
4. **Dados de mercado fictícios apresentados como reais** **(verificado)** (`jobs-market.provider.ts`, `dynamic-track.controller.ts:135-166`). Risco reputacional e de CDC (propaganda enganosa) se for para produção com "8.420 vagas analisadas". Rotular como "estimativa" na UI até existir fonte real.
5. **Anti-cheat só no cliente** — qualquer DevTools desativa. Mover telemetria para o servidor (eventos de blur/paste no `Submission`), e preferir *desenho de avaliação* (variação de enunciado, execução ao vivo, pergunta oral de follow-up) a vigilância.
6. **Múltiplos caminhos de XP sem idempotência comprovada** (submissão × webhook × torre × battle). Chave de idempotência por `(userId, sourceType, sourceId)`.
7. **`catch {}` na Torre** (`tower.service.ts:207-218`) — item consumido sem efeito aplicado.
8. **Fallback heurístico silencioso no diagnóstico e nas dicas** — o aluno não sabe se foi IA ou regra. Expor `source` na UI (o backend já tem `TutorResponseSource`).

### P2 — médio
9. CORS/CSRF dependem de env (`COOKIE_SAME_SITE=none` permitido sem CSRF reforçado) — `main.ts:53-62`, `auth/cookies.util.ts:31-40`.
10. Arquivos gigantes: `ide/page.tsx` 1.886, `game/engine` 1.840, `runner.service.ts` 1.364, `registration-level.service.ts` 1.094, `courses.service.ts` 1.020.
11. Sem spec: `contact, cache, analytics, mail, gitea, prisma, knowledge/pipeline, housekeeping`. Cobertura global 40/35/30% (`jest.config.js:35-82`); `submissions.controller` a 0%.
12. Dois lockfiles (`package-lock.json` + `pnpm-lock.yaml`).
13. `docs/TEST-STRATEGY.md` desatualizado (diz que E2E está fora do CI; `ci.yml:106-198` tem job Playwright). `engine.spec.ts:1714` com `skip` para bug já corrigido.
14. `packages/contracts` sem consumidores.
15. LGPD: exclusão propaga para Gitea sem retry/auditoria (`users.service.ts:423-503`); nenhuma política para menores (B2B escolas).
16. Sem SAST/Dependabot/Trivy no CI; sem workflow de deploy/staging; sem estratégia de backup no compose.

### P3 — baixo
17. README descreve fluxo dev que conflita com compose de produção.
18. `skipLibCheck` ativo; `any` nas fronteiras de webhook.
19. Streak permite 2 dias de folga (proposta: 1 dia de descanso).

### Falso positivo descartado
- "IDOR em `DELETE /users/:id`" — rota tem `@Roles(Role.admin)` (`users.controller.ts:93-98`) **(verificado)**. Sem problema.

---

## 3. Frente 1 — O aluno que quer aprender a programar

### 3.1 O que já funciona bem
- Entrar, fazer o desafio de nível, cair numa trilha e resolver atividades no Monaco com execução real (Piston) e feedback por linha.
- Torre com dado servidor-side, limite diário e regra "origem−1": mecânica justa e difícil de burlar.
- Tutor com kill switch e cota: o aluno nunca vê erro 500, vê heurística rotulada.
- Simulador de entrevista e code review assíncrono são diferenciais concretos.

### 3.2 Dores prováveis (hipóteses a validar com 10 alunos)
| Dor | Causa no código | Impacto |
|---|---|---|
| "Esperei 48h e a trilha veio genérica" | Pesquisa de vagas é stub; LLM gera trilha com benchmarks fixos | Quebra a promessa central; churn no dia 3 |
| "A dica me deu a resposta" ou "a dica não ajudou nada" | Mistura de LLM e regra por palavra-chave sem rótulo visível | Perda de confiança no tutor |
| "Perdi XP e não sei por quê" | Vários caminhos de XP, sem extrato | Sensação de injustiça |
| "A Torre é só código, cadê quiz/item/sabotagem?" | Fase 2 não implementada | Gamificação parece vazia (crítica recorrente a Boot.dev/Duolingo) |
| "Não consigo rodar meu React" | Preview é iframe srcdoc | Bloqueia a trilha front-end moderna |
| "O certificado não abre no LinkedIn" | Sem Open Badges / QR | Baixo valor percebido |
| "Não consigo pagar" | Billing simulado, sem Pix | Receita zero |

### 3.3 Melhorias de maior alavancagem para o aluno
1. **Extrato de XP/Coins** (`/profile/ledger`) — transparência resolve metade das reclamações de gamificação.
2. **Rótulo de origem da dica** ("IA Nexus" vs "Dica automática") + botão "essa dica entregou a resposta?" → alimenta o golden set.
3. **Primeiro valor em 10 minutos**: enquanto a investigação 48h roda, entregar uma mini-trilha de 3 atividades do nível diagnosticado. Hoje a espera é passiva.
4. **Revisão espaçada** (SRS) de conceitos errados — nenhum concorrente BR faz bem; barato de implementar com `ActivityAttempt`.
5. **Sandpack** para front-end (gratuito, client-side) antes de pensar em WebContainers (licença comercial).
6. **Certificado Open Badges 3.0 + QR** — padrão de mercado em crescimento (badges emitidos 74,7 mi → 320 mi, 2022→2025).
7. **Modo "explique em voz alta"** no follow-up de 60 s (gravação curta → transcrição → LLM avalia compreensão). É o anti-cheat mais robusto possível: avalia entendimento, não código.
8. **Trilha de "fluência em IA"** (usar Copilot/ChatGPT com critério, revisar código gerado) — o mercado júnior caiu 11% e vagas IA subiram 60%; ensinar a *usar* IA é mais honesto que só bloquear.
9. **Pix + preço regional** (R$ 30–60/mês hipótese; Rocketseat ~R$ 183/mês, Boot.dev ~US$ 33/mês).
10. **Party assíncrona bem feita** antes de WebSocket: "seu amigo subiu 2 andares hoje" via notificação já gera pressão social.

### 3.4 Novas funcionalidades sugeridas (aluno)
- **Diário de aprendizagem gerado**: resumo semanal por IA do que aprendeu, onde travou, próximo passo.
- **Desafio de pares**: dois alunos recebem o mesmo bug; quem explica melhor a correção ganha.
- **Portfólio público verificável** (`/u/:handle`) com commits do Gitea, Quality Gate do Sonar e badges — isso é o que recrutador quer, não certificado.
- **Mentoria assíncrona Pro**: review humano de 1 projeto/mês (custo controlado, alto valor percebido).

---

## 4. Frente 2 — Um sistema de IA que gerencia toda a plataforma

### 4.1 O que já existe e serve de base
- Gateway LLM único configurável (`llm-client.ts`) com cota, registro de tokens/latência (`ai-usage.service.ts:183-313`).
- Filas BullMQ nomeadas (`track-investigation`, `track-generation`, `research`, `reviews`, `billing-events`) com retries e fail-closed.
- Prometheus protegido por `METRICS_TOKEN` (`metrics.controller.ts:22-30`), métricas HTTP e de saúde.
- Eventos de analytics; housekeeping agendado; KMS com versões/changelog/revisão humana.
- 8 prompts de agente em `.opencode/agents` — há cultura de agentes no projeto.

### 4.2 O que falta para uma IA operar a plataforma
| Capacidade | Hoje | Necessário |
|---|---|---|
| **Observar** | Logs Nest + Prometheus HTTP | Métricas de domínio: fila (waiting/failed/age), custo IA por dia/plano/modelo, taxa de fallback heurístico, taxa de `sandbox_unavailable`, % de dicas marcadas como "entregou resposta", conversão free→pro, churn D1/D7/D30 |
| **Decidir** | Nada | Regras/SLOs explícitos (ex.: fallback heurístico > 20% em 1h → alerta; custo IA > orçamento diário → reduzir cota free) |
| **Agir** | CLI de reconciliação manual; admin re-enfileira | **Contrato de ferramentas** (tool API interna, autenticada por service token): `requeueJob`, `pauseQueue`, `setFeatureFlag`, `adjustQuota`, `rollbackContent`, `reconcileXp(userId)`, `markInvestigationFailed` |
| **Guardrails** | Kill switch `AI_TUTOR_ENABLED` | Feature flags por módulo, orçamento de IA em env, modo degradado declarado, aprovação humana para ações irreversíveis (publicar conteúdo, estornar, banir) |
| **Auditar** | Logs | Tabela `OperatorAction` (quem/o quê/por quê/revertido) — vale tanto para humano quanto para IA |
| **Aprender** | Golden set estático | Loop: feedback do aluno → casos no golden set → avaliação viva semanal (`golden-live.spec.ts` já existe, rodar agendado) |

### 4.3 Riscos específicos de IA operando
- **Prompt injection via conteúdo do aluno** → tutor e review leem código do aluno; guardrails (`prompt-guard.ts`) são mitigação, não isolamento. Nunca dar ao agente operador ferramentas de escrita a partir do mesmo contexto que lê código de aluno.
- **Custo**: Khanmigo repassa custo de inferência no preço; sem cache semântico e batch, o free tier sangra. Priorizar: cache semântico (pgvector) → batch de reviews → modelo menor para dicas nível 1.
- **Decisão silenciosa**: a mesma honestidade "fail-closed rotulado" do código deve valer para o operador: toda ação automática visível no admin.

### 4.4 Mapeamento sugerido de modelos Fusion por frente de trabalho
| Frente | Modelo sugerido | Motivo |
|---|---|---|
| Planejamento/arquitetura (refatorar `ide/page.tsx`, desenhar tool API) | GPT-6 Astra / Claude Fable 5.2 | Raciocínio longo, múltiplos arquivos |
| Implementação de features | GPT-6.1 Terra / Claude Sonnet 5.5 / GPT-5.3-Codex | Código rápido e preciso |
| Correção dos P0 de segurança | Claude Opus 5.5 / GPT-6.1 Sol | Cuidado com efeitos colaterais, testes |
| Revisão de segurança/PRs | Gemini 4 Carbon | Contexto longo para diff + schema |
| Tarefas pequenas, lint, docs | Haiku 5.5 / GPT-6 Luna | Custo |
| Tutor em produção (não Fusion) | Gemini 3.5 Flash-Lite (atual) p/ dica 1-2; Flash p/ dica 3 e entrevista | Já provado no gateway; custo por token |

---

## 5. Mercado, concorrentes e oportunidades

### 5.1 Concorrentes (preços 2025-26, validar nas fontes primárias)
| Nome | Modelo | Preço | Forças | Fraquezas vs Nexus |
|---|---|---|---|---|
| **Rocketseat** (BR) | Assinatura anual | R$ 2.197/ano (~R$ 183/mês) | +100 projetos, tutor IA, Talent Space | Vídeo-centrado; sem gamificação profunda nem ferramentas reais integradas |
| **Alura** (BR) | Assinatura | Variável/promocional | Catálogo gigante, imersões grátis | Catálogo estático; não derivado de vagas |
| **Kenzie** (BR) | Bootcamp/ISA | R$ 22 mil ou ISA 17% | Intensivo | Caro; modelo ISA sob pressão |
| **Trybe** (BR) | ISA | n/v | Paga só após emprego | Escala limitada |
| **DIO, Ada, Driven, EBAC, FIAP, Descomplica** (BR) | n/v | n/v | — | não verificados |
| **Boot.dev** (EUA) | Freemium | US$ 399/ano | XP, guildas, boss battles, tutor Boots socrático, preço por país | Só back-end; inglês; projetos rodam localmente. **Concorrente conceitual mais próximo.** |
| **Codecademy** | Freemium | US$ 14,99–19,99/mês | Marca | Dólar; tutor IA genérico |
| **Khanmigo** | Sem fins lucrativos | US$ 4/mês; escolas US$ 35/aluno/ano | Socrático, barato | Não é programação profissional |
| **Duolingo** | Freemium | n/v | Referência de ligas/streak: DAU 52,7 mi, 12,2 mi pagantes, US$ 1,04 bi (FY2025) | Não é programação |

Fontes: rocketseat.com.br/assinatura; boot.dev/pricing; myelearningworld.com/codecademy-pricing; marketscreener.com (Duolingo Q4 FY2025); reclameaqui.com.br (Kenzie).

### 5.2 Tendências 2025-26
- **Tutor socrático virou commodity** (Boots, Khanmigo, Rocketseat). Diferencial passa a ser *verificabilidade + integração com avaliação*, não ter tutor.
- **Mercado júnior pressionado**: Gartner — 22% dos RHs reduziram vagas de entrada por IA (Valor, ago/2026); Bain — anúncios BR caíram 39% jun/25→jun/26, júnior −11%, IA +60% (Valor, out/2026). **Não prometer emprego**; prometer portfólio provado e fluência em IA.
- **Credenciais verificáveis**: badges emitidos 74,7 mi → 320,4 mi (1EdTech, 2022→2025). Open Badges 3.0.
- **Déficit de TI** (Brasscom 2021: ~106 mil/ano) convive com desemprego júnior → tese correta é *lacuna de qualificação*, não falta de gente.
- EdTech BR: >47% das startups da LatAm (Distrito 2025).

### 5.3 Lacunas que ninguém pesquisado ocupa (oportunidades)
1. Trilha gerada de **vagas reais** BR + remoto — **ninguém faz**; é a tese do Nexus, hoje um stub. Oportunidade nº 1 e risco nº 1.
2. Progressão para **ferramentas reais** (Git/CI/Sonar/Docker) dentro da plataforma.
3. **Anti-cheat por desenho** + certificado verificável.
4. Gamificação com **profundidade** (Torre 3D, economia de coins) em português.
5. **Pix + preço regional**; B2B escolas (referência Khanmigo US$ 35/aluno/ano).
6. **Fluência em IA como competência avaliada** — ninguém certifica "sabe usar IA sem ser usado por ela".

### 5.4 Riscos de mercado
- Custo de inferência em freemium BR; IA gratuita (ChatGPT/Gemini) como substituto do tutor.
- Falso positivo de anti-cheat destrói confiança.
- Scraping de vagas pode violar ToS (LinkedIn/Gupy) → preferir APIs oficiais/parcerias/fontes abertas (Programathor, GitHub Jobs-like, Adzuna API, Jooble API).
- LGPD com menores e telemetria.
- Infra pesada (Gitea+Sonar+Jenkins+Docker por aluno) → só no Pro, e efêmera.
- Conclusão de MOOC grátis ~15–20% vs pago 60–65% → compromisso (anual, ligas) importa.

---

## 6. Roadmap sugerido (90 dias)

### Sprint 0 (1 semana) — segurança e honestidade
- [ ] P0 1–3 (webhooks fail-closed, Sonar fail-closed, Piston sem privileged + digest).
- [ ] Rotular dados fictícios na UI de espera ("estimativa de mercado") e remover `workersActive: 4`.
- [ ] Expor `source` da dica na UI.
- [ ] Remover `package-lock.json`, atualizar TEST-STRATEGY.md, reativar teste skip.

### Mês 1 — trocar stubs pela coisa real
- [ ] Decidir Q3 (provedor de busca): recomendação **Tavily ou Serper** + **Adzuna/Jooble API** para vagas; orçamento diário em env.
- [ ] Idempotência de XP + extrato.
- [ ] Telemetria anti-cheat no servidor (sem bloquear, só registrar) + follow-up oral opcional.
- [ ] Billing real: Mercado Pago (já existe desligado) com Pix.
- [ ] Sandpack no preview.

### Mês 2 — IA operável
- [ ] Métricas de domínio (filas, custo IA, fallback rate) no Prometheus + painel admin de custos.
- [ ] Tabela `OperatorAction` + tool API interna (requeue, pause, flag, quota).
- [ ] Cache semântico com pgvector (serve KMS e tutor).
- [ ] Golden set vivo semanal agendado.

### Mês 3 — profundidade de produto
- [ ] Torre Fase 2: quiz, lacuna, bug-hunt, itens de sabotagem; Party assíncrona com notificações.
- [ ] Open Badges 3.0 + QR; portfólio público.
- [ ] SRS de conceitos; mini-trilha imediata durante as 48h.
- [ ] Refatorar `ide/page.tsx` e `runner.service.ts`; cobertura mínima 60% em submissions/webhooks/auth.

---

## 7. Limites desta análise
- Estática: sem `node_modules`, sem rodar testes/E2E/lint.
- Agentes cobriram amostras; "PARCIAL" = capacidade existe no código, não que foi validada em produção.
- Dados de mercado: várias fontes secundárias/agregadores; validar nas primárias (10-K Duolingo, Distrito, Brasscom, páginas de preço) antes de pitch.
- Não pesquisados: Descomplica, FIAP, EBAC, DIO, Ada, Driven, Replit, Mimo, Scrimba, Exercism; eficácia técnica de anti-cheat contra LLM; regulação LGPD para menores.
