// Conjunto único de ícones SVG da landing (Frente 3 da Sprint 4 restante).
// Substitui o emoji como sistema de ícones nas seções migradas: traço
// consistente (24x24, stroke currentColor, 2px), cor herdada do texto.
// Emojis que são ARTE (rosto da mascote, avatares das cartas TCG) não
// passam por aqui — são conteúdo, não iconografia de interface.
import React from 'react';

interface IconProps {
  className?: string;
}

function base(props: IconProps, children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={props.className ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconBolt: React.FC<IconProps> = (p) =>
  base(p, <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />);

export const IconGamepad: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <path d="M17.32 5H6.68a4.68 4.68 0 0 0-4.6 5.6l.7 4.2A3 3 0 0 0 5.74 17.4c.63 0 1.24-.24 1.7-.66L9.6 14.6a1 1 0 0 1 .66-.26h3.48c.27 0 .52.11.7.3l1.8 2.06c.46.44 1.08.68 1.72.68a3 3 0 0 0 2.94-2.6l.7-4.2A4.68 4.68 0 0 0 17.32 5Z" />
    </>,
  );

export const IconSparkle: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3Z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
    </>,
  );

export const IconShield: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 11.5 11 13.5 15 9.5" />
    </>,
  );

export const IconMap: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </>,
  );

export const IconCpu: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </>,
  );

export const IconTarget: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>,
  );

export const IconCard: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>,
  );

export const IconRocket: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>,
  );

export const IconChat: React.FC<IconProps> = (p) =>
  base(
    p,
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  );

export const IconTerminal: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>,
  );

export const IconChart: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </>,
  );

export const IconKey: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M11 12L21 2" />
      <path d="M16 7l3 3" />
    </>,
  );

export const IconCode: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>,
  );

export const IconGear: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>,
  );

export const IconNodes: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M7.3 10.8 16.7 7.2M7.3 13.2l9.4 3.6" />
    </>,
  );

export const IconGitBranch: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>,
  );

export const IconPlay: React.FC<IconProps> = (p) =>
  base(p, <polygon points="6 3 20 12 6 21 6 3" />);

export const IconSearch: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>,
  );

export const IconSwords: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M4 4l11 11M20 4L9 15" />
      <path d="M13 13l4.5 4.5a2.12 2.12 0 0 1-3 3L10 16M11 13l-4.5 4.5a2.12 2.12 0 0 1-3-3L8 10" />
      <path d="M14.5 4.5L19 9M9.5 4.5L5 9" opacity="0" />
    </>,
  );

export const IconCards: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <rect x="3" y="6" width="13" height="15" rx="2" transform="rotate(-6 3 6)" />
      <rect x="8" y="3" width="13" height="15" rx="2" />
    </>,
  );

// Sprint 7 — migração dos SVGs que ainda viviam inline no page.tsx
// (menu mobile, busca da command palette já era IconSearch, ícones do
// FAQ, marca do rodapé, GitHub e as 4 capas de trilha): a biblioteca
// volta a ser a ÚNICA fonte de SVG da landing.

export const IconMenu: React.FC<IconProps> = (p) =>
  base(p, <path d="M4 6h16M4 12h16M4 18h16" />);

// Sprint 9 — chevron do item "Jogo" da navbar enxuta (dropdown simples)
export const IconChevronDown: React.FC<IconProps> = (p) =>
  base(p, <path d="m6 9 6 6 6-6" />);

export const IconClose: React.FC<IconProps> = (p) =>
  base(p, <path d="M18 6L6 18M6 6l12 12" />);

export const IconMonitor: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>,
  );

export const IconSun: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M12 2v8" />
      <path d="M4.93 10.93l1.41 1.41" />
      <path d="M2 18h2" />
      <path d="M20 18h2" />
      <path d="M19.07 10.93l-1.41 1.41" />
      <path d="M16 18a4 4 0 0 1-8 0" />
      <path d="M12 14v4" />
    </>,
  );

export const IconBox: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>,
  );

export const IconSpeech: React.FC<IconProps> = (p) =>
  base(
    p,
    <path d="M12 2a8 8 0 0 0-8 8c0 3.31 2.01 6.16 4.9 7.37L8 22l4-2 4 2-.9-4.63C17.99 16.16 20 13.31 20 10a8 8 0 0 0-8-8z" />,
  );

export const IconShieldCheck: React.FC<IconProps> = (p) =>
  base(
    p,
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>,
  );

// GitHub é marca preenchida (fill), não traço: componente próprio.
export const IconGithub: React.FC<IconProps> = (p) => (
  <svg viewBox="0 0 24 24" className={p.className ?? 'w-5 h-5'} fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// Marca "N" do rodapé (viewBox próprio 84x64, com as setas da marca).
export const IconLogoMark: React.FC<IconProps> = (p) => (
  <svg viewBox="0 0 84 64" className={p.className ?? 'w-full h-full'} fill="none" aria-hidden="true">
    <path d="M 14 46 L 14 18 L 20 18 L 32 36 L 32 18 L 38 18 L 38 46 L 32 46 L 20 28 L 20 46 Z" className="fill-ink-heading" />
    <path d="M 44 22 L 54 32 L 44 42" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-purple" />
    <path d="M 66 22 L 56 32 L 66 42" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-cyan-neon" />
  </svg>
);

// Capas vetoriais das 4 trilhas (arte 80x80 que vivia inline nos cards).
export const TrackCoverRust: React.FC<IconProps> = (p) => (
  <svg viewBox="0 0 80 80" className={p.className ?? 'w-full h-full'} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="4" width="72" height="72" rx="14" strokeWidth="1.5" className="fill-background stroke-border-2" />
    <g transform="translate(40, 40)">
      <path d="M-5 -20H5L3 -16H-3L-5 -20Z" className="fill-brand-amber" />
      <path d="M-5 20H5L3 16H-3L-5 20Z" className="fill-brand-amber" />
      <path d="M-20 -5V5L-16 3V-3L-20 -5Z" className="fill-brand-amber" />
      <path d="M20 -5V5L16 3V-3L20 -5Z" className="fill-brand-amber" />
      <circle cx="0" cy="0" r="16" strokeWidth="1.8" className="fill-surface-2 stroke-brand-amber" />
      <circle cx="0" cy="0" r="12" strokeWidth="1" className="fill-surface-1 stroke-border-2" />
      <path d="M0 -9L9 -4V2C9 7 4.5 11 0 13C-4.5 11 -9 7 -9 2V-4L0 -9Z" className="fill-brand-purple" />
      <text x="0" y="4" fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="900" textAnchor="middle" className="fill-ink-heading">R</text>
    </g>
    <circle cx="20" cy="20" r="2.5" className="fill-brand-amber" />
    <circle cx="60" cy="60" r="2.5" className="fill-brand-purple" />
  </svg>
);

export const TrackCoverGo: React.FC<IconProps> = (p) => (
  <svg viewBox="0 0 80 80" className={p.className ?? 'w-full h-full'} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="4" width="72" height="72" rx="14" strokeWidth="1.5" className="fill-background stroke-border-2" />
    <g strokeWidth="2.5" strokeLinecap="round" className="stroke-brand-cyan-neon">
      <path d="M18 26H36L44 34H62" strokeDasharray="4 2" strokeOpacity="0.7" className="stroke-brand-cyan-neon" />
      <path d="M18 40H62" strokeWidth="3" className="stroke-brand-cyan-neon" />
      <path d="M18 54H36L44 46H62" strokeDasharray="4 2" strokeOpacity="0.7" className="stroke-brand-cyan" />
    </g>
    <circle cx="24" cy="40" r="4.5" className="fill-brand-cyan-neon" />
    <circle cx="24" cy="40" r="2" className="fill-ink-heading" />
    <circle cx="40" cy="40" r="5" strokeWidth="1.5" className="fill-brand-cyan stroke-brand-cyan-neon" />
    <circle cx="56" cy="40" r="4.5" className="fill-brand-green-neon" />
    <circle cx="56" cy="40" r="2" className="fill-ink-heading" />
    <path d="M46 22L52 26L46 30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-cyan-neon" />
    <path d="M46 50L52 54L46 58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-cyan-neon" />
  </svg>
);

export const TrackCoverWeb: React.FC<IconProps> = (p) => (
  <svg viewBox="0 0 80 80" className={p.className ?? 'w-full h-full'} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="4" width="72" height="72" rx="14" strokeWidth="1.5" className="fill-surface-1 stroke-border-2" />
    <rect x="16" y="18" width="48" height="30" rx="6" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" className="fill-surface-1 stroke-brand-green-neon" />
    <rect x="18" y="21" width="16" height="15" rx="3" fillOpacity="0.25" strokeWidth="1" className="fill-brand-green-neon stroke-brand-green-neon" />
    <text x="26" y="32" fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="800" textAnchor="middle" className="fill-brand-green-neon">TS</text>
    <ellipse cx="49" cy="29" rx="11" ry="4.5" transform="rotate(30 49 29)" strokeWidth="1.2" strokeOpacity="0.8" className="stroke-brand-green-neon" />
    <ellipse cx="49" cy="29" rx="11" ry="4.5" transform="rotate(-30 49 29)" strokeWidth="1.2" strokeOpacity="0.8" className="stroke-brand-cyan-neon" />
    <circle cx="49" cy="29" r="2.5" className="fill-brand-green-neon" />
    <path d="M28 48L40 55L52 48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-green-neon" />
    <circle cx="40" cy="55" r="3" strokeWidth="1" className="fill-brand-green-neon stroke-ink-heading" />
    <path d="M40 55V61" strokeWidth="2" strokeLinecap="round" className="stroke-brand-green-neon" />
  </svg>
);

export const TrackCoverPython: React.FC<IconProps> = (p) => (
  <svg viewBox="0 0 80 80" className={p.className ?? 'w-full h-full'} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="4" width="72" height="72" rx="14" strokeWidth="1.5" className="fill-surface-1 stroke-border-2" />
    <g strokeWidth="1.2" strokeOpacity="0.5" className="stroke-brand-purple">
      <line x1="24" y1="28" x2="40" y2="20" />
      <line x1="24" y1="28" x2="40" y2="38" />
      <line x1="24" y1="52" x2="40" y2="38" />
      <line x1="24" y1="52" x2="40" y2="58" />
      <line x1="40" y1="20" x2="56" y2="36" />
      <line x1="40" y1="38" x2="56" y2="36" />
      <line x1="40" y1="58" x2="56" y2="44" />
    </g>
    <circle cx="24" cy="28" r="4" strokeWidth="2" className="fill-surface-1 stroke-brand-purple-light" />
    <circle cx="24" cy="52" r="4" strokeWidth="2" className="fill-surface-1 stroke-brand-purple-light" />
    <circle cx="40" cy="20" r="4.5" strokeWidth="2" className="fill-surface-1 stroke-brand-purple" />
    <circle cx="40" cy="38" r="5" className="fill-brand-purple" />
    <circle cx="40" cy="58" r="4.5" strokeWidth="2" className="fill-surface-1 stroke-brand-purple" />
    <circle cx="56" cy="40" r="5.5" className="fill-brand-amber" />
    <circle cx="56" cy="40" r="2" className="fill-ink-heading" />
    <path d="M22 64C28 60 34 68 40 64C46 60 52 68 58 64" strokeWidth="2.5" strokeLinecap="round" className="stroke-brand-purple" />
  </svg>
);

