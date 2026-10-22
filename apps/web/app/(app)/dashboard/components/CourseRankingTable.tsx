'use client';

import React from 'react';

interface LeaderboardUser {
  rank: number;
  name: string;
  initials: string;
  avatarGradient: string;
  completedCount: number;
  xp: number;
  isCurrentUser?: boolean;
}

interface CourseRankingTableProps {
  leaderboard: LeaderboardUser[];
  userXp: number;
}

// B38b (Sprint 11) — este card mostra o Top 5 REAL do ranking do curso
// (GET /courses/:id/leaderboard, ordenado por XP total acumulado). Não
// existe liga semanal, zona de promoção ou contagem regressiva no backend;
// o card foi renomeado e a copy passou a descrever a mecânica real.
export const CourseRankingTable: React.FC<CourseRankingTableProps> = ({
  leaderboard,
  userXp,
}) => {
  const topThree = leaderboard.slice(0, 3);
  const leader = topThree[0];

  return (
    <div className="rounded-3xl border border-[#27272A] bg-[#121214] p-6 h-full flex flex-col justify-between relative overflow-hidden group hover:border-[#8257E5]/50 transition-colors duration-300">
      {/* Background glow */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#8257E5]/10 blur-3xl rounded-full pointer-events-none group-hover:bg-[#8257E5]/15 transition-all duration-500" />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FFA116] to-[#F43F5E] border border-[#FFA116]/30 flex items-center justify-center text-xl shadow-lg shadow-[#FFA116]/10 shrink-0">
            🏆
          </div>
          <div>
            <h3 className="text-base font-black text-white leading-tight">
              Ranking do Curso — Top 5
            </h3>
            <p className="text-xs text-[#A1A1AA] font-medium mt-0.5">
              Os 5 alunos com maior XP acumulado neste curso
            </p>
          </div>
        </div>
      </div>

      {/* Leader Highlight Box */}
      {leader && (
        <div className="mb-5 relative z-10 rounded-2xl bg-gradient-to-r from-[#FFA116]/15 via-[#F43F5E]/10 to-transparent border border-[#FFA116]/30 p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(255,161,22,0.05)]">
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-tr ${leader.avatarGradient} flex items-center justify-center font-black text-white text-sm ring-2 ring-[#FFA116] shadow-lg`}
            >
              {leader.initials}
            </div>
            <span className="absolute -top-2.5 -right-2 text-base drop-shadow-md">👑</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono font-bold text-[#FFA116] tracking-wider uppercase flex items-center gap-1.5">
              <span>👑 Líder do Ranking</span>
            </div>
            <div className="font-extrabold text-white text-sm truncate">
              {leader.name} <span className="text-xs font-mono font-medium text-[#A1A1AA]">({leader.completedCount} desafios)</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono font-black text-[#FFA116] text-base leading-none">
              {leader.xp.toLocaleString('pt-BR')} XP
            </div>
            <div className="text-[10px] font-mono text-[#A1A1AA] mt-1">
              XP acumulado
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Rows */}
      <div className="space-y-2 relative z-10 flex-1 font-sans">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500 font-mono">
            Nenhum dado de ranking do curso disponível no momento.
          </div>
        ) : (
          leaderboard.map((item) => {
            const isTop1 = item.rank === 1;
            const isTop2 = item.rank === 2;
            const isTop3 = item.rank === 3;

            let rankColor = 'text-zinc-400';
            let medal = '';
            if (isTop1) {
              rankColor = 'text-[#FFA116]';
              medal = '🥇';
            } else if (isTop2) {
              rankColor = 'text-zinc-200';
              medal = '🥈';
            } else if (isTop3) {
              rankColor = 'text-[#D97706]';
              medal = '🥉';
            }

            return (
              <div
                key={item.rank}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                  item.isCurrentUser
                    ? 'bg-[#8257E5]/15 border-[#8257E5] shadow-[0_0_15px_rgba(130,87,229,0.15)] relative overflow-hidden'
                    : 'bg-[#18181B] border-[#27272A] hover:border-zinc-700/80 hover:bg-[#1C1C21]'
                }`}
              >
                {item.isCurrentUser && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8257E5]" />
                )}

                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Rank Number */}
                  <span className={`font-mono font-black text-sm w-6 text-center shrink-0 ${rankColor}`}>
                    {item.rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-tr ${item.avatarGradient} flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-inner`}
                  >
                    {item.initials}
                  </div>

                  {/* Name details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-bold truncate ${item.isCurrentUser ? 'text-white' : 'text-zinc-200'}`}>
                        {item.name}
                      </span>
                      {medal && <span className="text-xs shrink-0">{medal}</span>}
                      {item.isCurrentUser && (
                        <span className="text-[9px] uppercase font-black bg-[#8257E5] text-white px-1.5 py-0.5 rounded-md tracking-wider shrink-0">
                          Você
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-medium block truncate">
                      {item.completedCount} desafios concluídos
                    </span>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0 ml-3">
                  <div className={`font-mono font-black text-[13px] ${item.isCurrentUser ? 'text-[#00E5FF]' : 'text-zinc-200'}`}>
                    {item.xp.toLocaleString('pt-BR')} XP
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    acumulado
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ranking rule footer */}
      <div className="mt-5 pt-4 border-t border-dashed border-[#27272A] flex items-center justify-between relative z-10 font-sans">
        <span className="text-xs text-zinc-400 font-medium">
          Ordenado pelo <strong className="text-zinc-200">XP total acumulado</strong> dos alunos do curso.
        </span>
        <span className="text-xs font-mono font-bold text-zinc-400 shrink-0 ml-3">
          Seu XP: {userXp.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
};
