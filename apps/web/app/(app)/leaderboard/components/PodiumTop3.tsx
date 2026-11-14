'use client';

import React from 'react';
import type { LeaderboardDisplayUser } from '../types';

interface PodiumTop3Props {
  top3: LeaderboardDisplayUser[];
}

export const PodiumTop3: React.FC<PodiumTop3Props> = ({ top3 }) => {
  if (top3.length < 3) return null;

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="mb-10">
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-black font-brand text-white tracking-tight flex items-center justify-center gap-2">
          <span>👑</span>
          <span>Pódio de Honra</span>
        </h3>
        <p className="text-xs text-[#94A3B8] mt-1">
          Os 3 desenvolvedores em destaque com maior XP acumulado e consistência de código.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end max-w-4xl mx-auto pt-4">
        {/* ========================================================================= */}
        {/* RANK 2 - PRATA (#E2E8F0)                                                  */}
        {/* ========================================================================= */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          {/* Avatar & Aura */}
          <div className="relative mb-3 group">
            <div className="w-20 h-20 rounded-2xl bg-[#0F1424] border-2 border-[#E2E8F0] shadow-[0_0_25px_rgba(226,232,240,0.25)] flex items-center justify-center text-xl font-mono font-black text-white relative transition-transform group-hover:scale-105">
              {second.avatarInitials}
              <span className="absolute -top-3 -right-2 text-2xl filter drop-shadow">🥈</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#E2E8F0] text-[#07090E] text-[10px] font-mono font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
              #2 LUGAR
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-3">
            <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              {second.name}
              {second.isCurrentUser && (
                <span className="bg-[#8257E5] text-white text-[9px] font-mono font-black px-1.5 py-0.2 rounded">
                  VOCÊ
                </span>
              )}
            </h4>
            <p className="text-[11px] font-mono text-[#94A3B8]">Nível {second.level}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono bg-[#141A29] text-[#94A3B8] px-2 py-0.5 rounded border border-[#1E2638]">
                {second.badges.length} {second.badges.length === 1 ? 'insígnia' : 'insígnias'}
              </span>
            </div>
          </div>

          {/* Pedestal Block */}
          <div className="w-full bg-[#0C101C] border-t-4 border-t-[#E2E8F0] border-x border-b border-[#1C2338] rounded-t-2xl p-4 text-center h-36 flex flex-col justify-between shadow-[0_-5px_20px_rgba(226,232,240,0.06)]">
            <div>
              <div className="text-base font-black font-mono text-[#E2E8F0]">
                {second.xp.toLocaleString('pt-BR')} XP
              </div>
              <div className="text-[10px] font-mono text-[#64748B] mt-0.5">
                🔥 {second.streakDays}d ofensiva • {second.completedActivitiesCount} missões
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#E2E8F0] bg-[#E2E8F0]/10 border border-[#E2E8F0]/30 py-1 rounded-lg font-bold">
              🥈 Medalha de Prata
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RANK 1 - OURO (#FFA116) - CENTER & TALLEST                                */}
        {/* ========================================================================= */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          {/* Crown & Avatar with Golden Aura */}
          <div className="relative mb-3 group">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl animate-bounce">
              👑
            </div>
            <div className="w-24 h-24 rounded-2xl bg-[#14121A] border-2 border-[#FFA116] shadow-[0_0_35px_rgba(255,161,22,0.35)] flex items-center justify-center text-2xl font-mono font-black text-[#FFA116] relative transition-transform group-hover:scale-105">
              {first.avatarInitials}
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FFA116] text-[#07090E] text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                #1 LUGAR
              </span>
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-3">
            <h4 className="text-base font-black text-white flex items-center justify-center gap-1.5">
              {first.name}
              {first.isCurrentUser && (
                <span className="bg-[#8257E5] text-white text-[9px] font-mono font-black px-1.5 py-0.2 rounded">
                  VOCÊ
                </span>
              )}
            </h4>
            <p className="text-xs font-mono text-amber-400">Nível {first.level}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded border border-amber-500/30">
                {first.badges.length} {first.badges.length === 1 ? 'insígnia' : 'insígnias'}
              </span>
            </div>
          </div>

          {/* Pedestal Block */}
          <div className="w-full bg-[#0E121E] border-t-4 border-t-[#FFA116] border-x border-b border-[#1C2338] rounded-t-2xl p-4 text-center h-44 flex flex-col justify-between shadow-[0_-8px_25px_rgba(255,161,22,0.12)]">
            <div>
              <div className="text-lg font-black font-mono text-[#FFA116]">
                {first.xp.toLocaleString('pt-BR')} XP
              </div>
              <div className="text-[10px] font-mono text-[#64748B] mt-0.5">
                🔥 {first.streakDays}d ofensiva • {first.completedActivitiesCount} missões
              </div>
            </div>
            <div className="text-xs font-mono text-[#FFA116] bg-[#FFA116]/10 border border-[#FFA116]/30 py-1.5 rounded-lg font-bold">
              👑 Campeão da Divisão
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RANK 3 - BRONZE (#CD7F32)                                                 */}
        {/* ========================================================================= */}
        <div className="order-3 md:order-3 flex flex-col items-center">
          {/* Avatar & Aura */}
          <div className="relative mb-3 group">
            <div className="w-20 h-20 rounded-2xl bg-[#14101A] border-2 border-[#CD7F32] shadow-[0_0_25px_rgba(205,127,50,0.25)] flex items-center justify-center text-xl font-mono font-black text-white relative transition-transform group-hover:scale-105">
              {third.avatarInitials}
              <span className="absolute -top-3 -right-2 text-2xl filter drop-shadow">🥉</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-[#07090E] text-[10px] font-mono font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
              #3 LUGAR
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-3">
            <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              {third.name}
              {third.isCurrentUser && (
                <span className="bg-[#8257E5] text-white text-[9px] font-mono font-black px-1.5 py-0.2 rounded">
                  VOCÊ
                </span>
              )}
            </h4>
            <p className="text-[11px] font-mono text-[#94A3B8]">Nível {third.level}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono bg-[#141A29] text-[#94A3B8] px-2 py-0.5 rounded border border-[#1E2638]">
                {third.badges.length} {third.badges.length === 1 ? 'insígnia' : 'insígnias'}
              </span>
            </div>
          </div>

          {/* Pedestal Block */}
          <div className="w-full bg-[#0C101C] border-t-4 border-t-[#CD7F32] border-x border-b border-[#1C2338] rounded-t-2xl p-4 text-center h-32 flex flex-col justify-between shadow-[0_-5px_20px_rgba(205,127,50,0.06)]">
            <div>
              <div className="text-base font-black font-mono text-[#CD7F32]">
                {third.xp.toLocaleString('pt-BR')} XP
              </div>
              <div className="text-[10px] font-mono text-[#64748B] mt-0.5">
                🔥 {third.streakDays}d ofensiva • {third.completedActivitiesCount} missões
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#CD7F32] bg-[#CD7F32]/10 border border-[#CD7F32]/30 py-1 rounded-lg font-bold">
              🥉 Medalha de Bronze
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
