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
        background: '#09090A',
        surface: {
          base: '#121214',
          card: '#121217',
          elevated: '#18181B',
          alt: '#181820',
          hover: '#1F1F28',
        },
        border: {
          subtle: '#27272A',
          card: '#262630',
        },
        brand: {
          green: '#00B37E',
          'green-neon': '#04D361',
          purple: '#8257E5',
          'purple-light': '#996DFF',
          cyan: '#0070F3',
          'cyan-neon': '#00E5FF',
          amber: '#FFA116',
          'amber-solar': '#F59E0B',
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
