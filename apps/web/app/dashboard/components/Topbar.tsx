'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import Logo from '../../components/Logo';

interface TopbarProps {
  user: {
    name: string;
    avatarInitials: string;
    xp: number;
    level: number;
    levelTitle: string;
    streakDays: number;
    league: {
      name: string;
      tier: string;
      rank: number;
    };
  };
  onSimulateChallenge: () => void;
  onSearch?: (query: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  onSimulateChallenge,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="h-16 bg-[#121214] border-b border-[#27272A] px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="flex items-center gap-6">
        {/* Brand Logo */}
        <Logo size="md" href="/" />

        {/* Link to Editor IDE */}
        <Link
          href="/ide"
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#202024] border border-[#27272A] text-xs text-[#A1A1AA] hover:text-white transition-colors"
        >
          <span>💻</span>
          <span>Editor & Labs</span>
        </Link>

        {/* Command Search Bar (Ctrl+K style) */}
        <div className="hidden md:flex items-center gap-2 bg-[#18181B] border border-[#27272A] focus-within:border-[#8257E5] rounded-xl px-3 py-1.5 w-64 lg:w-72 text-xs text-[#71717A] transition-all">
          <svg className="w-4 h-4 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar aulas, tags, algoritmos..."
            className="bg-transparent text-[#EDEDED] placeholder-[#71717A] text-xs focus:outline-none w-full"
          />
          <kbd className="font-mono text-[10px] bg-[#27272A] text-[#A1A1AA] px-1.5 py-0.5 rounded border border-[#3F3F46]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* User Header Stats & Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3 md:gap-5">
        {/* Streak Counter with Flame & Solar Aura */}
        <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-[#FFA116]/60 transition-all ${user.streakDays >= 3 ? 'streak-fire-aura' : ''}`}>
          <span className="text-base animate-bounce">🔥</span>
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#FFA116]">{user.streakDays} dias</span>
            <span className="text-[9px] text-[#A1A1AA] -mt-0.5 hidden xs:inline">Ofensiva ativa</span>
          </div>
        </div>

        {/* XP & Level Badge with Odometer Pop Effect */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#8257E5]/15 border border-[#8257E5]/40 xp-pop-anim">
          <span className="text-sm">⚡</span>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-black text-[#996DFF]">
              {user.xp.toLocaleString('pt-BR')} XP
            </span>
            <span className="text-[9px] text-[#8257E5] font-bold uppercase hidden sm:inline">
              Nível {user.level} • {user.levelTitle}
            </span>
          </div>
        </div>

        {/* League Status */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00B37E]/10 border border-[#00B37E]/30">
          <span className="text-sm">💎</span>
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#04D361]">{user.league.name}</span>
            <span className="text-[9px] text-[#00B37E] font-medium">Top #{user.league.rank} (Promoção)</span>
          </div>
        </div>

        {/* Simulate Exercise / Trigger Confetti CTA */}
        <button
          onClick={onSimulateChallenge}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B37E] to-[#04D361] hover:from-[#00875F] hover:to-[#00B37E] text-[#09090A] font-extrabold text-xs transition-all glow-green shadow-md active:scale-95 cursor-pointer"
        >
          <span>⚡</span>
          <span className="hidden sm:inline">Resolver Desafio (+250 XP)</span>
          <span className="sm:hidden">+250 XP</span>
        </button>

        {/* User Avatar Profile with Dynamic League Frame */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#27272A]">
          <Link
            href="/profile"
            title={`Perfil de ${user.name}`}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#0070F3] p-[1.5px] shadow-lg shadow-[#8257E5]/20 hover:scale-105 transition-transform select-none block"
          >
            <div className="w-full h-full bg-[#121214] rounded-[10px] flex items-center justify-center text-xs font-black text-[#00E5FF]">
              {user.avatarInitials}
            </div>
          </Link>
          <Link
            href="/settings"
            title="Configurações da Conta"
            className="hidden sm:flex w-8 h-8 rounded-lg bg-[#18181B] hover:bg-[#222228] border border-[#27272A] items-center justify-center text-xs text-[#A1A1AA] hover:text-white transition-colors"
          >
            ⚙️
          </Link>
        </div>
      </div>
    </header>
  );
};
