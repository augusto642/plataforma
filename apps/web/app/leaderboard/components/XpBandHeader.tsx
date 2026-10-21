'use client';

import React from 'react';
import { XpBand, XpBandInfo } from '../types';

interface XpBandHeaderProps {
  bands: XpBandInfo[];
  currentBand: XpBand;
  selectedBand: XpBand;
  onSelectBand: (band: XpBand) => void;
  userRank: number;
  userXp: number;
}

export const XpBandHeader: React.FC<XpBandHeaderProps> = ({
  bands,
  currentBand,
  selectedBand,
  onSelectBand,
  userRank,
  userXp,
}) => {
  const currentBandInfo = bands.find((b) => b.band === currentBand) || bands[4];
  const nextBandIndex = bands.findIndex((b) => b.band === currentBand) + 1;
  const nextBand = nextBandIndex < bands.length ? bands[nextBandIndex] : null;

  const currentMinXp = currentBandInfo.minXp;
  const nextMinXp = nextBand ? nextBand.minXp : currentMinXp;
  const xpNeeded = nextBand ? Math.max(0, nextMinXp - userXp) : 0;
  const bandProgress = nextBand
    ? Math.min(100, Math.max(0, Math.round(((userXp - currentMinXp) / (nextMinXp - currentMinXp)) * 100)))
    : 100;

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden shadow-2xl">
      {/* Background cyber glow */}
      <div
        className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: currentBandInfo.color }}
      />

      {/* Bands Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
            Faixas do ranking por XP total
          </span>
          <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-1 rounded-full border border-[#00E5FF]/30">
            Sua faixa: {currentBandInfo.name}
          </span>
        </div>

        {/* Band Badges Carousel / Track */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {bands.map((b) => {
            const isUserBand = b.band === currentBand;
            const isSelected = b.band === selectedBand;

            return (
              <button
                key={b.band}
                type="button"
                onClick={() => onSelectBand(b.band)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center relative ${
                  isSelected
                    ? 'bg-[#181820] border-[#996DFF] shadow-[0_0_15px_rgba(130,87,229,0.35)] scale-[1.03]'
                    : isUserBand
                    ? 'bg-[#14141B] border-[#04D361]/60 hover:border-[#04D361]'
                    : 'bg-[#0E0E12] border-[#27272A] hover:border-zinc-600 opacity-70 hover:opacity-100'
                }`}
              >
                {isUserBand && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#04D361] text-[#08080B] text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-sm">
                    VOCÊ
                  </span>
                )}
                <span className="text-xl mb-1 filter drop-shadow-sm">{b.icon}</span>
                <span className="text-[11px] font-bold text-white whitespace-nowrap">
                  {b.name.replace('Faixa ', '')}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">{b.rangeLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
          As faixas são apenas agrupamentos de exibição derivados do XP total acumulado — a Nexus Code não
          tem ligas, temporadas, rodadas semanais, promoção ou rebaixamento.
        </p>
      </div>

      {/* Current User Band Progress Bar */}
      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-lg"
            style={{
              background: `linear-gradient(135deg, #121217, #181820)`,
              borderColor: currentBandInfo.color,
              boxShadow: `0 0 20px ${currentBandInfo.color}33`,
            }}
          >
            {currentBandInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white font-heading">
                {currentBandInfo.name} — {currentBandInfo.rangeLabel}
              </h2>
              <span className="bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                Posição #{userRank} no ranking
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">
              {currentBandInfo.description}
            </p>
          </div>
        </div>

        {/* Progress towards next band */}
        <div className="md:w-72 flex flex-col justify-center">
          <div className="flex justify-between text-xs font-mono mb-1.5">
            <span className="text-zinc-400">Progresso para a próxima faixa</span>
            <span className="font-bold text-[#04D361]">{bandProgress}%</span>
          </div>
          <div className="w-full bg-[#0E0E12] h-2.5 rounded-full overflow-hidden border border-[#27272A]">
            <div
              className="h-full bg-gradient-to-r from-[#8257E5] via-[#00E5FF] to-[#04D361] rounded-full transition-all duration-700"
              style={{ width: `${bandProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
            <span>{userXp.toLocaleString('pt-BR')} XP acumulado</span>
            {nextBand ? (
              <span>Faltam {xpNeeded.toLocaleString('pt-BR')} XP · Próx: {nextBand.name.replace('Faixa ', '')}</span>
            ) : (
              <span>Faixa máxima</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
