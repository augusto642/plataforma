'use client';

import React from 'react';
import { bandForXp } from '../data';
import type { LeaderboardDisplayUser, XpBandInfo } from '../types';
import { MaterialIcon } from '../../../components/MaterialIcon';

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
    <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden shadow-2xl">
      {currentBandInfo && (
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
          style={{ background: currentBandInfo.color }}
        />
      )}

      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-xs font-mono font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
            Faixas de Maestria &amp; Ligas de XP
          </span>
          {currentBandInfo && (
            <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1 rounded-full border border-[#00E5FF]/30 font-bold">
              Sua Patente: {currentBandInfo.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {bands.map((band) => {
            const isUserBand = currentBandInfo?.band === band.band;

            return (
              <div
                key={band.band}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center relative transition-all ${
                  isUserBand
                    ? 'bg-[#151D2F] border-[#04D361] shadow-[0_0_15px_rgba(4,211,97,0.2)]'
                    : 'bg-[#111522] border-[#1C2338] opacity-80 hover:opacity-100'
                }`}
              >
                {isUserBand && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#04D361] text-[#07090E] text-[9px] font-mono font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                    SUA FAIXA
                  </span>
                )}
                <span className="text-2xl mb-1 filter drop-shadow-sm">{band.icon}</span>
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  {band.name.replace('Faixa ', '')}
                </span>
                <span className="text-[10px] font-mono text-[#64748B] mt-0.5">{band.rangeLabel}</span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-[#64748B] mt-3.5 leading-relaxed font-sans">
          As faixas de maestria refletem seu avanço técnico contínuo na plataforma. Resolva desafios de código,
          complete módulos e mantenha sua ofensiva diária ativa para subir de patente.
        </p>
      </div>

      {currentEntry && currentBandInfo && (
        <div className="bg-[#121624] border border-[#1E273D] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#1A2133] border border-[#27334D] flex items-center justify-center text-xl shrink-0">
              {currentBandInfo.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Você está na {currentBandInfo.name}</span>
                <span className="text-xs font-mono font-normal text-[#94A3B8]">
                  (Posição #{currentEntry.rank})
                </span>
              </div>
              <div className="text-xs text-[#94A3B8] mt-0.5">
                {nextBand ? (
                  <span>
                    Faltam <strong className="text-white font-mono">{xpNeeded.toLocaleString('pt-BR')} XP</strong> para alcançar a {nextBand.name}.
                  </span>
                ) : (
                  <span className="text-[#04D361] font-bold">
                    🏆 Você atingiu o nível máximo de maestria na plataforma!
                  </span>
                )}
              </div>
            </div>
          </div>

          {nextBand && (
            <div className="w-full md:w-64">
              <div className="flex justify-between text-[11px] font-mono text-[#94A3B8] mb-1.5">
                <span>Progresso da Faixa</span>
                <span className="text-white font-bold">{bandProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#1A2133] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8257E5] to-[#04D361] rounded-full transition-all duration-500"
                  style={{ width: `${bandProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
