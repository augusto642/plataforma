import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../../../components/MaterialIcon';

/**
 * Central 216 (F1) — chrome das rotas /trilha/aguardando e
 * /trilha/sugerida, no visual do protótipo Stitch v2: top app bar com
 * logo, navegação da trilha e chip do usuário REAL (nome e iniciais
 * da sessão — nunca "Novo Aluno" fixo), mais o rodapé.
 */
export function trackInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TrackTopbar({
  active,
  userName,
  userSubtitle,
  statusChip,
}: {
  active: 'aguardando' | 'sugerida';
  userName: string;
  userSubtitle: string;
  statusChip: React.ReactNode;
}) {
  return (
    <header className="h-16 border-b border-border-subtle bg-dark-surface-container-low px-6 lg:px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-40 w-full">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded bg-primary/15 border border-primary/40 flex items-center justify-center text-primary group-hover:border-primary transition-all">
            <MaterialIcon name="terminal" className="text-[20px]" />
          </div>
          <span className="font-headline font-extrabold text-lg tracking-tight text-white">
            NEXUS<span className="text-primary">CODE</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-xs font-label text-dark-on-surface-variant">
          {active === 'aguardando' ? (
            <span className="text-white font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded bg-dark-surface-container">
              <MaterialIcon name="hourglass_top" className="text-[16px] text-primary" />
              <span>Trilha em Análise</span>
            </span>
          ) : (
            <span className="text-white font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded bg-dark-surface-container">
              <MaterialIcon name="verified" className="text-[16px] text-secondary" />
              <span>Trilha Sugerida</span>
            </span>
          )}
          <Link
            href="/desafios"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <MaterialIcon name="code" className="text-[16px]" />
            <span>Desafios Iniciais</span>
          </Link>
          <Link
            href="/courses"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <MaterialIcon name="menu_book" className="text-[16px]" />
            <span>Cursos Avulsos</span>
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {statusChip}
        <div className="h-6 w-px bg-border-subtle" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xs text-white font-code">
            {trackInitials(userName)}
          </div>
          <div className="text-left">
            <div className="text-xs font-headline font-semibold text-white">{userName}</div>
            <div className="text-[10px] font-code text-dark-on-surface-variant">
              {userSubtitle}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function TrackFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="h-16 border-t border-border-subtle px-8 flex items-center justify-center text-xs font-code text-dark-on-surface-variant">
      {children}
    </footer>
  );
}
