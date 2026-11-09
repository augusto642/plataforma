'use client';

import React from 'react';
import Link from 'next/link';
// B08 — eventos do funil da landing
import { track, type FunnelEvent } from '../../lib/analytics';

/* Sprint 10 · B34 — Link com rastreio de CTA para uso dentro de Server
   Components: a seção (server) declara href/cta/evento e esta ilha
   mínima carrega o onClick. Substitui os onClick={() => track(...)}
   que forçavam o page.tsx inteiro a ser client. */
interface TrackedLinkProps {
  href: string;
  ctaId: string;
  event: FunnelEvent;
  eventProps?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
}

export const TrackedLink: React.FC<TrackedLinkProps> = ({
  href,
  ctaId,
  event,
  eventProps,
  className,
  children,
}) => (
  <Link
    href={href}
    data-cta-id={ctaId}
    onClick={() => track(event, ctaId, eventProps)}
    className={className}
  >
    {children}
  </Link>
);
