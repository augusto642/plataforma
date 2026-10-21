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
