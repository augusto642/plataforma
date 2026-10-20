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
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        heading: ['var(--font-space)', 'Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
