/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // D1 — fundo único do app (guia Nexus × Rocketseat)
        background: '#0B0B10',
        surface: {
          // Escala nomeada de superfícies (elevação por clareamento sutil)
          '1': '#13131B',
          '2': '#1A1A24',
          '3': '#22222F',
          '4': '#2B2B3B',
          // Compat: chaves legadas reapontadas para a escala nova
          base: '#13131B', // = surface-1
          card: '#1A1A24', // = surface-2
          elevated: '#22222F', // = surface-3
          alt: '#22222F', // = surface-3 (antes gêmeo do elevated)
          hover: '#2B2B3B', // = surface-4
        },
        border: {
          // 3 níveis: divisória, card e destaque de marca
          '1': '#22222F',
          '2': '#2B2B3B',
          brand: '#8257E5',
          // Compat: chaves legadas reapontadas
          subtle: '#22222F', // = border-1
          card: '#2B2B3B', // = border-2
        },
        // Textos em 3 níveis (nunca branco puro no título)
        ink: {
          heading: '#E0E0EE',
          body: '#C0C0D1',
          span: '#8B8B9A',
        },
        // D2 — token de foco visível (anel global em globals.css)
        focus: '#03B2CB',
        brand: {
          green: '#00B37E',
          'green-neon': '#04D361',
          purple: '#8257E5',
          'purple-light': '#996DFF',
          // D2 — escala da marca: low (fundo de badge) e dark (hover/pressionado)
          'purple-low': '#241A3F',
          'purple-dark': '#6E4AC3',
          cyan: '#0070F3',
          'cyan-neon': '#00E5FF',
          amber: '#FFA116',
          'amber-solar': '#F59E0B',
          // D2 — aviso é laranja, distinto do erro (rose)
          warning: '#EF6220',
          rose: '#F43F5E',
        },
        // Paleta de syntax highlighting dos snippets da landing (antes eram
        // hex soltos repetidos dentro das strings de código): tema do editor
        // como token, para a busca de hex-fora-de-tokens continuar zerada.
        syntax: {
          keyword: '#C084FC',
          fn: '#38BDF8',
          base: '#E2E8F0',
          type: '#FBBF24',
          string: '#86EFAC',
          number: '#FB923C',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        heading: ['var(--font-space)', 'Space Grotesk', 'sans-serif'],
      },
      fontSize: {
        // Sprint 9 (item 4 do Designer) — o degrau de 13px eleito na
        // escala: corpo pequeno da landing (rótulos mono, metadados,
        // texto miúdo de card). Substitui o text-[13px] arbitrário que
        // estava espalhado pelo conjunto renderizado.
        'body-sm': '13px',
      },
      boxShadow: {
        // Sprint 9 (item 2 do Designer) — escala única de sombras,
        // derivada dos rgba que estavam espalhados como shadow-[...]
        // arbitrários pela landing. Elevação = sombras pretas de
        // profundidade; glow = halos da marca; accent = sombra tingida
        // pela cor do card (trilhas/FAQ).
        'elev-xs': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'elev-sm': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'elev-md': '0 20px 50px rgba(0, 0, 0, 0.6)',
        'elev-lg': '0 20px 50px rgba(0, 0, 0, 0.8)',
        'elev-xl': '0 20px 60px rgba(0, 0, 0, 0.8)',
        'elev-2xl': '0 25px 60px rgba(0, 0, 0, 0.85)',
        'elev-3xl': '0 25px 70px rgba(0, 0, 0, 0.55)',
        'glow-purple': '0 0 35px rgba(130, 87, 229, 0.35)',
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.25)',
        'glow-cyan-soft': '0 0 20px rgba(0, 229, 255, 0.15)',
        'glow-cyan-strong': '0 0 45px rgba(0, 229, 255, 0.45)',
        'glow-cyan-lg': '0 0 80px rgba(0, 229, 255, 0.25)',
        'accent-amber': '0 16px 36px -12px rgba(245, 158, 11, 0.25)',
        'accent-cyan': '0 16px 36px -12px rgba(0, 229, 255, 0.25)',
        'accent-green': '0 16px 36px -12px rgba(4, 211, 97, 0.25)',
        'accent-purple': '0 16px 36px -12px rgba(130, 87, 229, 0.25)',
        'accent-sm-amber': '0 12px 32px -10px rgba(245, 158, 11, 0.2)',
        'accent-sm-cyan': '0 12px 32px -10px rgba(0, 229, 255, 0.2)',
        'accent-sm-green': '0 12px 32px -10px rgba(4, 211, 97, 0.2)',
        'accent-sm-purple': '0 12px 32px -10px rgba(130, 87, 229, 0.2)',
        'accent-sm-pink': '0 12px 32px -10px rgba(236, 72, 153, 0.2)',
        'accent-sm-emerald': '0 12px 32px -10px rgba(16, 185, 129, 0.2)',
      },
    },
  },
  plugins: [],
};
