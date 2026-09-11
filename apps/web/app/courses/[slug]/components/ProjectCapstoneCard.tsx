'use client';

import React from 'react';
import Link from 'next/link';
import { CapstoneProject } from '../types';

interface ProjectCapstoneCardProps {
  capstone: CapstoneProject;
  courseSlug: string;
}

export const ProjectCapstoneCard: React.FC<ProjectCapstoneCardProps> = ({
  capstone,
  courseSlug,
}) => {
  return (
    <div className="bg-gradient-to-br from-[#181820] to-[#121217] border border-[#04D361]/40 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#04D361]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#04D361] text-[#08080B] text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase">
              PROJETO CAPSTONE FINAL
            </span>
            <span className="text-xs font-mono text-[#04D361] font-bold">
              +{capstone.xpReward.toLocaleString('pt-BR')} XP • {capstone.estimatedHours}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-heading mb-2">
            {capstone.title}
          </h3>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed mb-4">
            {capstone.description}
          </p>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-zinc-400 font-bold block mb-1">
              Entregáveis Obrigatórios Auditados pelo Runner:
            </span>
            {capstone.deliverables.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
                <span className="text-[#04D361]">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 shrink-0">
          <Link
            href={`/ide?course=${courseSlug}&project=capstone`}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] hover:from-[#00875F] hover:to-[#00B37E] text-[#08080B] font-black text-xs transition-all shadow-lg shadow-[#04D361]/30 flex items-center justify-center gap-2 active:scale-95 text-decoration-none"
          >
            <span>🚀</span>
            <span>Clonar Template &amp; Abrir IDE</span>
          </Link>

          <span className="text-[10px] font-mono text-zinc-500 text-center lg:text-right">
            Template: {capstone.gitRepoTemplate}
          </span>
        </div>
      </div>
    </div>
  );
};
