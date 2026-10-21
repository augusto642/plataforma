'use client';

import React from 'react';
import { bandForXp } from '../data';
import type { LeaderboardDisplayUser, XpBandInfo } from '../types';

interface XpBandHeaderProps {
  bands: XpBandInfo[];
  currentEntry?: LeaderboardDisplayUser | null;
}

export const XpBandHeader: React.FC<XpBandHeaderProps> = ({
  bands,
  currentEntry,
}) => {
  const currentBand = currentEntry ? bandForXp(currentEntry.xp) : null;
  const currentBandInfo = currentBand
    ? bands.find((band) => band.band === currentBand.band) ?? currentBand
    : null;
  const nextBand =
    currentBandInfo != null
      ? bands[bands.findIndex((band) => band.band === currentBandInfo.band) + 1] ?? null
      : null;
  const xpNeeded =
    currentEntry && nextBand ? Math.max(0, nextBand.minXp - currentEntry.xp) : 0;
  const bandProgress =
    currentEntry && currentBandInfo && nextBand
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((currentEntry.xp - currentBandInfo.minXp) /
                (nextBand.minXp - currentBandInfo.minXp)) *
                100,
            ),
          ),
        )
      : currentEntry
        ? 100
        : 0;

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden shadow-2xl">
      {currentBandInfo && (
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: currentBandInfo.color }}
        />
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
            Faixas do ranking por XP total
          </span>
          {currentBandInfo && (
            <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-1 rounded-full border border-[#00E5FF]/30">
              Sua faixa: {currentBandInfo.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {bands.map((band) => {
            const isUserBand = currentBandInfo?.band === band.band;

            return (
              <div
                key={band.band}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center relative ${
                  isUserBand
                    ? 'bg-[#14141B] border-[#04D361]/60'
                    : 'bg-[#0E0E12] border-[#27272A] opacity-70'
                }`}
              >
                {isUserBand && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#04D361] text-[#08080B] text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-sm">
                    VOCÊ
                  </span>
                )}
                <span className="text-xl mb-1 filter drop-shadow-sm">{band.icon}</span>
                <span className="text-[11px] font-bold text-white whitespace-nowrap">
                  {band.name.replace('Faixa ', '')}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">{band.rangeLabel}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
          As faixas são apenas agrupamentos de exibição derivados do XP total acumulado — a Nexus Code não
          tem ligas, temporadas, rodadas semanais, promoção ou rebaixamento.
        </p>
      </div>

      {currentEntry && currentBandInfo ? (
        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #121217, #181820)',
                borderColor: currentBandInfo.color,
                boxShadow: `0 0 20px ${currentBandInfo.color}33`,
              }}
            >
              {currentBandInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white font-heading">
                  {currentBandInfo.name} — {currentBandInfo.rangeLabel}
                </h2>
                <span className="bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  Posição #{currentEntry.rank} no ranking
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">
                {currentBandInfo.description}
              </p>
            </div>
          </div>

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
              <span>{currentEntry.xp.toLocaleString('pt-BR')} XP acumulado</span>
              {nextBand ? (
                <span>
                  Faltam {xpNeeded.toLocaleString('pt-BR')} XP · Próx:{' '}
                  {nextBand.name.replace('Faixa ', '')}
                </span>
              ) : (
                <span>Faixa máxima</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs leading-relaxed text-zinc-400">
          Sua posição e sua faixa aparecem aqui apenas quando o seu usuário está presente
          no ranking retornado pela API deste curso. O ranking lista os alunos matriculados
          no curso selecionado.
        </div>
      )}
    </div>
  );
};
