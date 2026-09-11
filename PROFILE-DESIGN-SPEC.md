# ⚡ NEXUS CODE — Especificação de Design do Perfil do Desenvolvedor (`/profile`)
> **Lead Brand & UI Designer Architectural Document**  
> *Versão 1.0.0 — Design Tokens, Componentes SVG de Alta Precisão & Engenharia Visual*

---

## 1. Visão Geral e Filosofia Visual

O **Perfil do Desenvolvedor da NEXUS CODE (`/profile`)** foi concebido como o **dossiê técnico definitivo** para engenheiros de software, unindo precisão analítica cirúrgica (Developer-First) e dopamina de progressão gamificada de alto calibre (inspirada em GitHub, Linear, Vercel, Raycast e jogos RPG táticos).

Cada métrica visualizada no perfil não é meramente declaratória: ela é **comprovada e auditada pelo motor de Sandbox Piston**, suítes de testes unitários automatizados e tutoria socrática por IA.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CYBER HERO BANNER & STATS                              │
│   [Avatar Diamante 💎]  Augusto Silva (@augusto_dev) [✓ PRO]   [🏆 Rank #142]   │
│   Staff Distributed Systems & Rust • 84.920 XP • 68-Day Streak • 384 Solved    │
└─────────────────────────────────────────────────────────────────────────────────┘
         │                                                        │
┌────────▼───────────────────────────────┐      ┌────────────────▼────────────────┐
│   RADAR HEXAGONAL 6D (SVG VETORIAL)    │      │  HEATMAP ANUAL DE 52 SEMANAS    │
│  - Algoritmos & EDs (96%)              │      │  - 364 Blocos com Neon #04D361  │
│  - Backend Distribuído (94%)           │      │  - 5 Níveis de Intensidade      │
│  - System Design (91%)                 │      │  - Tooltips de Testes & PRs     │
│  - DevSecOps & Cloud (87%)             │      │  - Filtros Anuais (2026/25/24)  │
│  - Frontend Architecture (89%)         │      │  - Maior Streak: 112 dias       │
│  - IA & Tutoria Socrática (92%)        │      │                                 │
└────────────────────────────────────────┘      └─────────────────────────────────┘
         │                                                        │
┌────────▼───────────────────────────────┐      ┌────────────────▼────────────────┐
│   REPOSITÓRIOS GIT ENTREGUES           │      │  BADGES & CONQUISTAS DE ELITE   │
│  - Rust Raft Consensus (64/64 PASS)    │      │  - Master of Concurrency (⚡)   │
│  - Go LMS Gateway (48/48 PASS)         │      │  - FAANG Slayer (⚔️)            │
│  - TypeScript AST Analyzer (92/92 PASS)│      │  - 100-Day Streak Titan (🔥)    │
│  - Redlock Redis Python (36/36 PASS)   │      │  - Zero Spoilers Eureka (💡)    │
└────────────────────────────────────────┘      └─────────────────────────────────┘
```

---

## 2. Design Tokens Oficiais

### 2.1 Cores Primárias e Superfícies (Deep Obsidian)
| Token | Hex / Valor | Uso e Aplicação |
|---|---|---|
| `--obsidian-base` | `#08080B` | Fundo geral da página e canvas com grid cibernético |
| `--obsidian-card` | `#121217` | Fundo principal dos Bento Cards translúcidos (`rgba(18,18,23,0.85)`) |
| `--obsidian-elevated`| `#181820` | Superfícies elevadas, inputs, chips de código e badges secundárias |
| `--obsidian-border` | `#27272A` | Bordas sutis dos cards e divisórias (Dark Zinc) |
| `--obsidian-border-hover` | `#3F3F46` | Estados de hover em botões secundários |

### 2.2 Acentos de Ação, Gamificação e Dopamina
| Nome da Cor | Hex / Glow | Significado no Design System |
|---|---|---|
| **Rocket Purple** | `#8257E5` / `#996DFF` | Identidade primária da plataforma, gradientes de destaque e badges Lendárias |
| **Neon Green** | `#04D361` / `#00B37E` | Sucesso em testes unitários, blocos ativos do Heatmap e status Online |
| **Cyan Neon** | `#00E5FF` / `#0070F3` | Selo verificado, benchmark Senior/FAANG e conexões de rede |
| **Solar Amber** | `#F59E0B` / `#FFA116` | Streak aura, alertas de performance e badges Míticas |
| **Diamond Core** | `#E2E8F0` / `#38BDF8` | Moldura de Liga Diamante, títulos em destaque e textos puros |

---

## 3. Especificações dos Componentes de UI

### 3.1 Header do Perfil (`ProfileHeader.tsx`)
- **Cyber Banner Hero:** Gradiente angular cibernético (`#090b14` para `#17112c` para `#0d1e26`) com malha em perspectiva tridimensional (`transform: perspective(300px) rotateX(25deg)`) e laser neon horizontal (`linear-gradient(90deg, #8257E5, #00E5FF, #04D361)`).
- **Moldura de Avatar Radiante:** Anel com rotação contínua cônica (`conic-gradient`) de alta precisão para Ligas **Diamante** (`#E2E8F0`, `#38BDF8`, `#8257E5`, `#00E5FF`) e **Platina** (`#94A3B8`, `#CBD5E1`, `#64748B`).
- **Handle & Selo Verificado:** Nome completo em tipografia geométrica `Space Grotesk`, acompanhado de selo azul pulsante (`Verified Pro`) e handle `@username` no tom Rocket Purple.
- **Dossiê Global de Stats:** 4 cards com contadores de XP Total, Streak Atual, Desafios Resolvidos e PRs Validados.

### 3.2 Gráfico de Radar Hexagonal 6D em SVG (`ProfileRadar6D.tsx`)
O radar calcula posições vetoriais paramétricas no plano cartesiano a partir de coordenadas polares:

$$x = c_x + r \cdot \cos(\theta_i)$$
$$y = c_y + r \cdot \sin(\theta_i)$$

Onde $c_x = 120$, $c_y = 120$, $r_{\max} = 85$, com 6 eixos defasados em $\frac{\pi}{3}$ radianos ($60^\circ$):
1. **Algoritmos & Estruturas de Dados:** $\theta_0 = -\frac{\pi}{2}$ ($270^\circ$, Topo)
2. **Backend Distribuído:** $\theta_1 = -\frac{\pi}{6}$ ($330^\circ$, Topo Direito)
3. **System Design & Arquitetura:** $\theta_2 = \frac{\pi}{6}$ ($30^\circ$, Fundo Direito)
4. **DevSecOps & Cloud:** $\theta_3 = \frac{\pi}{2}$ ($90^\circ$, Base)
5. **Frontend Architecture:** $\theta_4 = \frac{5\pi}{6}$ ($150^\circ$, Fundo Esquerdo)
6. **IA & Engenharia Socrática:** $\theta_5 = \frac{7\pi}{6}$ ($210^\circ$, Topo Esquerdo)

**Diferenciais Visuais:**
- Polígono do estudante preenchido com gradiente semitransparente (`#8257E5` $\to$ `#00E5FF` $\to$ `#04D361`) e filtro SVG Gaussian Blur (`feGaussianBlur stdDeviation="3"`).
- Polígono tracejado em Ciano (`#00E5FF`) representando o benchmark de referência para Engenheiro Staff / FAANG.
- Vértices interativos com aumento de raio e glow ao passar o mouse.

### 3.3 Heatmap Anual de 52 Semanas (`ProfileAnnualHeatmap.tsx`)
- **Matriz Temporal:** 52 colunas $\times$ 7 linhas (total de 364/365 blocos).
- **Escala de Intensidade Neon Green:**
  - `Level 0` (`#121217`): Sem atividade.
  - `Level 1` (`#04431f`): 1 a 2 execuções.
  - `Level 2` (`#00875F`): 3 a 6 execuções.
  - `Level 3` (`#00B37E`): 7 a 11 execuções com glow sutil.
  - `Level 4` (`#04D361`): 12+ execuções com glow intenso (`box-shadow: 0 0 12px #04D361`).
- **Tooltip Dinâmico:** Exibe data completa formatada, total de testes unitários passados, desafios resolvidos e PRs mergeados.
- **Filtros e Métricas:** Seletor de anos (2026, 2025, 2024), Maior Sequência, Sequência Atual e Dias Ativos.

### 3.4 Cards de Repositórios Git (`ProfileGitRepositories.tsx`)
- **Pill de Testes Unitários em Tempo Real:** Tag com ponto verde pulsante (`animation: pulseNeon`) indicando aprovação integral de testes unitários (ex: `64/64 PASS`).
- **Badges de Linguagem:** Go (`#00ADD8`), TypeScript (`#3178C6`), Rust (`#DEA584`), Python (`#3572A5`).
- **Métricas:** Estrelas, forks, commits e porcentagem de cobertura de código.
- **Ações Integradas:** Atalho para execução imediata no Sandbox Piston (`▶ Abrir no IDE`) e cópia rápida de comando `git clone` via SSH.

### 3.5 Grid de Insígnias & Conquistas (`ProfileAchievementGrid.tsx`)
Classificação por 4 níveis de raridade:
- **Mítico (Âmbar Neon `#F59E0B`):** Conquistas com menos de 0.5% de desbloqueio global (ex: *Master of Concurrency*).
- **Lendário (Rocket Purple `#8257E5`):** Grandes marcos de consistência e algoritmos Hard (ex: *FAANG Slayer*, *100-Day Streak Titan*).
- **Épico (Cyan `#00E5FF`):** Domínio de conceitos avançados e aprendizado socrático (ex: *Zero Spoilers Eureka*, *Bytecode Whisperer*).
- **Raro (Neon Green `#04D361`):** Domínio de infraestrutura e isolamento de contêineres (ex: *K8s & Kernel Pioneer*).

### 3.6 Certificados Criptográficos (`ProfileCertificates.tsx`)
- Cartões com borda lateral Rocket Purple e selo `VERIFICADO ON-CHAIN`.
- Exibição de hash SHA-256 criptográfico para auditoria pública por recrutadores.
- Lista de competências dominadas e botão de download em PDF.

### 3.7 Modal de Compartilhamento Social (`ShareModal.tsx`)
- Preview visual do cartão social em alta densidade.
- Cópia instantânea da URL do dossiê com feedback visual.
- Botões de compartilhamento direto no X (Twitter) e LinkedIn.

---

## 4. Estrutura de Arquivos Criados

```
apps/web/app/profile/
├── page.tsx                             # Página principal do perfil com sistema de abas
├── profile.css                          # Tokens de design, animações de brilho e classes cyber
├── types.ts                             # Interfaces TypeScript para radar, heatmap, repos e badges
├── data/
│   └── mockProfileData.ts               # Dados realistas com 52 semanas de heatmap e projetos
└── components/
    ├── ProfileHeader.tsx                # Banner cyber, moldura Diamante/Platina e dados do dev
    ├── ProfileRadar6D.tsx               # Gráfico de Radar Hexagonal 6D em SVG com benchmark
    ├── ProfileAnnualHeatmap.tsx         # Heatmap anual de 52 semanas com níveis neon
    ├── ProfileGitRepositories.tsx       # Cards de repositórios com status de testes unitários
    ├── ProfileAchievementGrid.tsx       # Grid de badges gamificadas com níveis de raridade
    ├── ProfileCertificates.tsx          # Certificados criptográficos verificáveis com hash SHA-256
    └── ShareModal.tsx                   # Modal de compartilhamento com preview de card
```

---

## 5. Garantias de Performance e Acessibilidade (WCAG 2.1 AA)

1. **Contraste de Cores:** Todos os textos essenciais sobre os fundos Deep Obsidian atendem ou superam a razão de contraste $4.5:1$ (texto principal `#FFFFFF` e `#E1E1E6`, textos secundários `#A1A1AA`).
2. **Vetores Sem Perda:** Todos os polígonos e eixos são desenhados em SVG puro responsivo (`viewBox="0 0 240 240"`), sem dependências pesadas de bibliotecas de terceiros como Chart.js ou D3.
3. **Responsividade Total:** Grid fluido adaptável de 1 a 4 colunas em telas de smartphones ($<640\text{px}$), tablets ($768\text{px}$) e monitores ultrawide ($1280\text{px}+$ com rolagem horizontal controlada no heatmap).
