# ⚡ Especificação Visual de Design System: Registro & Onboarding
> **NEXUS CODE — Developer Learning Engine & Socratic AI**  
> *Versão 1.0.0 — Visual UI/UX & Component Architecture Specification*

---

## 1. Visão Geral e Filosofia de Design

O fluxo de **Registro & Onboarding da NEXUS CODE** é projetado como o primeiro momento "aha!" do desenvolvedor na plataforma. Ele abandona formulários estáticos tradicionais em favor de uma experiência imersiva, gamificada e orientada à estética de ferramentas modernas para engenheiros de software (**Vercel, Linear, Raycast, Supabase, Rocketseat**).

### Pilares da Experiência:
1. **Developer-First Aesthetics:** Fundo Deep Slate com camadas de elevação e gradientes radiais com blend mode suave.
2. **Micro-Interações Táteis e Dopamina:** Feedback sonoro/visual imediato ao selecionar opções, linhas de conexão fluidas e transições com física elástica (`cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Sensação de Provisionamento Real:** O encerramento do onboarding simula a alocação de infraestrutura isolada (Sandbox Docker + Repositório Git Privado + Chave AI Socrática), transformando a espera num momento excitante.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    NEXUS CODE ONBOARDING FLOW                                   │
│                                                                                                 │
│  [ Passo 1: Credenciais ] ──▶ [ Passo 2: Trilha ] ──▶ [ Passo 3: Setup IA ] ──▶ [ 4: Sandbox ]   │
│   • GitHub 1-Click OAuth       • Fullstack TS          • Proficiência            • Docker Init   │
│   • Medidor Senha 4 Níveis     • Python & AI           • Meta Diária             • Git Repo Gen  │
│   • Perfil Aluno/Instrutor     • Go Systems            • Modo Tutor Socrático    • AI Key Ready  │
│                                • Rust & Wasm                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Tokens Oficiais

### 2.1 Paleta Primária e Superfícies (Deep Dark Surfaces)

| Token Name | Hex Code | RGB | Função Semântica | WCAG Contrast |
|---|---|---|---|---|
| `--bg-canvas` | `#08080B` | `8, 8, 11` | Fundo principal da página | Base 21:1 |
| `--bg-surface-1` | `#121217` | `18, 18, 23` | Card principal de onboarding, painéis | 18.2:1 |
| `--bg-surface-2` | `#181820` | `24, 24, 32` | Inputs, sub-cards de trilha, dropdowns | 14.5:1 |
| `--bg-surface-3` | `#22222E` | `34, 34, 46` | Estados ativos de hover e badges | 10.8:1 |
| `--border-subtle` | `#27272A` | `39, 39, 42` | Bordas padrão, divisórias | 3.5:1 |
| `--border-active` | `#3F3F46` | `63, 63, 70` | Bordas no hover ou inputs focados | 4.6:1 |

### 2.2 Acentos Neon & Gradientes

| Token Name | Hex Code | RGB | Aplicação |
|---|---|---|---|
| `--neon-purple` | `#8257E5` | `130, 87, 229` | Identidade primária Rocketseat, Stepper ativo, IA Tutor |
| `--neon-purple-glow`| `rgba(130, 87, 229, 0.45)` | - | Glows de elevação e botões primários |
| `--neon-green` | `#04D361` | `4, 211, 97` | Sucesso, Senha Imbatível, Checkmarks, Terminal Ready |
| `--neon-green-glow` | `rgba(4, 211, 97, 0.45)` | - | Glow de terminal e aprovação |
| `--neon-cyan` | `#00E5FF` | `0, 229, 255` | Senha Forte, Trilha Go Systems, Destaque técnico |
| `--neon-amber` | `#F59E0B` | `245, 158, 11` | Senha Média, Alertas, Metas diárias |
| `--neon-danger` | `#F43F5E` | `244, 63, 94` | Senha Fraca, Erros de validação inline |

### 2.3 Tipografia e Escala
- **Display Headings:** `'Space Grotesk'`, sans-serif (800 / 700)
- **Interface & Textos:** `'Inter'`, system-ui, -apple-system, sans-serif (600 / 500 / 400)
- **Código & Terminais:** `'JetBrains Mono'`, monospace (700 / 500 / 400)

```css
:root {
  --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  
  --shadow-card: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04);
  --shadow-neon-purple: 0 8px 24px -4px rgba(130, 87, 229, 0.45);
  --shadow-neon-green: 0 8px 24px -4px rgba(4, 211, 97, 0.45);
  --shadow-neon-cyan: 0 8px 24px -4px rgba(0, 229, 255, 0.40);
}
```

---

## 3. Especificações dos Componentes Visuais

### 3.1 Stepper Horizontal Animado com Linha de Progresso

O Stepper guia o usuário através dos 4 passos essenciais. Possui linha de preenchimento conectiva animada via gradiente e círculos de estágio com transição de escala.

```
       [ Passo 1 ] ══════════════ [ Passo 2 ] ────────────── [ Passo 3 ] ────────────── [ Passo 4 ]
        (✓ Pronto)    Progresso     (● Atual)     Pendente     (○ Espera)    Pendente     (⚡ Pronto)
```

#### Estados dos Indicadores de Passo:
1. **Concluído (`completed`):**
   - Fundo: `#04D361` (Neon Green) com glow suave `0 0 14px rgba(4, 211, 97, 0.5)`.
   - Ícone interno: Checkmark SVG animado em stroke branco `#FFFFFF`.
2. **Atual Ativo (`active`):**
   - Fundo: `#8257E5` (Rocket Purple) com pulso `0 0 20px rgba(130, 87, 229, 0.6)`.
   - Borda externa: Anel de respiração `3px solid rgba(130, 87, 229, 0.25)`.
   - Texto interno: Número do passo em bold com número de alta visibilidade.
3. **Pendente (`pending`):**
   - Fundo: `#181820` (Surface-2).
   - Borda: `1px solid #27272A`.
   - Texto interno: Cor suave `#71717A`.

---

### 3.2 Botão de Destaque GitHub 1-Click OAuth com Glow Sutil

O botão de GitHub OAuth oferece o caminho de menor atrito para desenvolvedores se cadastrarem.

#### Especificação Visual:
- **Background:** `#181820` com gradiente sutil `linear-gradient(180deg, #242430 0%, #181820 100%)`.
- **Borda:** `1px solid #3F3F46`.
- **Glow Efeito:** Camada inferior de luz difusa em hover (`box-shadow: 0 8px 25px -4px rgba(255, 255, 255, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.15)`).
- **Tipografia:** `Inter` 600, 14px, `#FFFFFF`.
- **Micro-interação:** Efeito de elevação `-2px` no eixo Y e brilho sutil ao passar o cursor.

```xml
<!-- SVG Ícone GitHub Integrado -->
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
</svg>
```

---

### 3.3 Cards de Trilhas Selecionáveis com Feedback Neon & Checkmark Animado

Os cards permitem a escolha da trilha prioritária no Passo 2. Possuem micro-interação tátil de clique, borda neon dual-gradient e checkmark animado com mola elástica.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ ⚡ FULLSTACK TYPESCRIPT ]                                      (✓)  │
│  React 19 • Next.js • Node.js • Prisma • Arquitetura Modular           │
│  Borda ativa: Rocket Purple (#8257E5) + Cyan (#00E5FF)                 │
└────────────────────────────────────────────────────────────────────────┘
```

#### Características Visuais:
- **Estado Inativo:** Fundo `#181820`, Borda `#27272A`, Escala 1.0.
- **Estado Hover:** Fundo `#1D1D28`, Borda `#3F3F46`, Elevação `translateY(-3px)`, Glow sutil `0 8px 24px rgba(0,0,0,0.5)`.
- **Estado Selecionado (`selected`):**
  - Fundo: Gradiente sutil radial `radial-gradient(circle at top left, rgba(130, 87, 229, 0.18) 0%, #121217 100%)`.
  - Borda: `1.5px solid #8257E5` com glow `0 0 16px rgba(130, 87, 229, 0.4)`.
  - Checkmark Badge: Círculo `#04D361` no canto superior direito com animação de elasticidade `scale(1) -> scale(1.15) -> scale(1)`.

#### Trilhas Disponíveis e Ícones SVG:
1. **Fullstack TypeScript (`track-fullstack.svg`):** React 19, Next.js App Router, Node.js, TypeScript e NestJS.
2. **Python & AI Socrática (`track-python-ai.svg`):** Python 3.12, Algoritmos, PyTorch, FastApi e LLM Agent Prompting.
3. **Go Systems & Microservices (`track-go-systems.svg`):** Go 1.23, Concorrência, Goroutines, Channels, gRPC e Docker.
4. **Rust & Low-Level Security (`track-rust-wasm.svg`):** Rust, WebAssembly, Memory Safety, Gerenciamento de Memória Zero-Cost.

---

### 3.4 Medidor Interativo de Força de Senha (4 Níveis)

O medidor analisa dinamicamente a entropia da senha digitada pelo usuário e atualiza em tempo real 4 barras coloridas com feedback semântico.

```
  Senha: [ •••••••••••••••••• ] 
  Força: ▓▓▓▓▓ ▓▓▓▓▓ ▓▓▓▓▓ ▓▓▓▓▓  [ IMBATÍVEL // SHA-READY ]
         (Verde) (Verde) (Verde) (Neon Green + Glow)
```

#### Níveis de Força e Regras de Avaliação:

| Nível | Rótulo | Cor da Barra | Requisitos Mínimos | Feedback Visual |
|---|---|---|---|---|
| **Nível 1** | **Fraca** | `#F43F5E` (Danger Rose) | $< 6$ caracteres | 1 barra preenchida, alerta sutil |
| **Nível 2** | **Média** | `#F59E0B` (Amber Neon) | $\ge 8$ carac. + letras/números | 2 barras preenchidas |
| **Nível 3** | **Forte** | `#00E5FF` (Cyan Neon) | $\ge 10$ carac. + maiúsculas + símbolos | 3 barras preenchidas com glow |
| **Nível 4** | **Imbatível** | `#04D361` (Green Neon) | $\ge 12$ carac. + alta entropia variada | 4 barras pulsantes com badge "Pronta para Sandbox" |

#### Checklist de Segurança Dinâmico:
- `✓` Mínimo de 8 caracteres
- `✓` Pelo menos um número (`0-9`)
- `✓` Pelo menos um caractere especial (`!@#$%^&*`)
- `✓` Mistura de maiúsculas e minúsculas

---

### 3.5 Terminal Sandbox de Provisionamento em Tempo Real

Na 4ª etapa do onboarding, a plataforma exibe um terminal de simulação interativa de provisionamento com efeito de log em tempo real (Typewriter & Stream), estabelecendo credibilidade técnica instantânea.

```
┌────────────────────────────────────────────────────────────────────────┐
│ ● ● ●  nexus-sandbox-provisioner // v2.4.0-cloud                       │
├────────────────────────────────────────────────────────────────────────┤
│ 23:42:01 [SYS] Alocando container Docker isolado para usuário...  [OK] │
│ 23:42:02 [GIT] Inicializando repositório privado Gitea...          [OK] │
│ 23:42:03 [AI]  Injetando chave neural do Tutor Socrático...        [OK] │
│ 23:42:04 [ENV] Carregando suite de testes automatizados Piston... [OK] │
│ 23:42:05 [OK]  Ambiente 100% pronto! Redirecionando ao dashboard...    │
│                                                                        │
│ █ Progresso: [====================================] 100%               │
└────────────────────────────────────────────────────────────────────────┘
```

#### Elementos do Terminal:
- **Header:** Botões de controle no estilo macOS (`#EF4444`, `#F59E0B`, `#10B981`) e tag da versão do kernel sandbox.
- **Fundo:** `#09090D` com borda fina `#27272A` e sombra difusa neon.
- **Logs:** Fonte `'JetBrains Mono'`, tamanho 12px, timestamps em `#64748B`, tags semânticas coloridas (`[SYS]` cyan, `[GIT]` purple, `[AI]` green, `[OK]` neon green).
- **Cursor de Digitação:** Bloco `█` com animação `@keyframes blink`.
- **Barra de Progresso:** Track `#181820` preenchido com gradiente `#8257E5 -> #00E5FF -> #04D361`.

---

## 4. Layout Responsivo & Breakpoints

| Breakpoint | Resolução | Comportamento de Layout |
|---|---|---|
| **Desktop Ultra/Standard** | $\ge 1280\text{px}$ | Layout em container centralizado de 720px com ambient glows radiais de 600px nas laterais. |
| **Laptop / Tablet Horiz.** | $1024\text{px} - 1279\text{px}$ | Cards de trilha em grid $2 \times 2$, stepper com padding de 24px. |
| **Tablet Vertical** | $768\text{px} - 1023\text{px}$ | Largura máxima 600px, padding lateral 20px. |
| **Mobile Standard** | $< 768\text{px}$ | Stepper simplificado com rótulos compactos, cards de trilhas em coluna única $1 \times 4$, botões em 100% de largura. |

---

## 5. Micro-Interações e Animações CSS Oficiais

```css
/* Efeito de pulso no Stepper e Acentos Ativos */
@keyframes neonPulse {
  0%, 100% {
    box-shadow: 0 0 12px rgba(130, 87, 229, 0.4), inset 0 0 8px rgba(130, 87, 229, 0.2);
  }
  50% {
    box-shadow: 0 0 24px rgba(130, 87, 229, 0.75), inset 0 0 12px rgba(130, 87, 229, 0.4);
  }
}

/* Elasticidade do Checkmark no Card de Trilha */
@keyframes checkmarkPop {
  0% {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  70% {
    transform: scale(1.2) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* Cursor piscante do Terminal de Provisionamento */
@keyframes terminalBlink {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}

/* Preenchimento gradual da Barra de Progresso */
@keyframes fillProgress {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}
```

---

## 6. Guia de Implementação e Arquivos Criados

1. **Tokens e SVGs de Trilhas:**
   - [`apps/web/public/tracks/track-fullstack.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/tracks/track-fullstack.svg)
   - [`apps/web/public/tracks/track-python-ai.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/tracks/track-python-ai.svg)
   - [`apps/web/public/tracks/track-go-systems.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/tracks/track-go-systems.svg)
   - [`apps/web/public/tracks/track-rust-wasm.svg`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/public/tracks/track-rust-wasm.svg)

2. **Componente de Onboarding & Registro:**
   - [`apps/web/app/components/OnboardingView.tsx`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/app/components/OnboardingView.tsx)
   - Integração com [`apps/web/app/components/AuthView.tsx`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/app/components/AuthView.tsx) e [`apps/web/app/login/page.tsx`](file:///c:/Users/augusto/Documents/projetos/plataforma/apps/web/app/login/page.tsx).
