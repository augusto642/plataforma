'use client';

import React from 'react';

interface SocraticFocusCardProps {
  focusAreas: string[];
}

export const SocraticFocusCard: React.FC<SocraticFocusCardProps> = ({ focusAreas }) => {
  return (
    <div className="bg-[#121217] border border-[#8257E5]/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute right-0 top-0 w-32 h-32 bg-[#8257E5]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#8257E5]/20 border border-[#8257E5]/50 flex items-center justify-center text-xl">
          🧠
        </div>
        <div>
          <h3 className="text-base font-bold text-white font-heading">
            Critérios de Avaliação do Mentor Socrático
          </h3>
          <p className="text-xs text-zinc-400">
            O que a IA analisará no seu código durante a execução no sandbox:
          </p>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {focusAreas.map((area, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 bg-[#181820] border border-[#27272A] p-3 rounded-xl text-xs text-zinc-300"
          >
            <span className="text-[#04D361] font-bold mt-0.5">✦</span>
            <span>{area}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
