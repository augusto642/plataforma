'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { LeagueTier, LeaderboardFilter } from './types';
import {
  LEAGUE_TIERS,
  CURRENT_ROUND_INFO,
  CURRENT_LEAGUE_USERS,
  GLOBAL_LEAGUE_USERS,
  FRIENDS_LEAGUE_USERS,
} from './data';
import { LeagueTierHeader } from './components/LeagueTierHeader';
import { PodiumTop3 } from './components/PodiumTop3';
import { WeeklyTimerCard } from './components/WeeklyTimerCard';
import { LeagueFilters } from './components/LeagueFilters';
import { LeaderboardTable } from './components/LeaderboardTable';

export default function LeaderboardPage() {
  const [selectedTier, setSelectedTier] = useState<LeagueTier>('diamond');
  const [activeFilter, setActiveFilter] = useState<LeaderboardFilter>('current');
  const [searchQuery, setSearchQuery] = useState('');

  // Source list depending on filter
  const rawUsers = useMemo(() => {
    if (activeFilter === 'global') return GLOBAL_LEAGUE_USERS;
    if (activeFilter === 'friends') return FRIENDS_LEAGUE_USERS;
    return CURRENT_LEAGUE_USERS;
  }, [activeFilter]);

  // Filtered by search query
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rawUsers;

    return rawUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.handle.toLowerCase().includes(query) ||
        u.currentTrack.toLowerCase().includes(query)
    );
  }, [rawUsers, searchQuery]);

  // Top 3 for Podium
  const top3Users = useMemo(() => {
    return rawUsers.slice(0, 3);
  }, [rawUsers]);

  const currentUser = CURRENT_LEAGUE_USERS.find((u) => u.isCurrentUser) || CURRENT_LEAGUE_USERS[3];

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black pb-24">
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/courses" className="text-zinc-400 hover:text-white transition-colors">
                Cursos
              </Link>
              <Link
                href="/leaderboard"
                className="text-white border-b-2 border-[#04D361] pb-1 font-semibold"
              >
                Leaderboard &amp; Ligas
              </Link>
              <Link href="/ide" className="text-zinc-400 hover:text-white transition-colors">
                IDE Sandbox
              </Link>
              <Link href="/profile" className="text-zinc-400 hover:text-white transition-colors">
                Perfil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8257E5]/15 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold">
              <span>💎</span>
              <span>Diamante I</span>
            </div>
            <Link
              href="/settings"
              className="w-9 h-9 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-white transition-all text-sm"
              title="Configurações"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="max-w-[1240px] mx-auto px-5 pt-8">
        {/* Page Hero Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold mb-3">
            <span>🏆</span>
            <span>RANKING COMPETITIVO SEMANAL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
            Ligas &amp;{' '}
            <span className="bg-gradient-to-r from-[#996DFF] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">
              Leaderboard de Engenharia
            </span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl mt-1 leading-relaxed">
            Compita com outros desenvolvedores resolvendo desafios reais no Git, otimizando algoritmos e subindo de liga a cada domingo.
          </p>
        </div>

        {/* 1. League Tier Carousel & User Status */}
        <LeagueTierHeader
          tiers={LEAGUE_TIERS}
          currentTier="diamond"
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          userRank={currentUser.rank}
          userWeeklyXp={currentUser.weeklyXp}
        />

        {/* 2. Weekly Countdown Timer */}
        <WeeklyTimerCard roundInfo={CURRENT_ROUND_INFO} />

        {/* 3. Top 3 Podium (Visible when not searching and viewing top ranks) */}
        {!searchQuery && <PodiumTop3 top3={top3Users} />}

        {/* 4. Filter Tabs & Search */}
        <LeagueFilters
          currentFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalParticipants={rawUsers.length}
        />

        {/* 5. Classification Table */}
        <LeaderboardTable users={filteredUsers} filterType={activeFilter} />
      </main>
    </div>
  );
}
