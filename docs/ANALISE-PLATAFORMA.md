# Nexus Code — Análise Profunda da Plataforma

> Revisão atualizada em 15/11/2026 do repositório `augusto642/plataforma`, considerando as implementações recentes, testes direcionados, builds e configuração de deploy. É uma avaliação de código e prontidão operacional — não é pentest nem validação com usuários. Adapters de vagas, Mercado Pago e worker Piston não foram exercitados contra serviços reais neste workspace.

---

## 0. Veredito em uma página

**Nota global ponderada estimada: 7,6/10** (valor não arredondado: 7,555; +0,155 sobre 7,40). A análise também passa a cobrir configuração do Prometheus implantável por perfil, retenção persistente e falha explícita diante de `REDIS_URL` inválida. A migration da trilha ainda não foi aplicada; isso é evidência de implementação, não de operação em produção. Confiabilidade e operação permanece em **6,2**: o profile de monitoramento e as regras estão configurados, mas Alertmanager, baseline/SLO e tráfego real ainda não foram validados; a transferência por código também não foi exercitada contra Piston real. O potencial da proposta fica em **8,5/10**, condicionado a dados reais e validação externa.

| Dimensão | Antes | Atual | Síntese e principal limite |
|---|---:|---:|---|
| Diferenciação do produto | 8,0 | **8,7** | Há fluxo testável de sinal de vaga → skill → prática → credencial e transferência por código em problema distinto. Dados reais de vagas e revisão por recrutadores continuam pendentes. |
| Cobertura da proposta | 7,0 | **8,0** | Tutor hint-first, exclusões explicadas, credencial e transferência executada em código estão cobertos. A prática continua limitada a JS/TS/Python no curso inicial. |
| Arquitetura/engenharia | 7,5 | **7,7** | A avaliação reutiliza o runner existente, sem criar um segundo caminho de execução; a conexão BullMQ agora valida `REDIS_URL`, credenciais, banco e TLS sem fallback silencioso. Permanecem módulos grandes e dependências externas. |
| Experiência do aluno | 6,5 | **7,4** | A avaliação oferece exemplos públicos e concretos, confirmação antes da tentativa única, instrução associada ao editor e estado de resultado acessível; ainda faltam testes de usabilidade com alunos. |
| Aprendizagem/pedagogia | 6,5 | **7,4** | Exemplos cobrindo entrada não positiva, faixa intermediária e limite complementam a pergunta reflexiva; o feedback não revela casos ocultos. Ganho de aprendizagem ainda não foi medido. |
| Segurança e integridade | 7,0 | **7,6** | Além dos limites de execução e allowlist de modelos, mudanças de papel/plano, cursos e salas especializadas são auditadas; tokens de scrape fracos são rejeitados e Prometheus fica restrito ao loopback. A migration não foi aplicada; isolamento Piston e auditoria externa seguem pendentes. |
| Testes | 7,5 | **8,9** | Testes verificam parsing seguro de Redis e tokens; CI valida sintaxe de configuração e regras Prometheus com `promtool`, além dos testes de transferência. O runner ainda não equivale a E2E com Piston real. |
| Operabilidade por IA | 6,0 | **7,2** | Tutor hint-first, uso/custo/fallback, latência diária, gestão de salas/modelos e auditoria de controles de fila e configuração de salas são observáveis; o perfil Prometheus coleta essas métricas com retenção. Tarifas customizadas, avaliação viva e operação de produção ainda faltam. |
| Confiabilidade e operação | 5,5 | **6,2** | Profile Compose provisiona scrape autenticado, retenção TSDB de 15 dias e regras de alerta; Alertmanager/notificações, SLOs calibrados por baseline e restore drill continuam pendentes. |
| Prontidão comercial | 4,5 | **4,8** | Pré-voo de sandbox, proteção contra novo checkout com acesso vigente e preço em centavos compartilhado entre API e vitrine; pagamento real, concorrência, webhook/Pix e métricas comerciais seguem sem validação externa. |

O cálculo global é uma **estimativa ponderada**, não uma métrica observada: diferenciação 15%, cobertura 15%, experiência 10%, pedagogia 10%, arquitetura 10%, segurança 10%, testes 10%, operabilidade por IA 5%, confiabilidade/operação 5% e prontidão comercial 10%. Nesta rodada, arquitetura, segurança e testes (+0,1 cada), operabilidade por IA e confiabilidade (+0,1 cada) acrescentam +0,04 à média ponderada, de 7,515 para 7,555; arredondada a uma casa decimal, a estimativa global passa de 7,5 para 7,6. Fixtures sintéticas, limites provisórios e ausência de telemetria de produção não comprovam valor de mercado, disponibilidade real ou aprendizagem.

**Frase-resumo:** o Nexus está mais diferenciado e tem melhor cobertura testável da proposta. É candidato a piloto controlado, mas ainda não a lançamento público com pagamento e execução de código até configurar a infraestrutura, revisar alertas de dependências e validar o fluxo com alunos e profissionais.

---

## 1. Aderência à proposta — item a item

Legenda: ✅ Implementado · 🟡 Parcial · 🔴 Ausente/Simulado

### 1.1 Entrada e diagnóstico
| Item da proposta | Status | Evidência |
|---|---|---|
| Cadastro + onboarding em etapas | ✅ | `apps/web/app/(app)/register/page.tsx:96,491` |
| Desafio em camadas com explicação própria | 🟡 | `register/components/StepExperienceChallenge.tsx:258-278` |
| Classificação semântica por IA (iniciante/júnior/pleno) | 🟡 | `apps/api/src/ai/registration-level.service.ts:773,836` — LLM com fallback heurístico; a API retorna `source: llm|heuristic` e a interface informa a origem. A classificação continua sem avaliação viva de qualidade. |
| Follow-up de 60 s | 🟡 | Existe no registro (`StepExperienceChallenge.tsx:234-248`), não no diagnóstico de skills. |
| Integridade da avaliação inicial | 🟢 | Pergunta de follow-up é gerada pelo servidor e vinculada por token HMAC ao desafio; sinais de foco/clipboard do cliente não alteram a nota. Prometheus recebe somente contagens agregadas por origem/confiança, sem respostas ou código. |
| Diagnóstico de skills | 🟡 | `apps/api/src/diagnostic/diagnostic.service.ts:147-202` — quiz determinístico, não semântico. |

### 1.2 As 3 frentes de aprendizagem
| Item | Status | Evidência |
|---|---|---|
| Trilha dinâmica com investigação 48h em workers | 🟡 | Fila BullMQ real, concorrência 1 (`dynamic-track.processor.ts:28`), SLA 48h (`dynamic-track.rules.ts:640`). A API agora informa estado/tempo registrado; percentual e quantidade de workers não são apresentados sem telemetria granular. |
| Mineração de vagas BR + internacionais | 🟡 | Adzuna usa o mercado `/br`; Tavily busca em português e prioriza o Brasil. As chaves e o orçamento diário continuam desligados até configuração; a UI não apresenta dados sem coleta real. |
| YouTube / GitHub / livros | 🟡 | YouTube e GitHub reais (`youtube.provider.ts`, `github.provider.ts:17`); sem chave YouTube → fonte indisponível rotulada. Livros: sem provedor. |
| Módulo de imersão visual (espera) | 🟡 | A página mostra estado/tempo registrados e informa que não há telemetria granular; percentual, workers e etapas simuladas foram removidos. A pesquisa real de vagas depende de credenciais e orçamento habilitado. |
| Cursos avulsos + equivalência automática com trilha | 🟡 | Catálogo ok (`courses/page.tsx:29-48`); equivalência automática não encontrada. |
| Projetos guiados com árvore de pré-requisitos | 🟡 | Backend tem pré-requisitos (`guided-projects.service.ts:39,176`); UI lista, não desenha árvore. |

### 1.3 Níveis, IDE, execução
| Item | Status | Evidência |
|---|---|---|
| 3 níveis com desafios de graduação | 🟡 | Níveis existem; fluxo de graduação ponta a ponta não localizado. |
| IDE Monaco + preview | ✅ | `ide/components/IdeEditorPane.tsx`, `ide/page.tsx:1499-1525` (1.886 linhas — refatorar). |
| Preview front-end | 🟡 | HTML/CSS/JS continua em iframe sandboxed; React roda client-side via Sandpack. Node e WebContainers não estão incluídos. |
| Piston (nível 1) | ✅ | `submissions/runner/runner.service.ts` (1.364 linhas). |
| Gitea + webhook HMAC | ✅ | `webhooks.controller.ts:120-179` fail-closed, timing-safe. |
| SonarQube | 🟡 | A integração falha explicitamente quando indisponível e webhooks exigem autenticação; ainda depende do serviço/segredo configurados no ambiente. |
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
| XP / níveis / badges | ✅ | Toda concessão passa pelo ledger com chave única por usuário e gravação transacional (submissão, battle, Torre, bônus diário e projeto/webhook); histórico autenticado disponível no dashboard. Reconciliação permanece como ferramenta administrativa. |
| Nexus Coins | 🟡 | Torre credita 15 (`tower.service.ts:468,496`); economia geral rasa. |
| Streak com descanso | ✅ | Uma folga por semana ISO (segunda a domingo UTC), aplicada sem resetar a sequência. |
| Ligas semanais / temporadas / hall da fama | 🟡 | Endpoints existem; promoção/rebaixamento automático não confirmado. |
| Torre 3D (three.js puro) | ✅ | `app/torre/components/Tower3DScene.tsx` |
| Dado no servidor, jogadas/dia, timer, origem−1 | ✅ | `tower.service.ts:166-298` — transação com `FOR UPDATE`, fail-closed se sandbox cai. Bem feito. |
| Mercador / itens / sabotagem | ✅ | Escudo, dado duplo, ampulheta e banana competitiva; banana só atinge integrante da mesma party e aplica no próximo movimento. |
| Party assíncrona | ✅ | Convite por ID, limite de 4, transferência de liderança e feed de andares concluídos nas últimas 24 h. |
| Multiplayer / Party em tempo real | 🔴 | Gateway WebSocket e sincronização ao vivo continuam fora do escopo. |
| 4 tipos de desafio (código, lacuna, bug, quiz) | ✅ | Código via Activity; quiz, bug-hunt e lacunas com gabarito server-side e resolução transacional. |
| Jogo 2D (`(app)/game`) | ⚠️ | Engine Canvas de 1.840 linhas, **separada da Torre**, aleatoriedade local. Produto legado ou duplicado — decidir. |

### 1.6 Carreira, planos, operação
| Item | Status | Evidência |
|---|---|---|
| Certificados verificáveis | 🟡 | Registro verificável e página pública; a página canônica agora inclui QR para validação. Open Badges 3.0 ainda não está implementado. |
| Match de vagas / Talent | 🟡 | `talent/match.service.ts`; sem fonte real de vagas (ver 1.2). |
| Freemium / Pro / B2B | 🟡 | Entitlements e guards existem; Mercado Pago tem checkout recorrente em modo de teste e pode oferecer Pix conforme a conta. Credenciais, Webhook público HTTPS e ativação no ambiente continuam pendentes; billing live está bloqueado. |
| KMS/RAG (.md/.html, pgvector+FTS, MinIO) | 🔴 | JSON em `content/knowledge/`, busca por tags (`knowledge.service.ts:83-97`), sem pgvector/embeddings/MinIO. |
| Backoffice admin | 🟡 | Gestão básica de cursos e salas especializadas, allowlist de modelos, métricas/controles de filas e auditoria visível de filas, usuários, cursos e salas. Continua sem auditoria de KMS/instrutores, métricas da VPS, logs centralizados, integração de backup/restore ou tarifas para modelos customizados. |

---

## 2. Erros e problemas priorizados

### P0 — corrigir antes de qualquer usuário real
1. **Corrigido nesta rodada: webhooks Sonar e CI aceitavam requisições sem autenticação.** `webhooks.controller.ts`: agora exigem segredo configurado e credencial; Sonar também exige corpo bruto e HMAC válido; CI valida token em tempo constante.
2. **Corrigido nesta rodada: Sonar falhava "para cima".** `sonar/sonar.service.ts`: erro HTTP, falha de rede ou resposta sem Quality Gate explícito agora resulta em indisponibilidade, não em nota A. O webhook também deixou de inventar ratings/cobertura na ausência de métricas.
3. **Isolamento Piston preparado para implantação dedicada.** A imagem está fixada por digest e o [upstream do Piston](https://github.com/engineer-man/piston) documenta `privileged: true` como requisito do mecanismo de sandbox. O Compose agora mantém o runner local em perfil explícito e oferece worker separado, gateway com bearer token e apenas endpoint de execução; a VM e a VPN ainda precisam ser provisionadas pelo operador.

### P1 — alto
4. **Parcialmente resolvido:** a integração de vagas agora usa Adzuna e Tavily, com contagem de habilidades a partir de resultados reais. Sem credenciais e `JOB_RESEARCH_DAILY_BUDGET` positivo, permanece fail-closed; progresso granular de workers continua indisponível.
5. **Corrigido nesta rodada: integridade da avaliação de cadastro.** A pontuação não usa contadores de foco controlados pelo navegador; a pergunta de follow-up é assinada pelo servidor, vinculada ao desafio e expira. O servidor expõe apenas contagens agregadas de avaliações e follow-ups, sem persistir explicações ou respostas, e ignora níveis calculados pelo cliente quando a avaliação falha.
6. **Corrigido:** todos os produtores atuais de XP usam o ledger com chave única por usuário e registram o evento na mesma transação da alteração do saldo. O evaluator, a Torre e webhooks também mantêm suas proteções específicas; a ferramenta CLI de reconciliação permanece para reparos administrativos.
7. **Corrigido nesta rodada: integridade da Torre.** Consumo de efeitos e do Pergaminho do Oráculo agora é atômico; leituras propagam falhas e compras rejeitam itens desconhecidos ou contas inexistentes. `EXTRA_TIME` e `CHAOS_BANANA`, ainda sem mecânica implementada, foram retirados da loja e não podem ser comprados.
8. **Corrigido nesta rodada: origem das respostas socráticas do jogo.** A API agora marca as orientações determinísticas como `heuristic`; a interface diferencia regras locais de respostas geradas por modelo e do fallback no cliente quando a API fica indisponível. O IDE já identificava dicas heurísticas.

**Resolvido nesta rodada:** o módulo canônico `registrationOptions` e seus testes foram restaurados e incluídos nas exceções específicas do `.gitignore`; o build de produção web concluiu com sucesso.

### P2 — médio
9. **Corrigido nesta rodada: configuração compartilhada de CORS/CSRF.** A lista `CORS_ORIGIN` agora é parseada uma vez, normalizada e rejeita wildcard, credenciais e caminhos; o CORS HTTP e o middleware CSRF usam a mesma lista. `COOKIE_SAME_SITE=none` continua protegido pelas verificações de `Origin`/`Referer` nas mutações.
10. Arquivos gigantes: `ide/page.tsx` 1.886, `game/engine` 1.840, `runner.service.ts` 1.364, `registration-level.service.ts` 1.094, `courses.service.ts` 1.020.
11. Sem spec: `contact, cache, analytics, mail, gitea, prisma, knowledge/pipeline, housekeeping`. Cobertura global 40/35/30% (`jest.config.js:35-82`); `submissions.controller` a 0%.
12. **Resolvido nesta rodada:** `package-lock.json` removido; `pnpm-lock.yaml` é o único lockfile.
13. Expandir o smoke E2E no CI para cobrir fluxos críticos; o job atual valida o smoke web com API, Postgres/Redis e seed de teste, mas não sobe Piston nem Gitea.
14. `packages/contracts` sem consumidores.
15. **Resolvido com política provisória aprovada:** exclusão do Gitea usa outbox durável, tentativas com backoff e limpeza de identificadores após sucesso; por decisão de produto, não coletar idade nem bloquear cadastros até parecer jurídico.
16. **Parcialmente resolvido:** CodeQL, Dependabot, auditoria de dependências e Trivy estão no CI; a auditoria mais recente registrou 24 alertas altos, 31 moderados e 5 baixos (nenhum crítico). Estratégia de backup/restore está documentada, mas provedor, scheduler e restore drill não foram configurados.

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
| "Esperei e a trilha veio genérica" | Pesquisa real depende de credenciais Adzuna/Tavily e orçamento habilitado | Quebra a promessa central; churn no dia 3 |
| "A dica me deu a resposta" ou "a dica não ajudou nada" | Mistura de LLM e regra por palavra-chave sem rótulo visível | Perda de confiança no tutor |
| "Perdi XP e não sei por quê" | Ledger idempotente e extrato de XP já expostos no dashboard | Reduz a sensação de injustiça; reconciliação continua administrativa |
| "A Torre é só código, cadê quiz/item/sabotagem?" | Os quatro tipos de desafio, itens e party assíncrona foram implementados nesta rodada; tempo real continua ausente | A experiência já não se limita a código, mas não sincroniza movimentos em tempo real |
| "Não consigo rodar meu React" | Preview agora oferece React via Sandpack e mantém o iframe HTML existente | A trilha front-end moderna pode ser executada no navegador |
| "O certificado não abre no LinkedIn" | Link de compartilhamento e QR de verificação disponíveis; ainda sem Open Badges 3.0 | Baixo valor percebido |
| "Não consigo pagar" | Mercado Pago está em modo de teste; credenciais e Webhook ainda não foram configurados no ambiente | Não há validação de conversão nem receita observada |

### 3.3 Melhorias de maior alavancagem para o aluno
1. [x] **Extrato de XP** — ledger idempotente e histórico autenticado já estão expostos no dashboard; transparência reduz dúvidas, mas não substitui medir percepção de justiça.
2. [x] **Rótulo de origem e feedback do tutor**: resposta informa IA/modelo ou modo offline; aluno avalia utilidade e sinaliza excesso de resposta, imprecisão ou falta de clareza. O painel agrega os sinais para revisão humana dos casos do golden set, sem guardar código ou texto da conversa.
3. [x] **Primeiro valor enquanto aguarda**: a tela oferece até três atividades reais ainda não aprovadas do curso mapeado pelo diagnóstico, sem criar matrícula ou progresso artificial.
4. [x] **Revisão espaçada** (SRS) de conceitos errados via tentativas e fila de revisão; a mini-trilha durante a espera também está implementada.
5. [x] **Sandpack** para front-end (gratuito, client-side) antes de pensar em WebContainers (licença comercial); preview HTML existente preservado.
6. [x] **Open Badges 3.0 assinado + portfólio privado exportável** — credencial verificável é emitida sob demanda; perfil público e revogação continuam pendentes.
7. **Modo "explique em voz alta"** no follow-up de 60 s (gravação curta → transcrição → LLM avalia compreensão). É o anti-cheat mais robusto possível: avalia entendimento, não código.
8. **Trilha de "fluência em IA"** (usar Copilot/ChatGPT com critério, revisar código gerado) — o mercado júnior caiu 11% e vagas IA subiram 60%; ensinar a *usar* IA é mais honesto que só bloquear.
9. **Pix + preço regional** (R$ 30–60/mês hipótese; Rocketseat ~R$ 183/mês, Boot.dev ~US$ 33/mês).
10. [x] **Party assíncrona** antes de WebSocket: convite compartilhável, progresso da equipe e feed de andares concluídos; o tempo real continua como evolução futura.

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
| **Agir** | CLI de reconciliação manual; controles de fila no admin | Administradores autenticados podem pausar/retomar apenas filas de IA allowlisted, com motivo obrigatório e auditoria durável; requeue, feature flags, quota e demais ações continuam pendentes |
| **Guardrails** | Kill switch `AI_TUTOR_ENABLED` | Feature flags por módulo, orçamento de IA em env, modo degradado declarado, aprovação humana para ações irreversíveis (publicar conteúdo, estornar, banir) |
| **Auditar** | Auditoria de filas e alterações de papel/plano, cursos e salas, visível no admin | `AiOperatorAuditEvent` registra controles de fila; `AdminAuditEvent` registra ator, ação, alvo e campos alterados na mesma transação. Segue parcial para KMS, instrutores e demais operações. Campos mínimos seguem a orientação da [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) e da [OWASP ASVS 5.0, V16](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md). |
| **Aprender** | Golden set estático | Feedback categórico agregado em janela móvel de 30 dias orienta revisão humana dos casos versionados; workflow de avaliação viva semanal permanece opt-in |

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
- [x] Webhooks fail-closed, Sonar fail-closed e imagem Piston fixada por digest.
- [x] Preparar isolamento do Piston em host/VM dedicada: worker Compose separado, sem porta direta, gateway autenticado e runner local apenas no perfil `local-piston`; a implantação da VM/VPN segue como etapa operacional.
- [ ] Provisionar a VM/VPN dedicada, restringir a porta do gateway ao host da API e migrar a execução de produção para o worker.
- [x] Remover números de mercado e progresso fictícios da UI de espera; declarar fonte de vagas indisponível.
- [x] Expor `source` da dica na UI; IDE e Lumi distinguem respostas heurísticas, locais e de modelo.
- [x] Remover `package-lock.json`, atualizar TEST-STRATEGY.md e corrigir o teste da transição que estava ignorado.
- [x] Adicionar CodeQL, Dependabot, auditoria de dependências e varredura de imagens de container; documentar implantação, backup e restauração.

### Mês 1 — trocar stubs pela coisa real
- [x] Integrar Adzuna (anúncios) + Tavily (pesquisa complementar), orçamento diário em Redis e configuração fail-closed; credenciais continuam necessárias para ativar chamadas.
- [x] Idempotência global de XP + ledger/extrato; submission, Torre, battle, bônus diário e webhook/projeto gravam na mesma transação do saldo.
- [x] Streak com uma folga por semana UTC, limitada pela semana ISO de segunda a domingo.
- [x] Integridade da avaliação inicial: follow-up emitido e assinado pelo servidor; ignorar sinais anti-cheat controlados pelo cliente e expor métricas agregadas sem conteúdo.
- [x] Adapter Mercado Pago em sandbox para assinaturas recorrentes via checkout hospedado, que pode oferecer Pix quando habilitado na conta de teste; Compose encaminha as variáveis de sandbox à API.
- [x] Encaminhar as configurações de cobrança pelo Compose e exigir segredo do webhook; manter Mercado Pago em modo de teste.
- [ ] Configurar credenciais e Webhooks do sandbox no ambiente de deploy e validar Pix com conta de teste; credenciais e endpoint público HTTPS não existem neste workspace. Billing live permanece bloqueado.
- [x] Sandpack no preview React, preservando o modo HTML existente.

### Mês 2 — IA operável
- [x] Painel admin de uso diário de IA com chamadas, falhas, bloqueios, tokens e estimativa identificada por tarifas públicas dos modelos conhecidos; chamadas sem telemetria/tarifa permanecem não precificadas.
- [x] Métricas Prometheus de filas, idade da fila e fallback estimado; métricas indisponíveis são distinguidas de valores vazios.
- [x] Controles admin de pausa/retomada para filas de IA allowlisted, com confirmação, justificativa e trilha de auditoria.
- [x] Feedback categórico de resultados do tutor, agregado no painel para alimentar revisão humana do golden set sem armazenar conteúdo da conversa ou código.
- [x] Regras iniciais de alerta Prometheus para disponibilidade do scrape, taxa de erro, p95 HTTP e filas; `promtool` valida as regras no CI com imagem fixada por digest. O guard de métricas também aceita Bearer token padrão; configuração de Prometheus/Alertmanager e calibração dos limites seguem com o operador.
- [ ] Tarifas para modelos/provedores customizados; requeue, feature flags, ajuste de quota e outras ferramentas do operador.
- [ ] Cache semântico com pgvector (serve KMS e tutor).
- [x] Workflow semanal do golden set vivo criado; desativado por padrão. Para habilitar, defina `GOLDEN_LIVE_ENABLED=true` e configure `AI_API_KEY`/`AI_GEMINI_API_KEY` ou `AI_OPENAI_API_KEY` como secret, com `AI_PROVIDER` e o modelo como variáveis opcionais.

### Status das cinco tarefas solicitadas
- [x] **Building learner-facing outcomes** — avaliação de utilidade e categorias de problema nas respostas do tutor.
- [x] **Adding AI operations observability** — métricas de fila, idade, falhas/fallback e custos estimados no Prometheus e no admin.
- [x] **Adding guarded AI operator controls** — pausa/retomada limitada às filas de IA, com motivo, confirmação e auditoria fail-closed.
- [x] **Establishing the AI quality loop** — feedback agregado por 30 dias orienta revisão humana do golden set; avaliação live continua opt-in.
- [x] **Improving tests and coverage** — suíte completa passou; cobertura registrada na `docs/TEST-STRATEGY.md` e metas de auth/submissions/webhooks superadas.

### Hardening adicional
- [x] **Server evaluation integrity** — follow-up assinado e métricas agregadas sem texto/código persistido; níveis calculados no cliente não são autoridade quando a avaliação falha.
- [x] **Resilient Gitea deletion** — outbox transacional com backoff, leases, recuperação de jobs e expiração dos registros concluídos.
- [x] **Minor-user safeguards (política provisória)** — por decisão de produto, aguardar parecer jurídico; não coletar idade nem bloquear cadastros até aprovação da política definitiva.

### Mês 3 — profundidade de produto
- [x] Torre: casas de quiz com desafio múltipla escolha, validação server-side e resultado transacional.
- [x] Torre Fase 2: quiz, bug-hunt e lacunas; Ampulheta, banana competitiva e Party assíncrona com feed de progresso.
- [x] QR na página pública de verificação do certificado.
- [x] Open Badges 3.0 assinado e portfólio privado exportável; certificação 1EdTech, revogação e perfil público permanecem pendentes.
- [x] SRS de conceitos via fila de revisão espaçada.
- [x] Mini-trilha imediata durante a investigação: até três atividades existentes e ainda não aprovadas do curso correspondente ao diagnóstico/perfil.
- [ ] Refatorar `ide/page.tsx` e `runner.service.ts`.
- [x] Cobertura mínima de 60% em submissions/webhooks/auth; medição atual: 88,74% / 90,20% / 90,06% linhas, respectivamente.

---

## 7. Limites desta análise
- A análise considera testes direcionados e builds anteriores, mas não tráfego de produção, credenciais de provedores, execução real do worker dedicado ou um piloto com alunos.
- O relatório Brasscom é pesquisa/projeção setorial, não um conjunto de anúncios individuais; não deve ser apresentado na interface como contagem de vagas.
- O estudo de IA da TUM é um RCT em uma disciplina CS1 e o estudo de aprendizagem por projetos agrega populações e contextos diferentes. São evidências para orientar hipóteses, não garantias de resultado no Nexus.
- Concorrentes e preços não foram revalidados nesta pesquisa; não usar as comparações da seção 5 como fatos atuais sem checar fontes primárias.

## 8. Plano para elevar diferenciação e cobertura da proposta

### Tese de produto

**O Nexus transforma sinais verificáveis do mercado brasileiro em habilidades praticadas e evidências que o aluno pode compartilhar.** A promessa não é “conseguir emprego”, nem apenas “ter um tutor de IA”: é mostrar por que uma habilidade importa, praticá-la em trabalho real e provar o que o aluno consegue fazer sem depender da resposta do modelo.

### Progresso de implementação

- [x] Primeira fatia: habilidades encontradas em resultados reais podem exibir contagem/amostra, provedores, horário de coleta e links de origem disponíveis na trilha sugerida. Links são filtrados; textos brutos de anúncios não são persistidos nem expostos; amostras pequenas são rotuladas como indicativas.
- [x] Skills com prática disponível são ligadas a objetivo e critério; sinais sem atividade compatível são excluídos da recomendação com motivo. A cobertura atual é limitada a JavaScript, TypeScript e Python no curso inicial, não a todos os cursos/skills do mercado.
- [x] Tutor hint-first e avaliação de transferência por código em JavaScript, TypeScript e Python. A avaliação usa casos aleatórios por tentativa, executa no runner existente e persiste apenas score/versão/resultado; não prova ausência de ajuda externa e não foi validada com Piston real.
- [x] Portfólio privado e credencial Open Badges 3.0 assinada com Data Integrity Proof EdDSA são emitidos sob demanda e verificáveis com a chave pública. Não há certificação 1EdTech, estado de revogação ou perfil público; compartilhamento externo exige decisão do aluno.
- [x] Fixtures sintéticas de dois perfis e teste de integração de serviços cobrem sinais → prática → submissão avaliada → transferência → credencial, sem credenciais de provedores. O runner e o banco são simulados; isso não é E2E HTTP nem prova com Piston real.
- [ ] Fase operacional continua aberta: ativar credenciais/orçamento dos provedores, ampliar cobertura por função/região/senioridade, executar piloto com alunos e obter revisão externa das evidências. Resultados de aprendizagem e reconhecimento por empregadores não foram validados.

### Pesquisa e implicações

- O relatório da Brasscom de 2026 relata que 82% das empresas consultadas planejam ampliar vagas de entrada nos dois anos seguintes; 46% esperam que a maioria das novas vagas seja de entrada. Conhecimento técnico e falta de experiência aparecem entre as dificuldades de contratação; nuvem, cibersegurança e IA aparecem como hard skills prioritárias. Isso aponta para projetos demonstráveis e evidência de experiência, mas não substitui anúncios recentes nem prova que uma dessas trilhas terá maior conversão. [Relatório da Brasscom (PDF)](https://brasscom.org.br/wp-content/uploads/2026/07/Relatorio-Pespectivas-do-Mercado-de-Trabalho-Apresentacao-v9.pdf)
- Um RCT da TUM com 275 alunos de programação introdutória encontrou notas melhores nos exercícios com IA, mas não maior ganho pré/pós em conhecimento ou compreensão de código. O tutor de dicas graduais melhorou motivação intrínseca; assistência irrestrita reduziu frustração, mas pode mascarar aprendizagem. Portanto, medir conclusão e nota do exercício não basta: é necessário um desafio posterior de transferência sem ajuda. [TUM, estudo revisado por pares](https://portal.fis.tum.de/en/publications/less-stress-better-scores-same-learning-the-dissociation-of-perfo/)
- Uma meta-análise de 31 estudos sobre aprendizagem por projetos encontrou ganhos em dimensões de pensamento computacional, como colaboração, análise crítica, pensamento algorítmico e resolução de problemas. A amostra inclui contextos escolares diversos; a eficácia no público adulto do Nexus deve ser verificada. [ERIC, meta-análise](https://eric.ed.gov/?q=Project+Based+Learning&id=EJ1437451)
- Open Badges 3.0 define credenciais assinadas e portáveis, alinhadas ao Verifiable Credentials Data Model 2.0, com alegações de conquistas e habilidades. Isso torna o certificado mais interoperável, mas não lhe dá valor de contratação automaticamente: critérios, evidências e reconhecimento externo ainda precisam ser conquistados. [Especificação 1EdTech](https://standards.1edtech.org/open-badges/specifications/standards/v3p0) · [Guia de implementação](https://standards.1edtech.org/open-badges/guides/standards/v3p0/impl)

### Plano de execução — 12 semanas

| Fase | Janela | Entrega e critério de saída |
|---|---|---|
| **0. Descoberta e linha de base** | Semanas 1–2 | Selecionar dois perfis de entrada com base em anúncios obtidos por fontes autorizadas e entrevistas curtas com alunos/recrutadores. Registrar ativação, conclusão do diagnóstico, primeiro exercício executado, retorno semanal e resultado de uma tarefa de transferência. Quando não houver credenciais/dados, a interface deve declarar indisponibilidade, não preencher números. |
| **1. Mercado → mapa de habilidades** | Semanas 2–4 | Criar vocabulário canônico de skills e aliases; cada sinal guarda função, região, senioridade, fonte, data de coleta, amostra e confiança. Deduplicar anúncios e mostrar ao aluno o tamanho/idade da amostra e as fontes. Separar fontes estatísticas (ex.: Brasscom) de anúncios individuais. Saída: toda habilidade apresentada como “demanda observada” tem proveniência e limitações visíveis. |
| **2. Habilidade → prática → prova** | Semanas 3–7 | Para cada skill central dos dois perfis, mapear pré-requisito, objetivo observável, atividade executável, testes/rubrica e uma tarefa final diferente das praticadas. Integrar o mapa ao diagnóstico e à trilha; explicar “por que esta habilidade” e “como você a demonstrou”. Saída: nenhum skill de trilha principal sem ao menos uma atividade e critério de avaliação associados. |
| **3. Tutor que desenvolve autonomia** | Semanas 5–8 | Tornar dicas progressivas e socráticas o caminho padrão; pedir previsão, explicação, depuração ou revisão do código antes de revelar uma solução. Rotular IA, heurística e indisponibilidade. Avaliar com golden set versionado e tarefa de transferência sem IA; não usar apenas satisfação ou nota imediata como prova de aprendizagem. |
| **4. Portfólio e credencial portável** | Semanas 7–10 | Criar portfólio opcional com projetos, critérios da rubrica, resultados de testes e competências demonstradas. Emitir Open Badges 3.0 assinados por conquista, com evidência mínima e verificação pública. Código, conversas e dados pessoais ficam privados por padrão; compartilhamento é controlado pelo aluno. |
| **5. Piloto e decisão** | Semanas 10–12 | Rodar piloto de usabilidade com 30–50 alunos e revisão de evidências por 3–5 profissionais convidados. Medir funil, tempo até primeiro resultado, conclusão, tarefa de transferência, retorno D7/D30 e utilidade das dicas. O piloto pequeno serve para encontrar problemas, não para afirmar causalidade; antes de alegar eficácia, desenhar estudo comparativo com tamanho definido por análise de poder. Decidir quais perfis expandir usando dados e custo real dos provedores. |

### Indicadores e definição de “10/10”

Definir metas numéricas depois de medir a linha de base; não importar percentuais de relatórios de mercado como metas de produto. Os critérios de qualidade que não dependem de baseline são:

1. **Rastreabilidade:** todo sinal de demanda mostrado tem origem, data, amostra, região e limitações; nenhuma vaga ou skill é fabricada quando o provedor está desligado.
2. **Cobertura:** toda skill principal do percurso liga-se a objetivo, atividade, rubrica e evidência reutilizável; o aluno consegue ver a razão de cada recomendação.
3. **Aprendizagem:** progresso inclui demonstração de transferência independente, não só acerto com ajuda da IA; tutor e avaliação são verificados por conjunto de testes e análise de erros.
4. **Diferenciação reconhecível:** portfólio e credenciais são verificáveis e explicam o que foi feito, com quais critérios e em que contexto; empregadores/instrutores revisam a rubrica.
5. **Validação:** pelo menos dois perfis de entrada são testados com alunos reais; resultados, limitações, custos e dados ausentes são publicados internamente antes de escalar.

### Ordem recomendada para implementação

1. Completar a trilha **mercado → skill → atividade → justificativa visível**, começando por Adzuna/Tavily quando configurados e mantendo o comportamento fail-closed.
2. Completar equivalência entre diagnóstico, pré-requisitos e atividades; acrescentar tarefa de transferência avaliada por rubrica.
3. Aplicar tutor hint-first e rodar avaliação de qualidade/transferência com golden set versionado.
4. Criar portfólio e emitir Open Badges 3.0 com evidência e compartilhamento explícito do aluno.
5. Fazer piloto, revisar com empregadores e escolher a expansão com base nos resultados — não em quantidade de features.

**Fora do que pode ser concluído só no código:** configurar e financiar fontes de vagas, provisionar infraestrutura de produção, recrutar alunos e profissionais para o piloto, e obter reconhecimento externo das credenciais. O código deve manter esses limites explícitos e nunca simular a evidência ausente.

## 9. Plano para aumentar as notas por categoria

### Meta e regra de avaliação

Partir do scorecard revisado em **15/11/2026: 7,6/10** (valor ponderado 7,555). A meta intermediária continua sendo **aproximadamente 7,8/10 em 12 semanas**; **10/10 em todas as categorias é o objetivo de longo prazo**, não uma pontuação que possa ser concedida só por completar tarefas. Usar os mesmos pesos da seção 0. Cada aumento exige evidência pertinente; se uma dependência externa não estiver disponível, manter a categoria correspondente sem aumento.

### Critérios de saída para buscar 10/10

Uma nota 10 exige evidências repetíveis de produto, qualidade e operação. A tabela define o que ainda precisaria ser demonstrado; não presume que esses resultados já existem.

| Categoria | Evidência necessária para 10/10 | Dependência principal |
|---|---|---|
| Diferenciação do produto | Demanda e distinção confirmadas por alunos e empregadores, com resultados observáveis da cadeia mercado → prática → evidência. | Pesquisa de mercado e entrevistas independentes. |
| Cobertura da proposta | Jornadas prioritárias da proposta funcionando ponta a ponta, integrações reais habilitadas e lacunas claramente justificadas. | Serviços externos configurados e validação de cada fluxo. |
| Arquitetura e engenharia | Limites entre módulos documentados, migrações reproduzíveis, desempenho e degradação testados, sem gargalos críticos conhecidos. | Testes de carga, revisão técnica independente e ambiente equivalente a produção. |
| Experiência do aluno | Critérios WCAG 2.2 AA avaliados manualmente e com ferramentas, mais sessões observadas demonstrando conclusão das tarefas sem barreiras críticas. | Auditoria de acessibilidade e pesquisa com usuários. |
| Aprendizagem e pedagogia | Melhora de aprendizagem/transferência medida em piloto com avaliação adequada, revisão de educadores e limitações publicadas. | Alunos participantes e avaliação pedagógica independente. |
| Segurança e integridade | Revisão ASVS, pentest sem achados altos/críticos não tratados, isolamento do runner demonstrado e ciclo de segredos/credenciais verificado. | Auditoria externa, infraestrutura isolada e gestão de chaves. |
| Testes | CI estável cobrindo jornadas críticas com testes unitários, integração e E2E em dependências reais, além de falhas e regressões observadas. | Ambiente de staging com serviços reais e operação contínua do CI. |
| Operabilidade por IA | Custos, latência, fallback, qualidade e mudanças de configuração monitorados em produção; avaliações contínuas e controles auditáveis exercitados. | Tráfego real, tarifas dos provedores, avaliações revisadas e responsáveis de operação. |
| Confiabilidade e operação | SLOs definidos após baseline, alertas acionáveis, incidentes exercitados e restore drill comprovando RPO/RTO acordados. | Prometheus/Alertmanager, produção e backups restauráveis. |
| Prontidão comercial | Pagamento real validado, conformidade revisada, clientes pagantes e métricas verificadas de conversão, retenção e custo por cliente. | Provedor configurado, revisão legal e piloto comercial. |

O sequenciamento começa pelas melhorias que podem ser validadas no repositório e avança para segurança, confiabilidade, aprendizagem e mercado. Itens dependentes de pessoas, credenciais, orçamento ou infraestrutura serão acompanhados como bloqueios de evidência — não substituídos por mocks ou notas presumidas.

### Pesquisa que fundamenta o plano

- **DORA 2025** descreve a IA como amplificadora das capacidades e fraquezas existentes da organização; por isso, o plano melhora processos, qualidade e operação junto com a experiência de produto, em vez de tratar mais funcionalidades de IA como resultado. O guia atual de métricas recomenda avaliar throughput e instabilidade em conjunto, sem transformar um indicador isolado em meta. [Relatório DORA 2025](https://dora.dev/report/2025) · [Métricas DORA](https://dora.dev/guides/dora-metrics/)
- **Google SRE** recomenda SLOs associados à experiência do usuário e alertas acionáveis baseados no consumo do error budget. Isso fundamenta criar SLIs de latência/erros antes de alegar confiabilidade ou escolher limites de alerta. [Implementação de SLOs](https://sre.google/workbook/implementing-slos/) · [Alertas em SLOs](https://sre.google/workbook/alerting-on-slos/)
- **NIST AI RMF GenAI Profile** organiza a gestão de risco de IA em identificação, avaliação, priorização e tratamento ao longo do ciclo de vida; **OWASP Top 10 for LLM Applications 2025** destaca prompt injection, exposição de informação sensível, agência excessiva e consumo sem limites. Isso informa avaliação, privacidade, controles de operador e limites de custo. [NIST AI 600-1](https://doi.org/10.6028/NIST.AI.600-1) · [OWASP Top 10 para LLMs](https://genai.owasp.org/llm-top-10/)
- **OWASP ASVS 5.0** fornece requisitos verificáveis para controles de aplicações web; **WCAG 2.2** define critérios testáveis de acessibilidade. Ambos dão bases para auditorias repetíveis de segurança e UX, não notas automáticas. [OWASP ASVS](https://asvs.owasp.org/) · [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

Essas fontes orientam critérios e práticas; não calculam a nota do Nexus nem provam que o produto atende aos padrões. A nota continua sendo uma avaliação do repositório e de evidências coletadas no piloto.

| Categoria | Atual | Meta em 12 semanas | Evidência para revisar a nota |
|---|---:|---:|---|
| Diferenciação do produto | 8,7 | **8,9** | Dois perfis com dados de demanda autorizados e datados; alunos e profissionais revisam se a cadeia mercado → prática → evidência é útil e distinta. |
| Cobertura da proposta | 8,0 | **8,5** | Skills priorizadas nos dois perfis têm fonte, pré-requisito, prática executável, rubrica e tarefa de transferência; lacunas são mostradas ao aluno. |
| Arquitetura e engenharia | 7,7 | **7,9** | Fluxos críticos e limites entre serviços são documentados/testados; refatoração focada do runner/IDE reduz acoplamento sem regressões. |
| Experiência do aluno | 7,4 | **7,6** | 5–8 sessões observadas encontram fricções; as três principais são corrigidas e reavaliadas com alunos. |
| Aprendizagem e pedagogia | 7,4 | **7,7** | Golden set versionado, transferência independente e análise de erros no piloto; resultados descritos sem alegação causal indevida. |
| Segurança e integridade | 7,6 | **7,8** | Alertas altos triados com mitigação comprovada; rotação de chaves, revogação de credenciais, privacidade e isolamento do runner verificados. |
| Testes | 8,9 | **9,0** | Caminhos críticos cobertos com Postgres/Redis reais em ambiente de teste, runner controlado, contratos de provedores e cenários de falha no CI/staging. |
| Operabilidade por IA | 7,2 | **7,4** | Custo, latência, fallback, filas e qualidade têm painel/runbook; golden set periódico e controles do operador foram exercitados com auditoria. |
| Confiabilidade e operação | 6,2 | **7,3** | Prometheus/Alertmanager ativos, alertas testados, SLO calibrado após baseline e ao menos um restore drill com RPO/RTO registrados. |
| Prontidão comercial | 4,5 | **5,2** | Checkout sandbox e custo por aluno medidos; piloto e entrevistas documentam uso e disposição a pagar. Sem evidência suficiente, manter 4,5. |

Com esses valores, a média ponderada de trabalho é aproximadamente **7,8/10**. Os pontos são metas para reavaliação, não uma pontuação automática por concluir tarefas.

### Plano priorizado e critérios de saída

| Fase | Janela | Trabalho e prioridade | Critério de saída / efeito esperado |
|---|---|---|---|
| **1. Linha de base e operação** | Semanas 1–2 | Provisionar scrape seguro e Alertmanager; validar notificações e calibrar limites após obter baseline; definir eventos de funil; inventariar vulnerabilidades altas; selecionar dois perfis. | Scrape e alerta sintético verificados; baseline, responsáveis, riscos e lacunas registrados. **Impacto esperado:** confiabilidade e operabilidade, sem afirmar SLO antes de medir. |
| **2. Segurança e integração real** | Semanas 2–5 | Provisionar VM/VPN dedicada para Piston; exercitar timeout, memória, falha e indisponibilidade; integrar Postgres/Redis em teste; priorizar alertas altos, política de rotação/revogação e restore drill. | Execução validada no ambiente isolado, segredos fora do repositório, restore com RPO/RTO documentado e riscos remanescentes aceitos/mitigados. **Impacto:** segurança, testes e confiabilidade. |
| **3. Produto e pesquisa com alunos** | Semanas 2–8 | Mapear skills de dois perfis com fontes autorizadas; completar skill → atividade → rubrica → transferência; realizar 5–8 sessões de usabilidade; revisar golden set e erros do tutor. | Lacunas visíveis, fricções prioritárias corrigidas e reavaliadas; transferência separada do conteúdo ensinado. **Impacto:** cobertura, diferenciação, UX e pedagogia. |
| **4. Operação de IA e arquitetura** | Semanas 4–9 | Exercitar controles auditados já disponíveis; completar cobertura da auditoria administrativa; revisar custo/fallback/fila e limites; refatorar apenas os trechos de IDE/runner ligados a defeitos ou acoplamento medido; expandir testes de contrato/falha. | Runbook e painel úteis para uma simulação de incidente; integração e regressão reproduzíveis, sem refatoração ampla sem critérios. **Impacto:** AI ops, arquitetura e testes. |
| **5. Piloto e decisão comercial** | Semanas 8–12 | Se houver consentimento e capacidade operacional, pilotar com 30–50 alunos e revisão de 3–5 profissionais; medir ativação, primeiro exercício, conclusão, transferência, retorno e custo; concluir checkout sandbox e entrevistas de preço. | Relatório com amostra, consentimento, limitações, custos e resultados; decisão explícita de corrigir, repetir ou ampliar. Piloto não prova causalidade nem autoriza cobrança pública. **Impacto:** UX, aprendizagem, diferenciação e comercial. |

### Implementação iniciada

- [x] Adicionar profile Compose `monitoring` com Prometheus autenticado, retenção local persistente de 15 dias e regras versionadas; bind do painel somente em `127.0.0.1`. `docker compose config -q` e `promtool check config` passaram. O envio de notificações continua dependendo de Alertmanager configurado pelo operador, e os contadores HTTP em memória reiniciam junto com a API.
- [x] Validar `REDIS_URL` antes de configurar BullMQ, incluindo esquema `redis://`/`rediss://`, host, credenciais e índice de banco; erros de configuração deixam de cair silenciosamente para Redis local sem autenticação. Segredos opcionais do scrape também exigem comprimento mínimo.
- [x] Exportar histograma cumulativo de latência HTTP para Prometheus, além da média já existente. Buckets fixos e sem labels por rota reduzem cardinalidade e não expõem caminhos potencialmente sensíveis; testes cobrem limites, soma, contagem e reset. Isso cria um SLI e alimenta regras de alerta iniciais, mas **não** configura roteamento/ativação de alertas, persistência histórica nem SLO aprovado.
- [x] Adicionar autenticação Bearer compatível com o scrape padrão do Prometheus, preservando `x-metrics-token`, e regras iniciais para scrape indisponível, erros HTTP, p95 e backlog de filas. `promtool` validou `infra/monitoring/nexus-alerts.yml`; configuração no Prometheus/Alertmanager e calibração por baseline continuam necessárias antes de tratá-las como SLOs.
- [x] Agregar amostras, média e p95 de latência das chamadas de IA a partir dos eventos já persistidos e exportar métricas diárias para Prometheus. A agregação não expõe prompts, IDs de usuário nem labels de modelo de cardinalidade não controlada; dados ausentes permanecem nulos/zero, sem inventar telemetria.
- [x] Substituir a prova de respostas por avaliação de código no runner existente, com valores de teste aleatórios a cada tentativa, limites de execução e sem persistir o código-fonte. A interface associa rótulo/instruções ao editor; testes usam runner simulado, então o fluxo de sandbox real permanece não validado.
- [ ] Completar instrumentação de funil, integração com dependências reais, gestão de chaves/revogação, auditorias de acessibilidade e segurança, e validação com participantes. Esses itens dependem das fases e recursos externos descritos acima.

### Indicadores de acompanhamento

- **Diferenciação/cobertura:** proporção de skills prioritárias com fonte válida, atividade executável, rubrica e evidência; registrar separadamente as lacunas.
- **UX/aprendizagem:** conclusão do diagnóstico e primeiro exercício, abandono por etapa, tempo até primeiro resultado, desempenho na transferência e retorno D7/D30. Definir metas depois da linha de base; não confundir satisfação ou nota assistida com aprendizagem.
- **Segurança/testes:** alertas por severidade e idade, fluxos críticos passando em CI, cobertura de casos de falha, rotação/revogação testada e defeitos encontrados após release.
- **IA/operação:** custo e latência agregados (com segmentação por modelo somente via allowlist), taxa de fallback/erro, resultados do golden set, disponibilidade e cumprimento dos SLOs.
- **Comercial:** custo variável por aluno ativo, conclusão do sandbox de pagamento, entrevistas de disposição a pagar e conversão observada no piloto; sem extrapolar uma amostra pequena para receita futura.

### Dependências e limites

O piloto e as integrações reais dependem de participantes, consentimento, fontes autorizadas de vagas, credenciais, orçamento e infraestrutura operada. Se esses recursos não estiverem disponíveis, concluir apenas o trabalho local, rotular fixtures como sintéticas e marcar os critérios externos como **não validados**; não elevar diferenciação validada, aprendizagem ou prontidão comercial por simulações. Recalcular as notas ao final de cada fase com evidências observadas, mesmo que as metas não sejam atingidas.
