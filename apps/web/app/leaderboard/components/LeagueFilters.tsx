'use client';

import React from 'react';
import { LeaderboardFilter } from '../types';

interface LeagueFiltersProps {
  currentFilter: LeaderboardFilter;
  onFilterChange: (filter: LeaderboardFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalParticipants: number;
}

export const LeagueFilters: React.FC<LeagueFiltersProps> = ({
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalParticipants,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      {/* Tab filter buttons */}
      <div className="flex items-center bg-[#121217] border border-[#27272A] rounded-xl p-1 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onFilterChange('current')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentFilter === 'current'
              ? 'bg-[#8257E5] text-white shadow-md shadow-[#8257E5]/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          💎 Liga Atual ({totalParticipants})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('global')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentFilter === 'global'
              ? 'bg-[#8257E5] text-white shadow-md shadow-[#8257E5]/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          🌍 Liga Global (Hall da Fama)
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('friends')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentFilter === 'friends'
              ? 'bg-[#8257E5] text-white shadow-md shadow-[#8257E5]/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          👥 Amigos &amp; Squad
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-72">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar dev por nome ou @handle..."
          className="w-full bg-[#121217] border border-[#27272A] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
        />
      </div>
    </div>
  );
};
