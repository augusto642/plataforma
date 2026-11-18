'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '../../../components/Logo';

interface IdeHeaderProps {
  activityTitle?: string;
  courseTitle?: string;
  language?: string;
  onOpenHistory?: () => void;
  onOpenNewActivity?: () => void;
  isInstructor?: boolean;
}

export const IdeHeader: React.FC<IdeHeaderProps> = ({
  activityTitle,
  courseTitle,
  language = 'TypeScript',
  onOpenHistory,
  onOpenNewActivity,
  isInstructor,
}) => {
  return (
    <header className="min-h-14 px-4 py-2 bg-[#101916] border-b border-[#2a3935] flex flex-wrap gap-3 items-center justify-between select-none">
      <div className="flex items-center gap-6">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-white transition-colors">
            {courseTitle || 'Cursos'}
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-semibold truncate max-w-[200px]">
            {activityTitle || 'Web IDE'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="px-3 py-1.5 rounded-lg border border-[#232738] bg-[#12151F] text-xs font-semibold text-zinc-300 hover:text-white hover:bg-[#1A1E2B] transition-all flex items-center gap-2"
          >
            <span>📜</span> Histórico de Envios
          </button>
        )}

        {isInstructor && onOpenNewActivity && (
          <button
            onClick={onOpenNewActivity}
            className="px-3 py-1.5 rounded-lg border border-[#8257E5]/40 bg-[#8257E5]/15 text-xs font-semibold text-[#996DFF] hover:bg-[#8257E5]/25 transition-all"
          >
            + Nova Atividade
          </button>
        )}

        <div className="h-4 w-px bg-[#1E222D]" />

        <span className="text-xs font-bold text-[#b1e6bf] bg-[#1b2922] px-2.5 py-1 rounded-md border border-[#41534a]">
          {language.toUpperCase()}
        </span>
      </div>
    </header>
  );
};
