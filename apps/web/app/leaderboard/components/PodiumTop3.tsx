'use client';

import React from 'react';
import Link from 'next/link';
import { LeaderboardUser } from '../types';

interface PodiumTop3Props {
  top3: LeaderboardUser[];
}

export const PodiumTop3: React.FC<PodiumTop3Props> = ({ top3 }) => {
  if (top3.length < 3) return null;

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="mb-10">
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight flex items-center justify-center gap-2">
          <span>👑</span>
          <span>Pódio dos Campeões da Semana</span>
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Os 3 desenvolvedores com maior rendimento e commits auditados no sandbox isolado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end max-w-4xl mx-auto pt-4">
        {/* ========================================================================= */}
        {/* RANK 2 - PRATA (#E2E8F0)                                                  */}
        {/* ========================================================================= */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          {/* Avatar & Aura */}
          <div className="relative mb-3 group">
            <div className="w-20 h-20 rounded-2xl bg-[#181820] border-2 border-[#E2E8F0] shadow-[0_0_25px_rgba(226,232,240,0.35)] flex items-center justify-center text-xl font-mono font-black text-white relative transition-transform group-hover:scale-105">
              {second.avatarInitials}
              <span className="absolute -top-3 -right-2 text-2xl filter drop-shadow">🥈</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#E2E8F0] text-[#08080B] text-[10px] font-mono font-black px-2 py-0.5 rounded-full shadow-md">
              #2 LUGAR
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-3">
            <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              {second.name}
            </h4>
            <p className="text-[11px] font-mono text-zinc-400">@{second.handle}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                {second.currentTrack}
              </span>
            </div>
          </div>

          {/* Pedestal Block */}
          <div className="w-full bg-gradient-to-t from-[#121217] to-[#181820] border-t-4 border-t-[#E2E8F0] border-x border-b border-[#27272A] rounded-t-2xl p-4 text-center h-36 flex flex-col justify-between shadow-[0_-5px_20px_rgba(226,232,240,0.08)]">
            <div>
              <div className="text-base font-black font-mono text-[#E2E8F0]">
                {second.weeklyXp.toLocaleString('pt-BR')} XP
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                🔥 {second.streakDays} dias • {second.gitSolvedCount} labs
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
            <div className="w-24 h-24 rounded-2xl bg-[#1C1917] border-2 border-[#FFA116] shadow-[0_0_35px_rgba(255,161,22,0.45)] flex items-center justify-center text-2xl font-mono font-black text-[#FFA116] relative transition-transform group-hover:scale-105">
              {first.avatarInitials}
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FFA116] text-[#08080B] text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-lg">
                #1 LUGAR
              </span>
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-3">
            <h4 className="text-base font-black text-white flex items-center justify-center gap-1.5">
              {first.name}
            </h4>
            <p className="text-xs font-mono text-amber-400/90">@{first.handle}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded border border-amber-500/30">
                {first.currentTrack}
              </span>
            </div>
          </div>

          {/* Pedestal Block */}
          <div className="w-full bg-gradient-to-t from-[#16120E] to-[#241B12] border-t-4 border-t-[#FFA116] border-x border-b border-amber-500/30 rounded-t-2xl p-4 text-center h-48 flex flex-col justify-between shadow-[0_-8px_25px_rgba(255,161,22,0.15)]">
            <div>
              <div className="text-xl font-black font-mono text-[#FFA116]">
                {first.weeklyXp.toLocaleString('pt-BR')} XP
              </div>
              <div className="text-xs font-mono text-zinc-300 mt-0.5">
                🔥 {first.streakDays} dias streak • {first.gitSolvedCount} labs Git
              </div>
            </div>
            <div className="text-xs font-mono text-[#FFA116] bg-[#FFA116]/15 border border-[#FFA116]/40 py-1.5 rounded-lg font-black">
              🏆 +2.500 XP Bônus &amp; Badge
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RANK 3 - BRONZE (#CD7F32)                                                 */}
        {/* ========================================================================= */}
        <div className="order-3 flex flex-col items-center">
          {/* Avatar & Aura */}
          <div className="relative mb-3 group">
            <div className="w-20 h-20 rounded-2xl bg-[#181820] border-2 border-[#CD7F32] shadow-[0_0_25px_rgba(205,127,50,0.35)] flex items-center justify-center text-xl font-mono font-black text-white relative transition-transform group-hover:scale-105">
              {third.avatarInitials}
              <span className="absolute -top-3 -right-2 text-2xl filter drop-shadow">🥉</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#CD7F32] text-[#08080B] text-[10px] font-mono font-black px-2 py-0.5 rounded-full shadow-md">
              #3 LUGAR
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-3">
            <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              {third.name}
            </h4>
            <p className="text-[11px] font-mono text-zinc-400">@{third.handle}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                {third.currentTrack}
              </span>
            </div>
          </div>

          {/* Pedestal Block */}
          <div className="w-full bg-gradient-to-t from-[#121217] to-[#181820] border-t-4 border-t-[#CD7F32] border-x border-b border-[#27272A] rounded-t-2xl p-4 text-center h-32 flex flex-col justify-between shadow-[0_-5px_20px_rgba(205,127,50,0.08)]">
            <div>
              <div className="text-base font-black font-mono text-[#CD7F32]">
                {third.weeklyXp.toLocaleString('pt-BR')} XP
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                🔥 {third.streakDays} dias • {third.gitSolvedCount} labs
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
