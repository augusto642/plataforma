import React from 'react';
import { CourseTechIcon } from './CourseTechIcon';

interface ActiveMissionBannerProps {
  onContinue: () => void;
}

export function ActiveMissionBanner({ onContinue }: ActiveMissionBannerProps) {
  return (
    <div className="bg-gradient-to-br from-[#8257E5]/15 to-[#121217]/95 border border-[#8257E5]/40 rounded-[20px] p-6 sm:p-7 my-7 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#8257E5]/20 border border-[#8257E5]/40 flex items-center justify-center p-2 flex-shrink-0 shadow-[0_0_20px_rgba(130,87,229,0.2)]">
          <CourseTechIcon type="fullstack" className="w-8 h-8" />
        </div>
        <div>
          <span className="inline-block text-[10px] font-mono font-bold uppercase bg-[#8257E5] text-white px-2 py-0.5 rounded-full mb-1">
            Sua Trilha Ativa
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight font-heading">
            Fullstack Next.js 14 &amp; Arquitetura Cloud
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Próximo Desafio: <strong className="text-zinc-200 font-semibold">04. Implementar Cache LRU com Redis &amp; Locks Atômicos</strong>
          </p>
        </div>
      </div>

      <div className="min-w-[240px] flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-400">Progresso Geral</span>
          <span className="text-[#04D361] font-bold">68% Concluído</span>
        </div>
        <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8257E5] to-[#04D361] rounded-full transition-all duration-500"
            style={{ width: '68%' }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[11px] font-mono text-zinc-500">18 de 24 Desafios</span>
          <button
            type="button"
            onClick={onContinue}
            className="bg-[#04D361] hover:opacity-90 text-black font-bold text-xs px-4 py-2 rounded-xl transition-all duration-200 inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(4,211,97,0.25)] active:scale-95 cursor-pointer"
          >
            <span>Continuar Código</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
