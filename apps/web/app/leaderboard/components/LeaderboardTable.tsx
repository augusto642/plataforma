'use client';

import React from 'react';
import { bandForXp } from '../data';
import { LeaderboardUser } from '../types';

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  filterType: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ users }) => {
  if (users.length === 0) {
    return (
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-12 text-center my-6">
        <div className="text-3xl mb-3">🔍</div>
        <h3 className="text-lg font-bold text-white font-heading mb-1">
          Nenhum desenvolvedor encontrado
        </h3>
        <p className="text-xs text-zinc-400">
          Tente buscar por outro termo ou selecione outro filtro do ranking.
        </p>
      </div>
    );
  }

  const renderMovementIcon = (user: LeaderboardUser) => {
    if (user.movement === 'up') {
      return (
        <span className="text-[10px] font-mono text-[#04D361] font-bold flex items-center gap-0.5">
          ▲ {user.movementPlaces || 1}
        </span>
      );
    }
    if (user.movement === 'down') {
      return (
        <span className="text-[10px] font-mono text-[#F43F5E] font-bold flex items-center gap-0.5">
          ▼ {user.movementPlaces || 1}
        </span>
      );
    }
    return <span className="text-[10px] font-mono text-zinc-500 font-bold">—</span>;
  };

  // B38b — a "faixa" é derivada do XP total do usuário (apenas exibição).
  const renderBandBadge = (user: LeaderboardUser) => {
    const band = bandForXp(user.xp);
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border"
        style={{ borderColor: `${band.color}66` }}
      >
        <span>{band.icon}</span> {band.name}
      </span>
    );
  };

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#27272A] bg-[#181820]/70 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-16 text-center">Rank</th>
              <th className="py-3.5 px-4">Engenheiro / Trilha</th>
              <th className="py-3.5 px-4 text-center">Desafios Git</th>
              <th className="py-3.5 px-4 text-center">Ofensiva</th>
              <th className="py-3.5 px-4 text-right">XP Total</th>
              <th className="py-3.5 px-4 text-center">Faixa de XP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]/50 text-sm">
            {users.map((user) => {
              const isFirst = user.rank === 1;
              const isSecond = user.rank === 2;
              const isThird = user.rank === 3;
              const isCurrentUser = user.isCurrentUser;

              let rowBg = 'hover:bg-[#181820]/50 transition-colors';
              if (isCurrentUser) {
                rowBg = 'bg-[#8257E5]/10 hover:bg-[#8257E5]/15 border-l-4 border-l-[#8257E5] shadow-[inset_0_0_15px_rgba(130,87,229,0.15)]';
              }

              return (
                <tr key={user.id} className={`${rowBg}`}>
                  {/* Rank & Movement */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`font-mono font-black text-sm ${
                          isFirst
                            ? 'text-[#FFA116]'
                            : isSecond
                            ? 'text-[#E2E8F0]'
                            : isThird
                            ? 'text-[#CD7F32]'
                            : isCurrentUser
                            ? 'text-[#00E5FF]'
                            : 'text-zinc-300'
                        }`}
                      >
                        #{user.rank}
                      </span>
                      {renderMovementIcon(user)}
                    </div>
                  </td>

                  {/* User info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                          isCurrentUser
                            ? 'bg-[#8257E5]/30 border-[#8257E5] text-white shadow-[0_0_10px_rgba(130,87,229,0.5)]'
                            : isFirst
                            ? 'bg-[#FFA116]/20 border-[#FFA116]/60 text-[#FFA116]'
                            : isSecond
                            ? 'bg-[#E2E8F0]/20 border-[#E2E8F0]/60 text-white'
                            : isThird
                            ? 'bg-[#CD7F32]/20 border-[#CD7F32]/60 text-[#CD7F32]'
                            : 'bg-[#1E1E26] border-[#27272A] text-zinc-300'
                        }`}
                      >
                        {user.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              isCurrentUser ? 'text-[#00E5FF] font-black' : 'text-white'
                            }`}
                          >
                            {user.name}
                          </span>
                          {isCurrentUser && (
                            <span className="bg-[#8257E5] text-white text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded">
                              VOCÊ
                            </span>
                          )}
                          {isFirst && <span>👑</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-zinc-500">@{user.handle}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400 font-medium">{user.currentTrack}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Git Challenges */}
                  <td className="py-3.5 px-4 text-center font-mono text-xs text-zinc-300 font-semibold">
                    <span className="bg-[#181820] border border-[#27272A] px-2 py-1 rounded-lg">
                      💻 {user.gitSolvedCount} labs
                    </span>
                  </td>

                  {/* Streak */}
                  <td className="py-3.5 px-4 text-center font-mono text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
                        user.streakDays >= 10
                          ? 'bg-[#FFA116]/10 border-[#FFA116]/30 text-[#FFA116] font-bold'
                          : 'bg-[#181820] border-[#27272A] text-zinc-400'
                      }`}
                    >
                      🔥 {user.streakDays}d
                    </span>
                  </td>

                  {/* Total XP */}
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="font-black text-sm text-[#04D361]">
                      {user.xp.toLocaleString('pt-BR')} XP
                    </div>
                    <div className="text-[10px] text-zinc-500">acumulado</div>
                  </td>

                  {/* XP Band (derived from total XP — display only) */}
                  <td className="py-3.5 px-4 text-center">{renderBandBadge(user)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
