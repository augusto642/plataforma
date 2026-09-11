'use client';

import React from 'react';

interface LeaderboardUser {
  rank: number;
  name: string;
  initials: string;
  avatarGradient: string;
  completedCount: number;
  xp: number;
  todayGain?: string;
  isCurrentUser?: boolean;
  lastActive?: string;
}

interface WeeklyLeagueTableProps {
  leagueName: string;
  timeRemaining: string;
  leaderboard: LeaderboardUser[];
  userXp: number;
}

export const WeeklyLeagueTable: React.FC<WeeklyLeagueTableProps> = ({
  leagueName,
  timeRemaining,
  leaderboard,
  userXp,
}) => {
  const getMedalOrRank = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="bento-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏆</span>
          <div>
            <h3 className="text-sm font-bold text-white">{leagueName}</h3>
            <p className="text-[11px] text-[#71717A]">
              Os 5 primeiros colocados sobem para a Liga Mestre em{' '}
              <strong className="text-[#EDEDED]">{timeRemaining}</strong>.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#00B37E]/20 text-[#04D361] border border-[#00B37E]/30 whitespace-nowrap">
          Zona de Promoção
        </span>
      </div>

      <div className="space-y-2">
        {leaderboard.map((item) => {
          const isCurrent = item.isCurrentUser;
          const currentDisplayXp = isCurrent ? userXp : item.xp;

          if (isCurrent) {
            return (
              <div
                key={item.rank}
                className="flex items-center justify-between p-3 rounded-xl bg-[#8257E5]/15 border-2 border-[#8257E5] glow-purple transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-[#E1E1E6] w-6 text-center">
                    {getMedalOrRank(item.rank)}
                  </span>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${item.avatarGradient} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#996DFF]">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-[#C4C4CC]">
                      {item.completedCount} desafios concluídos
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-[#996DFF] font-mono">
                    {currentDisplayXp.toLocaleString('pt-BR')} XP
                  </div>
                  <div className="text-[10px] text-[#04D361] font-bold">
                    {item.todayGain || 'Na zona de promoção'}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.rank}
              className="flex items-center justify-between p-3 rounded-xl bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-base font-black w-6 text-center ${
                    item.rank === 1
                      ? 'text-[#FFA116]'
                      : item.rank === 3
                      ? 'text-[#CD7F32]'
                      : 'text-[#71717A] text-xs'
                  }`}
                >
                  {getMedalOrRank(item.rank)}
                </span>
                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${item.avatarGradient} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
                  {item.initials}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[10px] text-[#71717A]">
                    {item.completedCount} desafios concluídos
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-white font-mono">
                  {item.xp.toLocaleString('pt-BR')} XP
                </div>
                {item.todayGain ? (
                  <div className="text-[10px] text-[#04D361] font-bold">
                    {item.todayGain}
                  </div>
                ) : item.lastActive ? (
                  <div className="text-[10px] text-[#71717A]">
                    {item.lastActive}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
