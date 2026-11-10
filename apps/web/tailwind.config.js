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
        // Central 216 — tokens alinhados ao Stitch v2 (antes: escala
        // própria #0B0B10/#13131B/#1A1A24/#22222F/#2B2B3B/#E0E0EE/#8B8B9A).
        // Os nomes legados (background/surface/border/ink) são mantidos
        // como aliases — só os valores mudam para os do protótipo.
        background: '#0D0E15',
        surface: {
          // Escala nomeada de superfícies (elevação por clareamento sutil)
          '1': '#12131D',
          '2': '#181926',
          '3': '#222335',
          '4': '#2B2B3B',
          // Compat: chaves legadas reapontadas para a escala nova
          base: '#12131D', // = surface-1
          card: '#181926', // = surface-2
          elevated: '#222335', // = surface-3
          alt: '#222335', // = surface-3 (antes gêmeo do elevated)
          hover: '#2B2B3B', // = surface-4
        },
        border: {
          // 3 níveis: divisória, card e destaque de marca
          '1': '#27272A',
          '2': '#3F3F46',
          brand: '#8257E5',
          // Compat: chaves legadas reapontadas
          subtle: '#27272A', // = border-1
          card: '#3F3F46', // = border-2
        },
        // Textos em 3 níveis (nunca branco puro no título)
        ink: {
          heading: '#F4F4F5',
          body: '#C0C0D1',
          span: '#A1A1AA',
        },
        // Aliases com os nomes exatos do Stitch v2 — as telas novas
        // usam as mesmas classes do protótipo (bg-dark-surface,
        // text-dark-on-surface-variant, border-border-subtle…).
        primary: '#8257E5',
        'on-primary': '#FFFFFF',
        'dark-surface': '#0D0E15',
        'dark-on-surface': '#F4F4F5',
        'dark-surface-container-low': '#12131D',
        'dark-surface-container': '#181926',
        'dark-surface-container-high': '#222335',
        'dark-on-surface-variant': '#A1A1AA',
        'dark-primary': '#996DFF',
        'dark-on-primary': '#180D35',
        'border-subtle': '#27272A',
        'border-strong': '#3F3F46',
        secondary: '#00E676',
        'on-secondary': '#000000',
        tertiary: '#00E5FF',
        'on-tertiary': '#000000',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        // D2 — token de foco visível (anel global em globals.css)
        // B59 (Sprint 17) — alinhado ao ciano da marca (#00E5FF)
        focus: '#00E5FF',
        brand: {
          green: '#00B37E',
          'green-neon': '#04D361',
          purple: '#8257E5',
          'purple-light': '#996DFF',
          // D2 — escala da marca: low (fundo de badge) e dark (hover/pressionado)
          'purple-low': '#241A3F',
          'purple-dark': '#6E4AC3',
          // Sprint 10 (B36) — ciano único no sistema: o royal #0070F3
          // convivia com o neon #00E5FF e a coluna Nexus do Versus
          // parecia de outro site (fundo royal, texto neon). O token
          // brand-cyan passa a valer o MESMO neon; usos antigos de
          // bg/text-brand-cyan herdam o ciano único automaticamente.
          cyan: '#00E5FF',
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
        // Aliases do Stitch v2 (display/headline/body/code/label = Inter,
        // code = JetBrains Mono) — as telas novas usam font-display etc.
        display: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        code: ['JetBrains Mono', 'monospace'],
        label: ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Sprint 9 (item 4 do Designer) — o degrau de 13px eleito na
        // escala: corpo pequeno da landing (rótulos mono, metadados,
        // texto miúdo de card). Substitui o text-[13px] arbitrário que
        // estava espalhado pelo conjunto renderizado.
        'body-sm': '13px',
        // Central 216 — escala tipográfica do Stitch v2.
        'display-lg': ['56px', { lineHeight: '64px', letterSpacing: '-1.5px', fontWeight: '800' }],
        'display-lg-mobile': ['32px', { lineHeight: '38px', letterSpacing: '-0.75px', fontWeight: '800' }],
        'display-md': ['44px', { lineHeight: '52px', letterSpacing: '-1px', fontWeight: '800' }],
        'display-md-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.5px', fontWeight: '800' }],
        'headline-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.5px', fontWeight: '700' }],
        'headline-lg-mobile': ['24px', { lineHeight: '30px', letterSpacing: '-0.25px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.2px', fontWeight: '700' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'code-md': ['14px', { lineHeight: '22px', fontWeight: '500' }],
        'code-sm': ['12px', { lineHeight: '18px', fontWeight: '500' }],
        'label-lg': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600' }],
      },
      borderRadius: {
        // Central 216 — raios do Stitch v2 (DEFAULT 10px = rounded).
        sm: '6px',
        DEFAULT: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
      },
      spacing: {
        // Sprint 10 (B36) — a análise profunda achou classes MORTAS na
        // landing: w-13/h-13 (tile dos Pilares) e py-4.5 (CTAs do Versus
        // e do cockpit final) não existiam na escala padrão e os
        // elementos se dimensionavam por acidente. Agora são tokens.
        '4.5': '1.125rem',
        '13': '3.25rem',
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
