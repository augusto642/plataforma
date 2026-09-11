# 🌐 NEXUS CODE — Master Landing Page & Visual Design Specification
> **Lead Brand Designer & Art Direction Guide**  
> *Padrão World-Class: Inspirado em Linear, Raycast, Vercel, Supabase e Rocketseat*  
> *Versão: 2.0.0 — Design System, Layout Definitivo & Design Tokens*

---

## 1. Fundamentos Visuais e Design Tokens

### 1.1 Paleta Cromática "Deep Obsidian & Cyberpunk Neon"
Projetada para garantir foco cognitivo absoluto, alta legibilidade e contraste WCAG AAA (> 7:1) em monitores OLED/HDR e LCD:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPERFÍCIES OBSIDIAN (Deep Dark Layering)                                  │
│  #09090A (Canvas Base) ──▶ #121214 (Card Surface) ──▶ #18181B (Hover Edge)  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ACENTOS NEON & FEEDBACK COGNITIVO                                          │
│  🟣 #8257E5 (Rocket Purple / AI Socratic)  🟢 #04D361 (Neon Emerald / Passed) │
│  🔵 #00E5FF (Cyan Warp / Speed & Sandbox)  🟠 #FFA116 (Amber Flame / Streaks) │
│  🔴 #F75A68 (Crimson Red / Fail/Error)     ⚪ #F4F4F5 (Pure Crisp Text)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Token CSS | Hex | Uso Primário | Contraste vs #09090A |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#09090A` | Fundo principal da página | Base 1:1 |
| `--bg-card` | `#121214` | Fundo dos cards Bento e containers | 1.15:1 |
| `--bg-card-elevated` | `#18181B` | Dropdowns, popovers, estados ativos | 1.3:1 |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Divisores e bordas estáticas | Delicado |
| `--border-glow` | `rgba(130, 87, 229, 0.4)` | Bordas reativas e spotlights | Alto impacto |
| `--brand-purple` | `#8257E5` | Acentos de IA Socrática, botões principais | 5.8:1 (UI) |
| `--brand-green` | `#04D361` | Feedback PASSED, XP, Streaks e validação | 11.2:1 (AAA) |
| `--brand-cyan` | `#00E5FF` | Sandbox Piston, tags de velocidade | 12.8:1 (AAA) |
| `--brand-amber` | `#FFA116` | Gamificação, ligas de Ouro, streaks diários | 8.9:1 (AAA) |
| `--text-primary` | `#F4F4F5` | Headings e corpo de texto principal | 18.5:1 (AAA) |
| `--text-muted` | `#94A3B8` | Subtítulos, labels e descrições secundárias | 7.6:1 (AAA) |

---

### 1.2 Tipografia & Escala Modular
Combinação de 3 famílias tipográficas com propósitos visuais estritos:
- **Display & Headings:** `Space Grotesk` (Geométrica, moderna, futurista, peso 700/800).
- **Interface & Leitura:** `Inter` (Legibilidade cirúrgica em densidades altas, pesos 400, 500, 600).
- **Código & Dados:** `JetBrains Mono` / `Fira Code` (Ligaduras de programação, alinhamento tabular para métricas de tempo e linhas de código).

```css
/* Escala Tipográfica Modular (Ratio 1.25 - Major Third) */
:root {
  --text-hero-display: clamp(2.75rem, 6vw, 4.5rem); /* 72px line-height 1.05 */
  --text-h2-section: clamp(2rem, 4vw, 3rem);        /* 48px line-height 1.15 */
  --text-h3-card: clamp(1.25rem, 2.5vw, 1.75rem);   /* 28px line-height 1.25 */
  --text-body-lg: 1.125rem;                         /* 18px line-height 1.6 */
  --text-body-base: 0.9375rem;                      /* 15px line-height 1.5 */
  --text-code-sm: 0.8125rem;                        /* 13px line-height 1.4 */
}
```

---

## 2. Wireframe & Arquitetura Visual das 8 Seções da Landing Page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [1] NAVBAR SUSPENSA FLUTUANTE (Glassmorphism + Live Coders Badge + Auth CTA)  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [2] HERO SECTION                                                             │
│  ├─ Esquerda: Badge Glow + Headline H1 + Subtitle + CTAs Duplos + Social Proof│
│  └─ Direita: Terminal & Sandbox Vivo (Live Execution, Test Output, XP + Tutor)│
├──────────────────────────────────────────────────────────────────────────────┤
│ [3] BENTO GRID DOS 4 PILARES (Spotlight Cursor + Efeitos Visuais)             │
│  ├─ Card 1 (7 cols): Sandbox Piston Sub-50ms (Multi-language)                │
│  ├─ Card 2 (5 cols): Tutor IA Socrático Cognitivo (Anti-Cheat / Diálogo)      │
│  ├─ Card 3 (5 cols): Gamificação & Ligas de Classificação (Streaks & Tiers)  │
│  └─ Card 4 (7 cols): Radar de Competências & Talent Portal Verificado        │
├──────────────────────────────────────────────────────────────────────────────┤
│ [4] DEMONSTRAÇÃO INTERATIVA (Interactive Sandbox & Socratic AI Playground)    │
│  - Editor com abas TS/Python/Go/Rust, botão Executar, Terminal & Dicas IA     │
├──────────────────────────────────────────────────────────────────────────────┤
│ [5] MATRIZ COMPARATIVA DE SUPERIORIDADE (Nexus Code vs Bootcamps vs Vídeo)    │
│  - Tabela Glassmorphism comparando 8 dimensões de aprendizado                │
├──────────────────────────────────────────────────────────────────────────────┤
│ [6] VITRINE DAS LIGAS & RADAR DE TALENTOS (Bronze a Diamante Shaders)        │
│  - Badges metálicos 3D vetoriais + Radar pentagonal de habilidades           │
├──────────────────────────────────────────────────────────────────────────────┤
│ [7] TABELA DE PREÇOS TRANSPARENTE (Toggle Mensal / Anual -20% OFF)            │
│  - Explorer (R$ 0) | Pro Engineer (R$ 39/mês) [Destaque Glow] | Team Corp    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [8] FAQ INTERATIVO EM ACCORDION & FOOTER GLOBAL                              │
│  - 6 Dúvidas Frequentes + Status Operacional 99.99% + Links + Redes          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificação Detalhada Seção por Seção

### 3.1 Seção 1: Navbar Flutuante Suspensa
- **Posição:** Fixa `top-4 inset-x-4 md:inset-x-8 max-w-7xl mx-auto`, `z-50`.
- **Efeito Visual:** `bg-[#09090A]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl`.
- **Componentes:**
  1. **Brandmark:** `< ⚡ > NEXUS CODE` com ponto verde neon pulsante (`animate-ping`).
  2. **Links de Navegação:** "Plataforma", "Metodologia Socrática", "Ligas & Ranking", "Preços", "FAQ".
  3. **Live Counter:** Chip `🟢 1.482 devs praticando agora` (sensação de comunidade viva).
  4. **Ações:** Botão "Entrar" (Ghost) + Botão "Criar Conta Grátis" (Gradiente `#8257E5` ➔ `#04D361` com borda shimmer).

---

### 3.2 Seção 2: Hero Section com Terminal Sandbox Vivo
- **Iluminação Atmosférica:**
  - Ponto de luz violeta (#8257E5) no topo esquerdo.
  - Ponto de luz esmeralda (#04D361) na direita atrás do editor.
  - Grid cibernético sutil de $40\text{px} \times 40\text{px}$ com fade radial 70%.
- **Conteúdo Coluna Esquerda:**
  - **Badge de Lançamento:** `⚡ O FUTURO DO APRENDIZADO DE SOFTWARE` com borda degradê violeta.
  - **Headline Principal:**  
    `"Domine programação escrevendo código real.`  
    `<span class="gradient-text">Não apenas assistindo vídeos.</span>"`
  - **Subheadline:**  
    `"O único ecossistema LMS com execução segura em sandbox sub-50ms, tutoria socrática por inteligência artificial e radar de talentos para contratação por Big Techs."`
  - **Grupo de CTAs:**
    - Botão 1 (Primário): `[ Iniciar Desafio Gratuito ➔ ]` com partículas de hover.
    - Botão 2 (Secundário): `[ ▷ Ver Demonstração Interativa ]` abre modal/scroll suave para o playground.
  - **Social Proof Strip:** 5 avatares empilhados + `"Mais de 12.000 desafios compilados hoje com nota máxima"`.

- **Mockup Interativo Coluna Direita (The Live Sandbox Window):**
  - Janela macOS Dark com 3 botões (🔴 🟡 🟢) e título `two_sum.ts — Nexus Piston Sandbox`.
  - Código TypeScript em Monaco/Shiki com syntax highlight de alto contraste.
  - **Botão de Ação no Editor:** `[ ▶ Executar Testes (Ctrl+Enter) ]` com efeito de rotação de borda conic.
  - **Output Terminal:**
    ```
    ✔ Test Case 1: [2,7,11,15], target=9 ➔ PASSED (1.8ms)
    ✔ Test Case 2: [3,2,4], target=6 ➔ PASSED (1.2ms)
    ✔ Memory Consumption: 4.1MB | Time: 34ms (Top 5% Global)
    ```
  - **Micro-Card Flutuante 1 (Gamificação):** Tag `+120 XP` + `🔥 Streak: 7 Dias` deslizando da lateral direita.
  - **Micro-Card Flutuante 2 (Tutor IA Socrático):** Card violeta com avatar da IA e fala:
    `"Excelente complexidade O(N)! O que aconteceria se o array contivesse valores duplicados?"`

---

### 3.3 Seção 3: Bento Grid dos 4 Pilares (Spotlight Cursor)
Estrutura de 12 colunas com cartões assimétricos e luz spotlight radial reativa ao mouse:

#### Card 1 (7 Colunas) — Sandbox Isolado de Alta Velocidade (Piston Engine)
- **Visual:** Terminal em execução mostrando tempos de compilação em microssegundos.
- **Destaques:** Suporte a TypeScript, Python, Rust, Go, C++; isolamento em Linux cgroups; execução em tempo real sub-50ms sem gargalos de servidor.

#### Card 2 (5 Colunas) — Tutor Socrático com IA Cognitiva
- **Visual:** Diálogo flutuante em balões violeta demonstrando o método socrático (faz perguntas reflexivas em vez de cuspir o código pronto).
- **Destaques:** Guardrails anti-cola; mapeamento de lacunas conceituais; explicações linha por linha.

#### Card 3 (5 Colunas) — Gamificação de Elite & Ligas Competitivas
- **Visual:** Medalha 3D da Liga Diamante girando sutilmente + Heatmap estilo GitHub com quadradinhos verde neon e contador de Streak `🔥 14 Dias`.
- **Destaques:** 5 Tiers (Bronze, Prata, Ouro, Platina, Diamante); reset semanal de divisão; recompensas por consistência.

#### Card 4 (7 Colunas) — Radar de Competências & Portal de Talentos
- **Visual:** Gráfico Radar pentagonal (Algoritmos, Arquitetura, Clean Code, Performance, Testes) com score geral 96/100 e selo "Dev Verificado".
- **Destaques:** Conexão direta com recrutadores de tecnologia; histórico de commits e submissões imutáveis.

---

### 3.4 Seção 4: Demonstração Interativa (Live Sandbox Playground)
Área na qual o visitante pode realmente experimentar a plataforma sem cadastro:
- **Tabs de Linguagem:** `[ TypeScript ]` `[ Python ]` `[ Go ]` `[ Rust ]`.
- **Editor Embutido:** Snippet de algoritmo clássico (ex: Busca Binária ou Inversão de Árvore).
- **Painel Duplo:**
  - Lado A: Editor de código interativo.
  - Lado B: Terminal Piston ao vivo com validação imediata e feedback do Tutor IA.

---

### 3.5 Seção 5: Matriz Comparativa de Superioridade

| Recursos & Metodologia | NEXUS CODE ⚡ | Bootcamps Tradicionais | Cursos Gravados (Udemy/YT) | LeetCode / HackerRank |
| :--- | :---: | :---: | :---: | :---: |
| **Execução de Código em Tempo Real** | **Sim (48ms)** | Raramente / Setup local | Não (Apenas vídeo) | Sim (Básico) |
| **Tutor Socrático por IA (Sem dar cola)** | **Nativo 24/7** | Não (Monitores limitados) | Não | Não |
| **Feedback Linha a Linha Automatizado** | **Imediato** | Manual / Demorado | Inexistente | Apenas erro de console |
| **Radar de Habilidades Comprovado** | **Sim (Gráfico 5D)** | Apenas certificado PDF | Não | Ranking geral |
| **Integração com Repositórios Git** | **Automática** | Manual | Não | Não |
| **Preço Acessível** | **R$ 39/mês** | R$ 5.000 a R$ 20.000 | R$ 30 - 300 por curso | $35/mês ($180/ano) |

---

### 3.6 Seção 6: Vitrine das Ligas & Badges Metálicos
Paleta de materiais dos badges para visualização rica:
1. **Liga Bronze:** Cobre fosco `#CD7F32` com acentos âmbar e ranhuras metálicas.
2. **Liga Prata:** Aço escovado `#E2E8F0` com reflexos ciano `#00E5FF`.
3. **Liga Ouro:** Ouro 24K `#FFD700` com glow âmbar dourado `#FFA116`.
4. **Liga Platina:** Platina líquida `#00E5FF` com reflexos esmeralda `#04D361`.
5. **Liga Diamante:** Cristal refratário `#8257E5` + `#00E5FF` com animação de brilho angular (*diamond shimmer*).

---

### 3.7 Seção 7: Tabela de Preços (Toggle Mensal/Anual)

#### Toggle Interativo:
`[ Mensal ]` `[ Anual (Economize 20% + 2 meses grátis) 🔥 ]`

#### Tiers de Planos:
1. **EXPLORER (Gratuito — R$ 0/mês)**
   - 10 execuções diárias de sandbox.
   - Trilhas de Fundamentos (TypeScript & Python).
   - Acesso ao ranking de Liga Bronze.
   - Suporte da comunidade.

2. **PRO ENGINEER (Plano Destacado — R$ 39/mês no anual ou R$ 49 no mensal)**
   - *Borda Conic Gradient animada em Roxo/Esmeralda + Tag "MAIS ESCOLHIDO"*.
   - Execuções ilimitadas no Sandbox Piston sub-50ms.
   - Tutor IA Socrático ilimitado com feedback por linha.
   - Acesso a todas as Trilhas Avançadas (Arquitetura, Concorrência, Rust, Go).
   - Ligas Competitivas completas (Bronze ao Diamante).
   - Radar de Talentos exportável e perfil indexado para empresas parceiras.
   - Repositórios Git automáticos para cada atividade.

3. **TEAM & ENTERPRISE (Sob Medida — R$ 149/dev/mês)**
   - Sandbox com limites dedicados e clusters privados.
   - Criação de desafios customizados e testes ocultos da própria empresa.
   - Relatórios executivos de proficiência e gaps técnicos do time.
   - Suporte dedicado via Slack/Discord prioritário.

---

### 3.8 Seção 8: FAQ & Footer de Alta Fidelidade

#### Perguntas Frequentes (Accordion Glassmorphism):
1. *Como o Tutor Socrático me ajuda a aprender de verdade?*
   - O Tutor Socrático não entrega a resposta pronta. Ele analisa sua árvore sintática e faz perguntas direcionadas para desbloquear seu raciocínio lógico.
2. *O sandbox é seguro para rodar qualquer código?*
   - Sim, cada execução roda em um container isolado efêmero com limites estritos de memória, CPU e sem acesso à rede externa.
3. *Como as empresas encontram meu perfil no Radar de Talentos?*
   - Ao atingir pontuações consistentes nas ligas Ouro ou superior, seu perfil pode ser tornado público para os parceiros de recrutamento com validação técnica garantida.
4. *Posso cancelar minha assinatura a qualquer momento?*
   - Sim, o cancelamento é instantâneo com um clique no painel, sem multas ou burocracia.

#### Footer:
- **System Status Indicator:** `🟢 All Systems Operational — Piston Execution: 38ms avg`.
- **Brand Info & Socials:** GitHub, Discord, Twitter/X, LinkedIn, YouTube.
- **Copyright & Compliance:** "© 2026 NEXUS CODE. Construído para desenvolvedores que buscam a maestria."

---

## 4. Efeitos Visuais, Shaders e Micro-interações em CSS

```css
/* Shimmer Conic Border Animation para o Card Pro e CTAs */
@keyframes spin-gradient {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.glow-conic-border {
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  padding: 1px;
}

.glow-conic-border::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    #8257E5 25%,
    #04D361 50%,
    #00E5FF 75%,
    transparent 100%
  );
  animation: spin-gradient 4s linear infinite;
  z-index: 0;
}

/* Glassmorphism Ultra-Clean */
.nexus-glass-card {
  background: rgba(18, 18, 20, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

/* Gradiente de Texto Holográfico */
.gradient-text-nexus {
  background: linear-gradient(135deg, #FFFFFF 20%, #A78BFA 60%, #00E5FF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 5. Checklist de Qualidade de Arte & Design System

- [x] Contraste WCAG AAA em todos os textos sobre fundos `#09090A` e `#121214`.
- [x] Tipografia modular equilibrada (`Space Grotesk` + `Inter` + `JetBrains Mono`).
- [x] Feedback de dopamina visual com transições suaves (Confetti, contadores de XP, status PASSED verde neon).
- [x] Coesão entre a Landing Page e o Dashboard interno da plataforma.
- [x] Efeitos responsivos perfeitos em Mobile, Tablet e Desktop 4K.
