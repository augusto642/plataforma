# ⚡ Brand Book & Guia de Identidade Visual
> **NEXUS CODE — Plataforma LMS de Programação com Execução em Sandbox & Tutoria Socrática por IA**  
> *Versão 1.0.0 — Design System & Visual Architecture*

---

## 1. Visão Geral e Arquitetura da Marca

### 1.1 Posicionamento e DNA Visual
A identidade visual da **NEXUS CODE** foi construída inspirada no estado da arte das melhores ferramentas para desenvolvedores e plataformas educacionais do mundo (**Rocketseat, Vercel, Supabase, Linear, GitHub, Raycast**). 

Ela reflete:
- **Precisão Cirúrgica (Developer-First):** Estética limpa, alto contraste, tema Deep Dark e precisão milimétrica.
- **Energia e Fluidez (Gamified Neon):** Acentos neon vibrantes (`#8257E5`, `#04D361`, `#0070F3`, `#00E5FF`) que impulsionam dopamina de aprendizado, streaks e rankings.
- **Inteligência e Tutoria (Socratic AI):** Cores violeta e ciano representam a mente socrática e o feedback cognitivo.

```
                  ┌───────────────────────────────┐
                  │          NEXUS CODE           │
                  │   Developer Learning Engine   │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
  ┌──────▼───────┐        ┌──────▼───────┐        ┌──────▼───────┐
  │  DEEP DARK   │        │     NEON     │        │    SOCRATIC  │
  │  CARBON UI   │        │  EXECUTION   │        │   AI COGNITION
  │  #070A12     │        │  #04D361     │        │   #8257E5    │
  └──────────────┘        └──────────────┘        └──────────────┘
```

---

## 2. Conceito e Geometria do Logo

### 2.1 O Símbolo (Isotipo)
O isotipo é uma fusão geométrica de três elementos centrais da computação e do aprendizado contínuo:
1. **Os Colchetes de Código (`< >`):** A estrutura universal de blocos de sintaxe e algoritmos.
2. **O Raio de Execução (`⚡` / Terminal Slash `/`):** Velocidade em tempo real do sandbox Piston e o impulso de dopamina na aprovação dos testes.
3. **O Hexágono / Squircle Proporcional:** Estrutura áurea ($1 : 1.618$) com curvatura contínua (estilo Apple/Linear) que acomoda os elementos com respiro e harmonia.

```
       Grid de Construção Modular (128 x 128 px):
       ┌─────────────────────────────────────────────────┐
       │   (24px)                                        │
       │     ╱╲             ▲             ╱╲             │
       │    ╱  ╲           ╱█╲           ╱  ╲            │
       │   ╱  < ╲         ╱███╲         ╱ >  ╲           │
       │  ╱      ╲       ╱██ ⚡╲       ╱      ╲          │
       │  ╲      ╱      ╱██████╲       ╲      ╱          │
       │   ╲    ╱         ╱███╲         ╲    ╱           │
       │    ╲  ╱           ▼             ╲  ╱            │
       │     ╲╱                           ╲╱             │
       │   [Bracket L]   [Neon Pulse]    [Bracket R]     │
       │                                                 │
       │   Área de Respiro (Safe Zone): 16px em volta   │
       └─────────────────────────────────────────────────┘
```

### 2.2 Variações Oficiais da Marca
- **Logotipo Principal Horizontal:** Símbolo + Wordmark `SYNTAX` + Tag `DEV/LMS` (uso em cabeçalhos, banners e certificados).
- **Isotipo / App Icon:** Squircle com símbolo neon (uso em favicons, avatares, apps mobile e docking).
- **Monograma Reduzido:** Ícone simplificado em alta densidade de pixels para tamanhos $< 24\text{px}$.
- **Favicon Dinâmico:** SVG otimizado com viewBox `0 0 48 48` para alta visibilidade na aba do navegador.

---

## 3. Códigos SVG de Alta Precisão

### 3.1 Isotipo Principal (Icon Squircle Neon)
Arquivo: [`apps/web/public/logo-icon.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/logo-icon.svg)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" fill="none">
  <defs>
    <linearGradient id="icon-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#121829"/>
      <stop offset="100%" stop-color="#080C16"/>
    </linearGradient>
    <linearGradient id="neon-purple-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#996DFF"/>
      <stop offset="50%" stop-color="#8257E5"/>
      <stop offset="100%" stop-color="#0070F3"/>
    </linearGradient>
    <linearGradient id="neon-cyan-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="45%" stop-color="#00B37E"/>
      <stop offset="100%" stop-color="#04D361"/>
    </linearGradient>
    <filter id="emerald-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="violet-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#icon-bg-grad)"/>
  <rect x="4" y="4" width="120" height="120" rx="30" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1.5"/>
  <rect x="5" y="5" width="118" height="118" rx="29" stroke="url(#neon-purple-blue)" stroke-width="1.5" stroke-opacity="0.3"/>

  <!-- Tech Grid Background -->
  <g opacity="0.15">
    <line x1="20" y1="44" x2="108" y2="44" stroke="#8257E5" stroke-dasharray="2 4"/>
    <line x1="20" y1="64" x2="108" y2="64" stroke="#00B37E" stroke-dasharray="2 4"/>
    <line x1="20" y1="84" x2="108" y2="84" stroke="#0070F3" stroke-dasharray="2 4"/>
    <line x1="44" y1="20" x2="44" y2="108" stroke="#8257E5" stroke-dasharray="2 4"/>
    <line x1="64" y1="20" x2="64" y2="108" stroke="#00B37E" stroke-dasharray="2 4"/>
    <line x1="84" y1="20" x2="84" y2="108" stroke="#0070F3" stroke-dasharray="2 4"/>
  </g>

  <!-- Left Bracket < -->
  <path d="M46 38L26 64L46 90" stroke="url(#neon-purple-blue)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#violet-glow)"/>
  
  <!-- Right Bracket > -->
  <path d="M82 38L102 64L82 90" stroke="url(#neon-purple-blue)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#violet-glow)"/>

  <!-- Central Dynamic Lightning Pulse -->
  <path d="M72 32L54 62H69L56 96L80 58H63L72 32Z" fill="url(#neon-cyan-green)" filter="url(#emerald-glow)"/>
  
  <circle cx="26" cy="64" r="2.5" fill="#FFFFFF"/>
  <circle cx="102" cy="64" r="2.5" fill="#FFFFFF"/>
</svg>
```

---

### 3.2 Logotipo Horizontal Completo
Arquivo: [`apps/web/public/logo.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/logo.svg)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80" width="360" height="80" fill="none">
  <defs>
    <linearGradient id="logo-neon-purple-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#996DFF"/>
      <stop offset="50%" stop-color="#8257E5"/>
      <stop offset="100%" stop-color="#0070F3"/>
    </linearGradient>
    <linearGradient id="logo-neon-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="40%" stop-color="#00B37E"/>
      <stop offset="100%" stop-color="#04D361"/>
    </linearGradient>
    <linearGradient id="logo-text-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="70%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#94A3B8"/>
    </linearGradient>
    <linearGradient id="tag-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(130, 87, 229, 0.15)"/>
      <stop offset="100%" stop-color="rgba(4, 211, 97, 0.15)"/>
    </linearGradient>
    <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(10, 10)">
    <rect width="60" height="60" rx="16" fill="#0D111C" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1"/>
    <rect width="60" height="60" rx="16" stroke="url(#logo-neon-purple-blue)" stroke-width="1" stroke-opacity="0.4"/>
    <path d="M22 18L12 30L22 42" stroke="url(#logo-neon-purple-blue)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38 18L48 30L38 42" stroke="url(#logo-neon-purple-blue)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M34 15L25 29H32L26 45L38 27H30L34 15Z" fill="url(#logo-neon-green)" filter="url(#logo-glow)"/>
  </g>

  <g transform="translate(86, 22)">
    <text x="0" y="32" font-family="'Space Grotesk', 'Inter', system-ui, sans-serif" font-size="32" font-weight="800" letter-spacing="-0.03em" fill="url(#logo-text-grad)">SYNTAX</text>
    <circle cx="138" cy="28" r="3.5" fill="#04D361" filter="url(#logo-glow)"/>
    <g transform="translate(150, 11)">
      <rect width="48" height="22" rx="6" fill="url(#tag-bg-grad)" stroke="url(#logo-neon-purple-blue)" stroke-width="1" stroke-opacity="0.6"/>
      <text x="24" y="15" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" letter-spacing="0.08em" fill="#00E5FF">DEV</text>
    </g>
    <text x="2" y="47" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="500" letter-spacing="0.18em" fill="#64748B">CODE ENGINE // AI TUTOR</text>
  </g>
</svg>
```

---

## 4. Sistema de Tokens de Cor e Cores Semânticas

### 4.1 Paleta Primária (Neon & Deep Dark Surface)

| Token Name | Hex Code | RGB | Função de Uso | WCAG Contrast |
|---|---|---|---|---|
| `--bg-canvas` | `#070A12` | `7, 10, 18` | Fundo primordial da aplicação | Base 21:1 |
| `--bg-surface-1` | `#0D111C` | `13, 17, 28` | Cards, Sidebars, Topbars | AAA em texto branco |
| `--bg-surface-2` | `#161B2E` | `22, 27, 46` | Painéis elevados, modais | AAA |
| `--border-subtle` | `#22293F` | `34, 41, 63` | Divisores e bordas passivas | 3:1 em Dark |
| `--border-focus` | `#8257E5` | `130, 87, 229` | Foco de input e ativações | 4.8:1 |
| `--neon-purple` | `#8257E5` | `130, 87, 229` | Identidade primária, AI Tutor, Role Admin | 4.9:1 |
| `--neon-green` | `#04D361` | `4, 211, 97` | Sucesso, Execução de código, XP | 9.4:1 |
| `--neon-cyan` | `#00E5FF` | `0, 229, 255` | Variáveis, Destaques, Links rápidos | 12.1:1 |
| `--neon-blue` | `#0070F3` | `0, 112, 243` | Ações secundárias, Aluno Role | 4.5:1 |

---

### 4.2 Cores Semânticas de Estado (Editor, Execução, Feedback e Gamificação)

```css
:root {
  /* ==========================================================================
     EXECUÇÃO DE CÓDIGO (SANDBOX ENGINE & STATUS)
     ========================================================================== */
  --status-passed-bg: rgba(4, 211, 97, 0.10);
  --status-passed-border: #04D361;
  --status-passed-text: #04D361;
  --status-passed-glow: 0 0 16px rgba(4, 211, 97, 0.35);

  --status-failed-bg: rgba(239, 68, 68, 0.10);
  --status-failed-border: #EF4444;
  --status-failed-text: #F87171;
  --status-failed-glow: 0 0 16px rgba(239, 68, 68, 0.30);

  --status-running-bg: rgba(0, 229, 255, 0.08);
  --status-running-border: #00E5FF;
  --status-running-text: #38BDF8;

  --status-warning-bg: rgba(245, 158, 11, 0.10);
  --status-warning-border: #F59E0B;
  --status-warning-text: #FBBF24;

  /* ==========================================================================
     GAMIFICAÇÃO: LIGAS, STREAKS & XP
     ========================================================================== */
  --league-bronze: #CD7F32;
  --league-silver: #E2E8F0;
  --league-gold: #F59E0B;
  --league-platinum: #38BDF8;
  --league-diamond: #C084FC;
  
  --streak-flame: #FF5400;
  --streak-glow: 0 0 14px rgba(255, 84, 0, 0.5);
  --xp-gold: #FBBF24;

  /* ==========================================================================
     SYNTAX HIGHLIGHTING (MONACO / CODE MIRROR TOKENS)
     ========================================================================== */
  --code-keyword: #C084FC;       /* const, let, function, return, class */
  --code-function: #38BDF8;      /* solveChallenge, filter, map */
  --code-string: #4ADE80;        /* "hello world", `template` */
  --code-number: #F59E0B;        /* 100, 42, 3.14 */
  --code-comment: #64748B;       /* // explanatory comments */
  --code-variable: #E2E8F0;      /* identifiers */
  --code-operator: #F472B6;      /* =>, ===, +, && */
  
  /* ==========================================================================
     HEATMAP DE ATIVIDADE (DIÁRIO / COMMITS)
     ========================================================================== */
  --heatmap-empty: #131A29;
  --heatmap-lvl-1: #064E3B;      /* 1-2 atividades */
  --heatmap-lvl-2: #059669;      /* 3-5 atividades */
  --heatmap-lvl-3: #10B981;      /* 6-8 atividades */
  --heatmap-lvl-4: #04D361;      /* 9+ atividades com neon glow */
}
```

---

## 5. Tipografia & Escala Modular

A tipografia do sistema é baseada no emparelhamento harmonioso de 3 fontes líderes de engenharia:
1. **Space Grotesk:** Headlines, títulos de seções, números de XP e pontuações hero.
2. **Inter:** Interface de usuário (UI), labels, botões, formulários, tabelas e relatórios.
3. **JetBrains Mono / Fira Code:** Editor de código, terminal, badges técnicos, slugs, diffs e outputs do sandbox.

```
Escala Modular Tipográfica (Base 16px, Proporção 1.25 Major Third):

[Display 1]   48px / 1.1   Space Grotesk Bold (-0.03em)   → Hero Titles / Certificates
[H1]          32px / 1.2   Space Grotesk SemiBold (-0.02em)→ Page Titles / Course Title
[H2]          24px / 1.3   Space Grotesk Medium (-0.01em) → Section Headers / Modules
[H3]          18px / 1.4   Inter SemiBold (0em)           → Card Titles / Test Case Headers
[Body Large]  16px / 1.5   Inter Regular (0em)            → Enunciados e Tutoria AI
[Body Base]   14px / 1.5   Inter Regular (0em)            → UI Geral / Tabelas / Inputs
[Caption]     12px / 1.4   Inter Medium (+0.02em)         → Badges / Meta tags / Datas
[Code Main]   14px / 1.6   JetBrains Mono (ligatures ON)  → Editor de Código
[Code Micro]  12px / 1.5   JetBrains Mono SemiBold        → Terminal, Status Chips
```

---

## 6. Sistema de Badges de Ligas & Gamificação

### 6.1 Ligas de Classificação (SVG Assets)
Os assets vetoriais foram gerados na pasta pública [`apps/web/public/badges/`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/badges/):

- **Bronze:** [`badges/bronze.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/badges/bronze.svg) — Base de entrada, escudo de cobre com engrenagem.
- **Silver:** [`badges/silver.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/badges/silver.svg) — Alunos em transição, núcleo cromado com asas de vetor.
- **Gold:** [`badges/gold.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/badges/gold.svg) — Top performers, coroa dourada com brilho radiante.
- **Platinum:** [`badges/platinum.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/badges/platinum.svg) — Nível avançado, diamante ciano com reflexo de luz.
- **Diamond:** [`badges/diamond.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/badges/diamond.svg) — Elite máxima, prisma multifacetado violeta/ciano com pulso neon.

---

### 6.2 Badges de Conquistas (Achievements)
- 🌱 **Primeiro Passo (`achievement-first-step.svg`):** Concedido no primeiro envio de código executado com sucesso.
- ⭐ **Pontuação Perfeita (`achievement-perfect-score.svg`):** Concedido ao alcançar nota 100/100 na primeira tentativa.
- 🔥 **Foco Constante (`achievement-streak.svg`):** Concedido ao manter 3+ dias seguidos de prática diária.
- 🧠 **Pensamento Socrático (`achievement-socratic.svg`):** Concedido ao interagir com o Tutor IA e resolver um bug por dedução lógica.

---

## 7. Banner OpenGraph & Social Sharing

O banner oficial para redes sociais (Twitter Cards, LinkedIn, Discord e WhatsApp) foi desenhado na resolução padrão **1200 x 630 px**:
Arquivo: [`apps/web/public/og-image.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/og-image.svg)

---

## 8. Guia de Implementação e Estilos de Componentes (Tailwind CSS)

```typescript
// tailwind.config.ts - Extensão de tokens de marca
export const brandTheme = {
  extend: {
    colors: {
      brand: {
        canvas: '#070A12',
        surface: {
          100: '#0D111C',
          200: '#161B2E',
          300: '#22293F',
        },
        purple: '#8257E5',
        green: '#04D361',
        cyan: '#00E5FF',
        blue: '#0070F3',
      },
      status: {
        passed: '#04D361',
        failed: '#EF4444',
        running: '#00E5FF',
        warning: '#F59E0B',
      },
    },
    fontFamily: {
      display: ['var(--font-space-grotesk)', 'sans-serif'],
      sans: ['var(--font-inter)', 'sans-serif'],
      mono: ['var(--font-jetbrains-mono)', 'monospace'],
    },
    boxShadow: {
      'neon-green': '0 0 20px -3px rgba(4, 211, 97, 0.45)',
      'neon-purple': '0 0 20px -3px rgba(130, 87, 229, 0.45)',
      'neon-cyan': '0 0 20px -3px rgba(0, 229, 255, 0.45)',
    },
  },
};
```
