'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface HeroActiveMissionProps {
  mission: {
    trackTitle: string;
    difficulty: 'Fácil' | 'Média' | 'Difícil' | 'Extremo';
    moduleInfo: string;
    title: string;
    description: string;
    progressPercent: number;
    completedLabs: number;
    totalLabs: number;
    gitCloneUrl: string;
    activityId?: string;
    courseId?: string;
  };
  onOpenTutor: () => void;
}

export const HeroActiveMission: React.FC<HeroActiveMissionProps> = ({
  mission,
  onOpenTutor,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mission.gitCloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bento-card spotlight-card p-6 md:p-8 flex flex-col justify-between overflow-hidden shadow-2xl relative border-t-2 border-t-[#8257E5]/50">
      {/* Background Ambient Glows */}
      <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#8257E5]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-40 -bottom-20 w-64 h-64 bg-[#00B37E]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#8257E5]/20 text-[#996DFF] font-mono text-[11px] font-bold border border-[#8257E5]/30 uppercase">
            {mission.trackTitle}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFA116]/10 text-[#FFA116] border border-[#FFA116]/30">
            Dificuldade: {mission.difficulty}
          </span>
          <span className="text-xs text-[#71717A]">• {mission.moduleInfo}</span>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
            {mission.title}
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
            {mission.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 max-w-xl space-y-1.5">
          <div className="flex justify-between text-xs text-[#A1A1AA] font-medium">
            <span>Progresso do Módulo</span>
            <span className="text-[#04D361] font-bold font-mono">
              {mission.progressPercent}% Concluído ({mission.completedLabs}/{mission.totalLabs} Labs)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#09090A] rounded-full overflow-hidden border border-[#27272A]">
            <div
              className="h-full bg-gradient-to-r from-[#8257E5] via-[#0070F3] to-[#00B37E] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${mission.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Git & Action Buttons */}
      <div className="relative z-10 pt-6 mt-6 border-t border-[#27272A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-mono">
          <span>Repo Git:</span>
          <div
            onClick={handleCopy}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#09090A] text-[#996DFF] border border-[#27272A] hover:border-[#8257E5]/50 cursor-pointer transition-colors group"
            title="Clique para copiar"
          >
            <code className="text-[11px] truncate max-w-[220px] sm:max-w-[280px]">
              {mission.gitCloneUrl}
            </code>
            <span className="text-[10px] text-[#A1A1AA] group-hover:text-white">
              {copied ? '✓ Copiado' : '📋'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTutor}
            className="px-4 py-2.5 rounded-xl bg-[#202024] hover:bg-[#27272A] text-[#EDEDED] font-semibold text-xs border border-[#27272A] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>🤖</span>
            <span>Dicas do Tutor IA</span>
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-extrabold text-xs transition-all glow-purple shadow-lg flex items-center gap-2 active:scale-95 text-decoration-none"
          >
            <span>Abrir no Editor Monaco</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
