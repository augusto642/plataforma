# ⚡ NEXUS CODE — Developer Evidence Portfolio (`/profile`)
## Product Strategy, Information Architecture & B2B Hiring Metrics Specification
> **Versão:** 1.0.0 • **Status:** Approved Strategy Specification • **Role:** Lead Product & UX Strategist

---

## 1. Visão Executiva & Proposta de Valor

### 1.1 O Paradigma "Proof-of-Competence" vs. "Self-Reported CV"
O mercado de contratação tech tradicional está saturado de assimetria de informação. Currículos em PDF de 2 páginas e perfis estáticos no LinkedIn contêm alegações auto-declaradas ("Sênior em Node.js", "Especialista em Algoritmos") que não refletem a real capacidade analítica, qualidade de código e solidez de fundamentos de um engenheiro de software.

A **NEXUS CODE** redefine o portfólio do desenvolvedor através do **Developer Evidence Portfolio (`/profile/:username`)**:

```
           TRADITIONAL MODEL                        NEXUS CODE PROOF ENGINE
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│  Currículo PDF / Declaração Estática │     │    Evidências Reais & Imutáveis      │
│  ❌ Auto-avaliação sem validação     │     │  ✅ Execução real no Sandbox Piston   │
│  ❌ Projetos "tutorial copy-paste"   │ ──► │  ✅ Commits verificados no Git/Forgejo│
│  ❌ Sem telemetria de testes/Big-O   │     │  ✅ Radar 6D de Competências         │
│  ❌ Triagem manual lenta e cara      │     │  ✅ Certificados SHA-256 Verificáveis │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

> **Proposta de Valor Central:**  
> *"Substituir currículos vazios em PDF por evidências imutáveis de código real, execução verificada em sandbox e métricas algorítmicas auditáveis."*

---

### 1.2 Recursos-Chave para Recrutadores Técnicos e Tech Leads (B2B Cockpit)
1. **Radar Hexagonal 6D de Competências:** Visualização instantânea de força em 6 dimensões fundamentais (Algoritmos, Estruturas de Dados, Concorrência, Clean Code, Testes e Defesa/Segurança).
2. **Taxa de Aprovação em 1º Envio (First-Pass Rate):** Métrica de precisão e planejamento que indica se o desenvolvedor testa mentalmente antes de submeter.
3. **Complexidade Algorítmica Média (Big-O Engine):** Mapeamento do tempo de execução assintótico e footprint de memória das soluções aceitas.
4. **Streak & Constância Anual (365-Day Activity Heatmap):** Prova incontestável de disciplina, foco diário e volume real de código entregue.
5. **Auditoria Git Direta:** Cada desafio resolvido gera um repositório clonável no Forgejo/Gitea com árvore de commits e logs de execução do sandbox.

---

## 2. Arquitetura de Informação & Wireframe Estrutural

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  TOPBAR: Logo NEXUS CODE ⚡ | Search Devs | Explore Challenges | Leaderboard | [Exportar Dossiê] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 👤 HERO / IDENTIDADE DO DESENVOLVEDOR                                                      │  │
│  │  [Avatar 128px Neon Ring]   Nome Completo (@handle)  [Badge: Pro] [Verificado Git ✅]       │  │
│  │                             Bio Curta / Especialidade (ex: Distributed Systems Engineer)   │  │
│  │  🏆 Liga: Diamante Tier I   | 🌟 Global Rank: #42 (Top 0.8%) | 🔥 Streak: 84 Dias           │  │
│  │  📍 São Paulo, Brasil       | 🔗 github.com/handle | 💼 Status: Aberto a Propostas (CLT/PJ) │  │
│  │                                                                                            │  │
│  │  [ ⚡ Copiar Link de Recrutador ]  [ 💼 Compartilhar LinkedIn ]  [ 📄 Baixar Dossiê PDF ]   │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 📊 KPI STRIP — EVIDÊNCIAS RÁPIDAS (B2B Fast-Scan Strip)                                    │  │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌─────────────┐│  │
│  │ │ 88.4% 1st Pass │ │ O(n log n) Avg │ │ 142 Desafios   │ │ 32 Repos Git   │ │ 24.850 XP   ││  │
│  │ │ Taxa 1º Envio  │ │ Complexidade   │ │ Submissões 100%│ │ Verificados    │ │ Score Global││  │
│  │ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ └─────────────┘│  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌──────────────────────────────────────────────┬─────────────────────────────────────────────┐  │
│  │ 🕸️ RADAR 6D DE COMPETÊNCIAS                  │ 📅 HEATMAP DE CONSTÂNCIA ANUAL (365 DIAS)   │  │
│  │           [Algoritmos: 92/100]               │  Jan   Fev   Mar   Abr   Mai   Jun   Jul... │  │
│  │                 /\                           │  ░░▒▒▓▓██ 542 submissões no último ano      │  │
│  │   [Segurança]  /  \  [Estruturas]            │  Max Streak: 96 dias | Média: 1.4 des/dia   │  │
│  │     84/100    /    \   95/100                ├─────────────────────────────────────────────┤  │
│  │              |  *  |                         │ ⚡ LINGUAGENS MAIS UTILIZADAS                │  │
│  │   [Testes]    \    /   [Concorrência]        │  ■ TypeScript (45%)  ■ Rust (25%)           │  │
│  │    89/100      \  /     78/100               │  ■ Go (20%)          ■ Python (10%)         │  │
│  │                 \/                           │                                             │  │
│  │          [Clean Code: 94/100]                │                                             │  │
│  └──────────────────────────────────────────────┴─────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 📑 NAVEGAÇÃO POR ABAS                                                                      │  │
│  │  [ 📦 Desafios & Repositórios ]  [ 🎖️ Badges & Certificados ]  [ 🔬 Auditoria de Código ]   │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ CONTEÚDO DA ABA ATIVA: CARDS DE REPOSITÓRIOS VERIFICADOS COM TESTES 100% PASSED            │  │
│  │ ┌────────────────────────────────────────────────────────────────────────────────────────┐ │  │
│  │ │ 🚀 Desafio #084: Distributed Rate Limiter with Sliding Window Counter                  │ │  │
│  │ │ Stack: TypeScript / Redis / Vitest  |  Runtime: 12ms (P99)  |  Big-O: O(1) Time, O(w) │ │  │
│  │ │ ✅ 18/18 Testes Unitários & Stress Passed  |  Passou no 1º Envio  |  2 Commits          │ │  │
│  │ │ 🔗 [Ver Repositório Forgejo]  [Inspecionar Código-Fonte]  [Diff de Commits]            │ │  │
│  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │  │
│  │ ┌────────────────────────────────────────────────────────────────────────────────────────┐ │  │
│  │ │ 🔒 Desafio #079: High-Throughput Thread-Safe LRU Cache with Lock-Free Reads            │ │  │
│  │ │ Stack: Rust / Tokio / Criterion  |  Runtime: 4μs  |  Memory: Zero Heap Alloc          │ │  │
│  │ │ ✅ 24/24 Testes Concorrentes Passed  |  Score de Defesa: 100%                          │ │  │
│  │ │ 🔗 [Ver Repositório Forgejo]  [Inspecionar Código-Fonte]  [Relatório de Benchmark]     │ │  │
│  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mapeamento Detalhado dos Módulos

### 3.1 Módulo 1: Hero & Identidade do Desenvolvedor
- **Avatar Dinâmico com Borda Neon:** Borda circular animada com gradiente representativo da liga (`#00E5FF` Ciano para Diamante, `#FFD700` Ouro, `#996DFF` Mestre).
- **Handle e Nomenclatura:** `@username` único com URL amigável (`nexuscode.dev/u/alexdev`).
- **Tag de Verificação Criptográfica:** Selo *"Verified Engineer"* autenticando que as submissões foram executadas em sandbox isolado com telemetria anti-cheat.
- **Liga Atual & Posição no Ranking:** Exibe a classificação global baseada em ELO Rating técnico.
- **Painel de Contato Rápido & Disponibilidade:** Switch "Aberto a Propostas" com preferências de trabalho (Remoto, Híbrido, CLT, PJ, Faixa Salarial almejada oculta ou visível para empresas autorizadas).

---

### 3.2 Módulo 2: O Radar Hexagonal 6D de Competências
O Radar 6D decompõe a habilidade do desenvolvedor em 6 eixos matematicamente calculados com base nos testes e complexidade dos desafios concluídos:

```
                      [ ALGORITMOS & COMPLEXIDADE ]
                                   /\
                                  /  \
     [ DEFESA & SEGURANÇA ]      /    \      [ ESTRUTURAS DE DADOS ]
               \                /      \                /
                \              /   6D   \              /
                 \            /  RADAR   \            /
                  \          /            \          /
                   \        /              \        /
                    \      /                \      /
     [ TESTES & QUALIDADE ] ──────────────── [ CONCORRÊNCIA & SISTEMAS ]
                                   |
                                   |
                         [ CLEAN CODE & DESIGN ]
```

#### Eixos do Radar 6D:
| Eixo 6D | Descrição & Foco de Avaliação | Métricas de Telemetria Sandbox |
| :--- | :--- | :--- |
| **1. Algoritmos & Complexidade** | Algoritmos de busca, ordenação, grafos, Programação Dinâmica e análise assintótica Big-O. | Tempo de execução (CPU Cycles), complexidade teórica estimada vs. observada. |
| **2. Estruturas de Dados** | Domínio de Árvores AVL/Red-Black, Heaps, HashMaps, Grafos, Buffers Circulares e Tries. | Consumo de memória RAM (Peak Memory Footprint), alocações de heap. |
| **3. Concorrência & Sistemas** | Threads, Async/Await, Prevenção de Race Conditions, Mutexes, Locks e I/O não-bloqueante. | Testes de estresse com 100+ threads concorrentes sem Deadlock/Data Race. |
| **4. Clean Code & Design** | Legibilidade, aderência a SOLID, modularidade, desacoplamento e baixíssima complexidade ciclomática. | Linter score (ESLint/Clippy), métrica de complexidade ciclomática $< 8$. |
| **5. Testes & Qualidade** | TDD, cobertura de edge cases, idempotência, isolamento de testes unitários e de integração. | Cobertura de testes $\ge 95\%$, mutação de testes aprovada. |
| **6. Defesa & Segurança** | Sanitização de inputs, proteção contra memory leaks, buffer overflow e vulnerabilidades OWASP. | Validação com payloads maliciosos e fuzz testing de entradas. |

---

### 3.3 Módulo 3: Heatmap Anual de Atividade (365 Dias)
- **Estrutura Visual:** Grid matricial de 52 semanas $\times$ 7 dias, idêntico ao padrão internacional dos melhores devs do GitHub.
- **Níveis de Intensidade Neon:**
  - `Level 0 (Sem atividade):` `#0D1117`
  - `Level 1 (1-2 submissões):` `#0E4429` / `#005A32`
  - `Level 2 (3-5 submissões):` `#006D32` / `#04D361` (Neon Verde)
  - `Level 3 (6-9 submissões):` `#26A641` / `#00E5FF` (Neon Ciano)
  - `Level 4 (10+ submissões ou Desafio Master):` `#39D353` / `#8257E5` (Neon Violeta)
- **Tooltips Interativos:** Ao passar o mouse sobre o dia, exibe data, quantidade de commits, desafios resolvidos, XP acumulado e badges desbloqueados no dia.

---

### 3.4 Módulo 4: Repositórios & Desafios Entregues (Aba 1)
Cada desafio completado é um card de evidência técnica robusto contendo:
- **Título & Categoria do Desafio:** Ex: *"Zero-Copy Network Packet Parser"*.
- **Stack Tecnológica:** Tags interativas (ex: `Rust`, `Socket`, `Memory Safety`).
- **Badge de Execução Sandbox:** `100% Tests Passed` com indicação de aprovação no 1º envio (*"First-Pass Ace"*).
- **Métricas de Benchmark:**
  - *Execution Time:* `1.2ms` (Top 5% mais rápidos da plataforma).
  - *Memory Overhead:* `140 KB`.
  - *Big-O Assintótico:* `O(1) amortizado`.
- **Botões de Ação para Tech Leads:**
  - `[ Inspecionar Código ]`: Abre modal com visualizador Monaco Editor em modo leitura e syntax highlight.
  - `[ Repositório Git ]`: Redireciona diretamente para o Forgejo/Gitea interno com histórico de commits.
  - `[ Ver Diff & Logs ]`: Exibe diff dos commits e output dos testes automatizados.

---

### 3.5 Módulo 5: Galeria de Badges & Certificados Criptográficos SHA-256 (Aba 2)
Certificações e conquistas técnicas com prova criptográfica anti-fraude:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 🎖️ CERTIFICADO CRIPTOGRÁFICO DE CONCLUSAO                                 │
│ Trilha: Distributed Systems & High Performance Backend                    │
│ Emitido para: Alex Silva (@alexdev)  |  Data: 2026-08-15                  │
│ Carga Prática: 120 Horas de Código & 45 Desafios Resolvidos              │
│                                                                           │
│ SHA-256 Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 │
│ Status: [ VERIFICADO NA BLOCKCHAIN DE AUDITORIA NEXUS CODE ✅ ]           │
│                                                                           │
│ [ 🔗 Verificar Autenticidade Pública ]   [ 📥 Baixar OpenBadge JSON-LD ]   │
└───────────────────────────────────────────────────────────────────────────┘
```

#### Badges de Excelência Técnica:
1. **First-Pass Ace 🎯:** Concluiu 10 desafios consecutivos com 100% de testes aprovados na primeira tentativa.
2. **Big-O Optimizer ⚡:** Entregou solução com complexidade temporal inferior à média da comunidade.
3. **Iron Streak 365 🔥:** 365 dias ininterruptos de código e submissões aprovadas.
4. **Zero Heap Allocator 🛡️:** Desafio resolvido sem alocações dinâmicas de memória desnecessárias.
5. **Concurrency Master 🌪️:** Soluções de alta concorrência sem race conditions detectadas por ThreadSanitizer.

---

## 4. Mecânica de Compartilhamento & B2B Recruiter Cockpit

### 4.1 Botão "Copiar Link de Recrutador"
Gera uma URL rastreável otimizada para avaliação rápida por tech recruiters:
`https://nexuscode.dev/u/alexdev?utm_source=recruiter_link&ref=portfolio`
- **Recruiter Fast-View:** Ativa um banner superior com resumo executivo de 60 segundos (Tempo médio de resolução, stack dominante, taxa de acerto em testes e botão de convite para entrevista).
- **Telemetria de Visualização:** O desenvolvedor recebe notificação interna quando empresas verificadas abrem seu dossiê.

---

### 4.2 Botão "Compartilhar no LinkedIn" (Dynamic OpenGraph Card)
Gera automaticamente uma imagem de alta resolução (1200x630px) via `@vercel/og` renderizando dinamicamente:
- Foto do Desenvolvedor e Nome.
- Gráfico visual do Radar 6D.
- Liga atual e XP total.
- Selo de verificação de testes da NEXUS CODE.
- Botão pré-formatado com texto de postagem:
  > *"Acabo de alcançar a Liga Diamante na @NexusCode com 88.4% de taxa de acerto em 1º envio e 140+ desafios validados no sandbox. Confira meu Dossiê Técnico de Evidências: https://nexuscode.dev/u/alexdev"*

---

### 4.3 Botão "Exportar Dossiê Técnico em PDF"
Gera um relatório profissional de 2 a 3 páginas formatado para Tech Leads e Heads of Engineering:
- **Página 1:** Resumo Executivo, Identidade, Radar 6D em alta resolução, KPIs de Performance e Heatmap anual.
- **Página 2:** Top 5 Projetos Mais Complexos com links para commits, métricas Big-O e cobertura de testes.
- **Página 3:** Lista de Certificados com QR Code apontando para o validador público SHA-256 da NEXUS CODE.

---

## 5. Modelo de Dados & Schemas TypeScript

```typescript
// types/developer-profile.ts

export interface DeveloperProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  title: string;
  location: string;
  availableForHire: boolean;
  workPreferences: ('remote' | 'hybrid' | 'onsite')[];
  contractPreferences: ('clt' | 'pj' | 'freelance')[];
  
  // Gamificação e Liga
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master';
  tierRank: number;
  globalRank: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  
  // Métricas de Evidência B2B
  kpiMetrics: {
    firstPassRate: number; // Ex: 88.4 (em %)
    averageBigO: string; // Ex: "O(n log n)"
    totalSolvedChallenges: number;
    totalVerifiedRepos: number;
    totalCodeLinesEvaluated: number;
    cleanCodeAverageScore: number;
  };

  // Radar 6D Normalizado (0 a 100)
  radar6D: {
    algorithms: number;
    dataStructures: number;
    concurrency: number;
    cleanCode: number;
    testing: number;
    defenseSecurity: number;
  };

  // Histórico de Atividade Anual (365 dias)
  activityHeatmap: {
    date: string; // YYYY-MM-DD
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
    details?: {
      xpEarned: number;
      challengesSolved: string[];
    };
  }[];

  // Desafios e Repositórios Verificados
  verifiedProjects: VerifiedProject[];

  // Badges e Certificados
  badges: CryptographicBadge[];
  certificates: CertificateProof[];
}

export interface VerifiedProject {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  language: string;
  repositoryUrl: string; // Link Forgejo/Gitea
  latestCommitSha: string;
  firstPassApproved: boolean;
  totalTests: number;
  passedTests: number;
  runtimeMs: number;
  memoryKb: number;
  bigOTime: string;
  bigOSpace: string;
  completedAt: string;
  defenseScore: number;
}

export interface CryptographicBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  proofHash: string;
}

export interface CertificateProof {
  id: string;
  trackTitle: string;
  sha256Hash: string;
  verificationUrl: string;
  issuedAt: string;
  hoursCompleted: number;
  totalChallengesPassed: number;
  issuerSignature: string;
}
```

---

## 6. Design Tokens & Visual Specs (Carbon Deep Dark)

| Elemento UI | Token / Hex Color | Aplicação |
| :--- | :--- | :--- |
| **Background Base** | `#070A12` | Fundo principal da página do perfil. |
| **Surface Card** | `#0B0F19` | Fundo dos cards de repositórios, radar e KPIs. |
| **Surface Hover / Active** | `#121829` | Estado hover de botões e cards interativos. |
| **Border / Stroke** | `#1E293B` (opacity 0.6) | Linhas de divisão e contornos de cards. |
| **Neon Violet (Primary)** | `#8257E5` | Indicadores de liderança, ELO, XP e branding. |
| **Neon Cyan (Execution)** | `#00E5FF` | Testes 100% passed, radar data structures e gráficos. |
| **Neon Emerald (Success)** | `#04D361` | Indicador de streak diário e aprovação de 1º envio. |
| **Typography Header** | `font-sans` (Inter/Cabinet) | Títulos, métricas numéricas em destaque. |
| **Typography Code** | `font-mono` (JetBrains Mono) | Hashes SHA-256, Big-O, commits e snippets. |

---

## 7. Roadmap de Entrega do Perfil

1. **Sprint 1 — Core Layout & Hero:** Criação do `/profile/[username]` em Next.js App Router, Hero Banner, Avatar Neon e KPI Strip.
2. **Sprint 2 — Radar 6D & Heatmap:** Implementação do gráfico SVG/Canvas do Radar Hexagonal 6D e Grid de Atividade 365 dias.
3. **Sprint 3 — Git Integration Cards:** Integração com os repositórios Forgejo para exibição de cards de desafios com link de commits e Monaco Readonly.
4. **Sprint 4 — Badges SHA-256 & Validador:** Motor de verificação criptográfica e página `/verify/:certHash`.
5. **Sprint 5 — Social & PDF Engine:** Rota OpenGraph dinâmica (`/api/og/profile`) e gerador de Dossiê Técnico em PDF via Puppeteer/React-PDF.
