'use client';

import React from 'react';
import { LeagueTier, LeagueTierInfo } from '../types';

interface LeagueTierHeaderProps {
  tiers: LeagueTierInfo[];
  currentTier: LeagueTier;
  selectedTier: LeagueTier;
  onSelectTier: (tier: LeagueTier) => void;
  userRank: number;
  userWeeklyXp: number;
}

export const LeagueTierHeader: React.FC<LeagueTierHeaderProps> = ({
  tiers,
  currentTier,
  selectedTier,
  onSelectTier,
  userRank,
  userWeeklyXp,
}) => {
  const currentTierInfo = tiers.find((t) => t.tier === currentTier) || tiers[4];
  const nextTierIndex = tiers.findIndex((t) => t.tier === currentTier) + 1;
  const nextTier = nextTierIndex < tiers.length ? tiers[nextTierIndex] : null;

  const currentMinXp = currentTierInfo.minXp;
  const nextMinXp = nextTier ? nextTier.minXp : currentMinXp + 5000;
  const xpNeeded = Math.max(0, nextMinXp - userWeeklyXp);
  const tierProgress = Math.min(
    100,
    Math.max(10, Math.round(((userWeeklyXp - currentMinXp) / (nextMinXp - currentMinXp)) * 100))
  );

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden shadow-2xl">
      {/* Background cyber glow */}
      <div
        className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: currentTierInfo.color }}
      />

      {/* Tiers Progression Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
            Ligas Semanais por Tiers
          </span>
          <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-1 rounded-full border border-[#00E5FF]/30">
            Sua Liga: {currentTierInfo.name}
          </span>
        </div>

        {/* Tier Badges Carousel / Track */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {tiers.map((t, idx) => {
            const isUserTier = t.tier === currentTier;
            const isSelected = t.tier === selectedTier;

            return (
              <button
                key={t.tier}
                type="button"
                onClick={() => onSelectTier(t.tier)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center relative ${
                  isSelected
                    ? 'bg-[#181820] border-[#996DFF] shadow-[0_0_15px_rgba(130,87,229,0.35)] scale-[1.03]'
                    : isUserTier
                    ? 'bg-[#14141B] border-[#04D361]/60 hover:border-[#04D361]'
                    : 'bg-[#0E0E12] border-[#27272A] hover:border-zinc-600 opacity-70 hover:opacity-100'
                }`}
              >
                {isUserTier && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#04D361] text-[#08080B] text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-sm">
                    VOCÊ
                  </span>
                )}
                <span className="text-xl mb-1 filter drop-shadow-sm">{t.icon}</span>
                <span className="text-[11px] font-bold text-white whitespace-nowrap">
                  {t.name.replace('Liga ', '')}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">{t.division}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current User Tier Progress & Rewards Bar */}
      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-lg"
            style={{
              background: `linear-gradient(135deg, #121217, #181820)`,
              borderColor: currentTierInfo.color,
              boxShadow: `0 0 20px ${currentTierInfo.color}33`,
            }}
          >
            {currentTierInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white font-heading">
                {currentTierInfo.name} — {currentTierInfo.division}
              </h2>
              <span className="bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                Posição #{userRank} (Zona de Promoção)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">
              {currentTierInfo.description}
            </p>
          </div>
        </div>

        {/* Progress towards next tier */}
        <div className="md:w-72 flex flex-col justify-center">
          <div className="flex justify-between text-xs font-mono mb-1.5">
            <span className="text-zinc-400">Progresso de Promoção</span>
            <span className="font-bold text-[#04D361]">{tierProgress}%</span>
          </div>
          <div className="w-full bg-[#0E0E12] h-2.5 rounded-full overflow-hidden border border-[#27272A]">
            <div
              className="h-full bg-gradient-to-r from-[#8257E5] via-[#00E5FF] to-[#04D361] rounded-full transition-all duration-700"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
            <span>{userWeeklyXp.toLocaleString('pt-BR')} XP nesta rodada</span>
            {nextTier && <span>Próx: {nextTier.name.replace('Liga ', '')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
