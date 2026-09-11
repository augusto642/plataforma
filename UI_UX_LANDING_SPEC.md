# 🌌 NEXUS CODE — Master UI/UX & Design System Specification
> **Documento:** Especificação Visual & Design System da Landing Page  
> **Estética:** *Dark Obsidian (High-End Developer Platform)*  
> **Inspiração:** Linear.app, Cursor.com, Vercel, Raycast, Supabase  
> **Versão:** 3.0.0 — Production-Ready Visual & Interaction Guide  

---

## 1. Filosofia Visual "Dark Obsidian"

A estética visual da **NEXUS CODE** parte do princípio de que ferramentas de alta densidade cognitiva para desenvolvedores devem ser calmas, elegantes e livres de poluição visual. Em vez de excesso de neon estridente ou gradientes caóticos, adotamos a abordagem **Dark Obsidian**:

1. **Superfícies em Camadas Profundas (Obsidian Layering):** O contraste é construído através de múltiplos níveis de escuridão profunda (`#09090B` -> `#121214` -> `#18181B` -> `#27272A`), criando profundidade física tridimensional sem ruído óptico.
2. **Luz Especular e Bordas Micrométricas de 1px:** As divisões entre elementos não são linhas sólidas pesadas, mas sim bordas translúcidas de `1px` com gradientes angulares que capturam a luz ambiente (`border: 1px solid rgba(255, 255, 255, 0.08)`).
3. **Acentos Semânticos Funcionais:** A cor só entra em cena para transmitir significado e feedback cognitivo — nunca como adorno decorativo redundante. Cada tom possui um papel no ciclo de recompensa da dopamina de código.
4. **Precisão Tipográfica Monospaçada e Geométrica:** Fusão da geometria moderna (`Space Grotesk`) com a legibilidade suíça cirúrgica (`Inter`) e a precisão do código tabular (`JetBrains Mono`).

---

## 2. Design Tokens & Paleta Cromática

### 2.1 Matriz de Superfícies Obsidian

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NIVEL 0: Canvas Base (Dark Space)         ──▶ #09090B                       │
│ NIVEL 1: Sub-superfície / Containers      ──▶ #0E0E11                       │
│ NIVEL 2: Card Base / Bento Surface        ──▶ #121214                       │
│ NIVEL 3: Card Elevated / Sandbox Editor   ──▶ #18181B                       │
│ NIVEL 4: Floating Menu / Tooltips / Tabs  ──▶ #202024                       │
│ NIVEL 5: Border & Highlight Stroke        ──▶ #27272A / rgba(255,255,255,0.08)
└─────────────────────────────────────────────────────────────────────────────┘
```

| Token CSS | Hex / RGBA | Uso na Interface | Contraste (WCAG) |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#09090B` | Fundo geral da página (Body Canvas) | Base (1:1) |
| `--bg-subsurface` | `#0E0E11` | Áreas de agrupamento e grids secundários | 1.08:1 |
| `--bg-card` | `#121214` | Superfície dos cards Bento e painéis | 1.16:1 |
| `--bg-card-elevated` | `#18181B` | Editor de código, inputs, dropdowns | 1.32:1 |
| `--bg-surface-floating` | `#202024` | Tooltips flutuantes, modais, active tabs | 1.55:1 |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Bordas estáticas de 1px em cards e divisores | Suave |
| `--border-strong` | `#27272A` | Bordas com maior separação de contexto | Nítido |
| `--border-focus` | `rgba(130, 87, 229, 0.6)` | Borda reativa de foco / seleção ativa | Destaque |

---

### 2.2 Acentos Semânticos e Cores de Feedback

```
  🟣 #8257E5       🔵 #00E5FF       🟢 #04D361       🔴 #F43F5E       🟠 #FFA116
[Socratic AI]    [Data / Stream]   [Test Passed]    [Test Failed]    [Streak / XP]
```

| Token de Acento | Valor Hex | Significado Semântico & Aplicação |
| :--- | :--- | :--- |
| `--accent-purple` | `#8257E5` | **IA Socrática & Cognição:** Indicadores de tutoria, botões primários de ação e brilhos de foco. |
| `--accent-purple-glow`| `rgba(130, 87, 229, 0.25)` | Halo de iluminação de fundo (ambient spotlight). |
| `--accent-cyan` | `#00E5FF` | **Velocidade & Sandbox Piston:** Execuções em tempo real, streams de telemetria, WebSocket ativo. |
| `--accent-green` | `#04D361` | **Validação & Testes Aprovados:** Sucesso de compilação, status `ALL TESTS PASSED`, XP ganho. |
| `--accent-red` | `#F43F5E` | **Erros & Falhas de Asserção:** Linhas com syntax error, testes reprovados, avisos críticos. |
| `--accent-amber` | `#FFA116` | **Streaks & Ligas Competitivas:** Fogo de consistência diária, tiers Ouro/Diamante, bônus. |

---

### 2.3 Tipografia e Escala Modular

A tipografia do NEXUS CODE usa três fontes com papéis estritos:

```
┌─────────────────────────┬──────────────────────────┬────────────────────────┐
│     Space Grotesk       │          Inter           │     JetBrains Mono     │
│  (Headings & Display)   │      (UI Body & Copy)    │   (Code, Logs & Data)  │
│  Pesos: 600, 700, 800   │  Pesos: 400, 500, 600    │  Pesos: 400, 500       │
└─────────────────────────┴──────────────────────────┴────────────────────────┘
```

#### Escala Tipográfica (Ratio 1.25 - Major Third)

```css
:root {
  /* Font Families */
  --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Font Sizes & Line Heights */
  --text-hero-display: clamp(2.5rem, 5.5vw, 4.25rem); /* 68px | line-height: 1.05 | letter-spacing: -0.035em */
  --text-h2-section: clamp(1.875rem, 3.5vw, 2.75rem); /* 44px | line-height: 1.15 | letter-spacing: -0.025em */
  --text-h3-card: 1.375rem;                          /* 22px | line-height: 1.30 | letter-spacing: -0.015em */
  --text-body-lg: 1.125rem;                          /* 18px | line-height: 1.60 | letter-spacing: -0.010em */
  --text-body-md: 0.9375rem;                         /* 15px | line-height: 1.50 | letter-spacing: 0 */
  --text-body-sm: 0.8125rem;                         /* 13px | line-height: 1.45 | letter-spacing: 0.010em */
  --text-code: 0.8125rem;                            /* 13px | line-height: 1.55 | letter-spacing: 0 */
}
```

---

## 3. Componente Interativo do Hero: Code Sandbox Mockup

O Hero da Landing Page apresenta o motor da plataforma através de um **Interactive Code Sandbox** funcional e esteticamente no padrão Vercel/Linear:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔴 🟡 🟢   nexus-sandbox-v2 (Piston Sub-50ms)           [Rust 1.78] [⚡ 32ms] │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  [main.rs]   server.go   handler.ts  │ ▶ Executar Código (⌘+Enter)           │
├──────────────────────────────────────┴──────────────────────────────────────┤
│  1 │ fn solve_distributed_consensus(nodes: &[Node]) -> Result<Leader, Err> {│
│  2 │     let active_quorum = nodes.iter().filter(|n| n.is_alive()).count(); │
│  3 │     if active_quorum >= (nodes.len() / 2) + 1 {                        │
│  4 │         Ok(Leader::elected(nodes[0].id))                               │
│  5 │     } else {                                                           │
│  6 │         Err(ConsensusError::QuorumLoss)                                │
│  7 │     }                                                                  │
│  8 │ }                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📟 TERMINAL & TEST RUNNER (Real Execution Logs)                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│  [2026-09-09 00:37:13] ⚡ Compilando rustc 1.78 (opt-level=3)... 14ms       │
│  [2026-09-09 00:37:13] 🟢 Test 01: Leader election with 5 nodes ... PASSED  │
│  [2026-09-09 00:37:13] 🟢 Test 02: Network partition quorum check ... PASSED│
│  [2026-09-09 00:37:13] 🟢 Test 03: Fault recovery & re-election ... PASSED  │
│  [2026-09-09 00:37:13] ✨ All 3 test suites passed! (+50 XP | Streak 14d)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🟣 SOCRATIC AI MENTOR                                                       │
│  "Excelente uso de iteradores sem alocação no heap. O que aconteceria com a │
│   liderança se 2 nós respondessem com o mesmo timestamp no election tick?"  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Especificação de Interatividade das Abas

O componente suporta troca dinâmica entre 3 linguagens de alta demanda:

1. **`main.rs` (Rust):**
   - *Snippet:* Algoritmo de consenso distribuído com Raft Quorum.
   - *Output Terminal:* `rustc 1.78 -O` compilado em `18ms`, 3 testes unitários aprovados.
   - *Socratic Prompt:* Análise de alocação de memória e concorrência sem race condition.

2. **`server.go` (Go):**
   - *Snippet:* Pipeline de streaming assíncrono com goroutines e channels com buffer.
   - *Output Terminal:* `go test -v -race` executado em `24ms`, 0 race conditions detectadas.
   - *Socratic Prompt:* Questionamento sobre vazamento de goroutine caso o canal receptor feche prematuramente.

3. **`handler.ts` (TypeScript):**
   - *Snippet:* Middleware de autenticação JWT Ed25519 com rate-limiting em memória via sliding window.
   - *Output Terminal:* `bun test` executado em `12ms`, 4 casos de borda aprovados.
   - *Socratic Prompt:* Pergunta sobre complexidade temporal do garbage collector de chaves expiradas.

### 3.2 Micro-Interações do Botão 'Run Code'

- **Estado Idle:** Fundo `#8257E5`, texto `#FFFFFF`, borda `1px solid rgba(255,255,255,0.2)`.
- **Hover:** Brilho suave `box-shadow: 0 0 20px rgba(130, 87, 229, 0.45)`, escala discreta `1.015`.
- **Estado Executando (Click):**
  - Efeito de **Conic Shimmer Border** girando a 360º ao redor do botão.
  - Ícone de Play troca para spinner vetorial de 16px.
  - Terminal exibe animação de streaming de texto linha a linha em tempo real.
- **Estado Sucesso (Resolved):**
  - Badge verde esmeralda surge com pulso sutil de escala.
  - Efeito sonoro tátil opcional (ou partículas discretas de brilho em CSS).
  - Caixa de feedback socrático da IA surge com fade-in e slide vertical de 8px.

---

## 4. Cards de Funcionalidades (Bento Grid & Glassmorphism Refinado)

O Bento Grid organiza as capacidades estruturais da plataforma com hierarquia assimétrica e profundidade tátil.

### 4.1 Especificação de Glassmorphism & Bordas Gradiente

```css
/* Card Bento Base com Gradiente Sutil de Borda */
.nexus-bento-card {
  position: relative;
  background: #121214;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Hover State com Spotlight e Iluminação Suave */
.nexus-bento-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
  box-shadow: 
    0 12px 32px -8px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(130, 87, 229, 0.15);
}

/* Pseudo-elemento para iluminação interna especular */
.nexus-bento-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.15) 30%, 
    rgba(130, 87, 229, 0.4) 50%, 
    rgba(255, 255, 255, 0.15) 70%, 
    transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nexus-bento-card:hover::before {
  opacity: 1;
}
```

---

### 4.2 Matriz do Bento Grid (4 Pilares Fundamentais)

```
┌───────────────────────────────────────────────────┬───────────────────────────────┐
│ [CARD 1 - 7 Colunas]                              │ [CARD 2 - 5 Colunas]          │
│ Sandbox de Execução Piston Sub-50ms               │ Tutor IA Socrático Cognitivo  │
│ Multi-Language Kernel (Rust, Go, TS, Python, C++) │ Diálogos socráticos anti-cola │
│ Telemetria em tempo real e isolamento seguro      │ que desenvolvem raciocínio    │
├───────────────────────────────────────────────────┼───────────────────────────────┤
│ [CARD 3 - 5 Colunas]                              │ [CARD 4 - 7 Colunas]          │
│ Gamificação e Ligas de Maestria                   │ Radar de Habilidades & Vagas  │
│ 5 Ligas (Bronze ➔ Diamante) + Streaks Solares     │ Radar pentagonal verificado   │
│ Sistema de XP justo baseado em complexidade       │ Conexão direta com Tech Leads │
└───────────────────────────────────────────────────┴───────────────────────────────┘
```

#### Detalhamento Visual dos 4 Cards

1. **Card 1: Piston Sandbox Sub-50ms (7 Colunas)**
   - *Visual:* Visualizador de micro-benchmarks com barra de latência pulsando a `32ms`.
   - *Chips de Tecnologias:* Rust, Go, TypeScript, Python 3.12, C++20 com ícones monocromáticos que ganham cor no hover.
   - *Highlight:* Borda com gradiente suave ciano/roxo no topo.

2. **Card 2: Tutor IA Socrático (5 Colunas)**
   - *Visual:* Balão de pensamento estilizado com micro-animação de pulsação cognitiva.
   - *Badge:* "Nunca dá o código pronto — ensina a pensar como Staff Engineer".
   - *Highlight:* Halo violeta discreto centralizado.

3. **Card 3: Gamificação & Ligas de Maestria (5 Colunas)**
   - *Visual:* Insígnias 3D estilizadas em vetor dos 5 tiers (Bronze, Prata, Ouro, Platina, Diamante).
   - *Streak Counter:* Contador de fogo âmbar (`🔥 14 Dias`) com efeito de gradiente de calor.

4. **Card 4: Radar de Habilidades & Talent Matching (7 Colunas)**
   - *Visual:* Gráfico de radar pentagonal em SVG com 5 eixos (Algoritmos, Concorrência, Clean Code, Testes, Arquitetura).
   - *Selo Verificado:* Badge "Perfil Validado por Compilador & Testes Unitários Reais".

---

## 5. Especificação de Layout Responsivo

O grid é estruturado com base em um sistema fluido de 12 colunas, adaptável a 4 breakpoints principais:

```
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ Breakpoint           │ Estrutura de Layout & Comportamento                     │
├──────────────────────┼─────────────────────────────────────────────────────────┤
│ Mobile (375px - 767px)│ 1 Coluna Stacked                                        │
│                      │ - Navbar: Ícone + Hambúrguer Sheet                     │
│                      │ - Hero: Headline centrada, Code Sandbox em abas touch   │
│                      │ - Bento Cards: Empilhamento vertical 100% largura       │
│                      │ - Touch target mínimo: 44px x 44px                      │
├──────────────────────┼─────────────────────────────────────────────────────────┤
│ Tablet (768px - 1199px) 2 Colunas Grid                                          │
│                      │ - Navbar: Links inline + Botões de Ação                 │
│                      │ - Hero: Headline + Sandbox com layout adaptável         │
│                      │ - Bento Cards: Grid 2x2 harmonizado                     │
├──────────────────────┼─────────────────────────────────────────────────────────┤
│ Desktop (1200px - 1439px) 12 Colunas Grid                                       │
│                      │ - Max Container Width: 1200px centralizado              │
│                      │ - Hero: Split 45% (Copy/CTAs) / 55% (Interactive IDE)   │
│                      │ - Bento Grid: 7+5 / 5+7 colunas assimétricas            │
├──────────────────────┼─────────────────────────────────────────────────────────┤
│ Wide (1440px+)       │ 12 Colunas com Margens de Respiro Amplas                │
│                      │ - Max Container Width: 1360px centralizado              │
│                      │ - Efeitos de iluminação ambiente periférica             │
└──────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 6. Acessibilidade (WCAG 2.1 AA) e Ergonomia Cognitiva

- **Relação de Contraste de Texto:**
  - Títulos `#F4F4F5` sobre `#09090B` = **18.5:1** (Supera padrão AAA de 7:1).
  - Corpo de texto `#A1A1AA` sobre `#121214` = **7.8:1** (Conforme AAA).
  - Texto de código `#E4E4E7` sobre `#18181B` = **12.2:1** (Excelente legibilidade).
- **Navegação por Teclado:**
  - Todos os elementos interativos possuem `:focus-visible` com anel de foco customizado: `outline: 2px solid #8257E5; outline-offset: 2px;`.
  - Atalho global `⌘ + Enter` / `Ctrl + Enter` mapeado para o botão de execução de código.
- **Redução de Movimento:**
  - `@media (prefers-reduced-motion: reduce)` desativa shimmers contínuos, pulsações e rotações, substituindo por transições instantâneas de opacidade.

---

## 7. Tokens Tailwind CSS Prontos para Engenharia

Para aplicação direta nos componentes Next.js / Tailwind do projeto:

```js
// Configuração de cores e tokens no tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        obsidian: {
          canvas: '#09090B',
          subsurface: '#0E0E11',
          card: '#121214',
          elevated: '#18181B',
          floating: '#202024',
          border: '#27272A',
        },
        nexus: {
          purple: '#8257E5',
          'purple-glow': 'rgba(130, 87, 229, 0.25)',
          cyan: '#00E5FF',
          green: '#04D361',
          red: '#F43F5E',
          amber: '#FFA116',
        }
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(130, 87, 229, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(0, 229, 255, 0.30)',
        'glow-green': '0 0 25px -5px rgba(4, 211, 97, 0.30)',
        'card-obsidian': '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      }
    }
  }
}
```

---

## 8. Conclusão & Próximos Passos de Implementação

Com esta especificação `UI_UX_LANDING_SPEC.md`, o time de engenharia frontend possui a referência canônica completa para:
1. Atualizar ou refinar a página principal [`apps/web/app/page.tsx`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/app/page.tsx) com o Hero Sandbox interativo.
2. Aplicar os Bento Cards com gradientes sutis de 1px e micro-interações sem excesso de ruído visual.
3. Garantir a consistência estética e responsividade fluida em todas as resoluções de tela.
