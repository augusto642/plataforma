'use client';

import React from 'react';
import { bandForXp } from '../data';
import type { LeaderboardDisplayUser } from '../types';
import { MaterialIcon } from '../../../components/MaterialIcon';

interface LeaderboardTableProps {
  users: LeaderboardDisplayUser[];
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ users }) => {
  if (users.length === 0) {
    return (
      <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-12 text-center my-6 shadow-xl">
        <div className="text-3xl mb-3">🔍</div>
        <h3 className="text-lg font-bold text-white font-brand mb-1">
          Nenhum desenvolvedor encontrado
        </h3>
        <p className="text-xs text-[#94A3B8]">
          Não encontramos nenhum aluno correspondente a essa busca no ranking atual.
        </p>
      </div>
    );
  }

  const renderBandBadge = (user: LeaderboardDisplayUser) => {
    const band = bandForXp(user.xp);
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#141927] text-white border shadow-sm"
        style={{ borderColor: `${band.color}77` }}
      >
        <span>{band.icon}</span>
        <span style={{ color: band.color }}>{band.name.replace('Faixa ', '')}</span>
      </span>
    );
  };

  const badgeSummary = (user: LeaderboardDisplayUser) => {
    if (user.badges.length === 0) return 'Recruta sem insígnias';
    const first = user.badges[0];
    const extra = user.badges.length > 1 ? ` +${user.badges.length - 1}` : '';
    return `${first.icon || '🏅'} ${first.title}${extra}`;
  };

  return (
    <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[#1A2133] bg-[#121624] text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">
              <th className="py-4 px-4 w-16 text-center">Posição</th>
              <th className="py-4 px-4">Desenvolvedor</th>
              <th className="py-4 px-4 text-center">Nível</th>
              <th className="py-4 px-4 text-center">Missões Feitas</th>
              <th className="py-4 px-4 text-center">Ofensiva</th>
              <th className="py-4 px-4 text-right">XP Total</th>
              <th className="py-4 px-4 text-center">Liga / Maestria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2133] text-sm">
            {users.map((user) => {
              const isFirst = user.rank === 1;
              const isSecond = user.rank === 2;
              const isThird = user.rank === 3;
              const isCurrentUser = user.isCurrentUser;

              let rowBg = 'hover:bg-[#121624]/60 transition-colors bg-[#0C0F17]';
              if (isCurrentUser) {
                rowBg = 'bg-[#8257E5]/15 hover:bg-[#8257E5]/20 border-l-4 border-l-[#8257E5] shadow-[inset_0_0_20px_rgba(130,87,229,0.15)]';
              }

              return (
                <tr key={user.id} className={rowBg}>
                  {/* Posição */}
                  <td className="py-4 px-4 text-center">
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
                                : 'text-[#64748B]'
                      }`}
                    >
                      #{user.rank}
                    </span>
                  </td>

                  {/* Nome e Avatar */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                          isCurrentUser
                            ? 'bg-[#8257E5] border-[#A379FF] text-white shadow-[0_0_12px_rgba(130,87,229,0.6)]'
                            : isFirst
                              ? 'bg-[#FFA116]/20 border-[#FFA116]/70 text-[#FFA116]'
                              : isSecond
                                ? 'bg-[#E2E8F0]/20 border-[#E2E8F0]/70 text-white'
                                : isThird
                                  ? 'bg-[#CD7F32]/20 border-[#CD7F32]/70 text-[#CD7F32]'
                                  : 'bg-[#151B2B] border-[#1E273D] text-[#94A3B8]'
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
                            <span className="bg-[#8257E5] text-white text-[9px] font-mono font-black px-1.5 py-0.5 rounded shadow">
                              VOCÊ
                            </span>
                          )}
                          {isFirst && <span>👑</span>}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5 flex items-center gap-1.5">
                          <span>{badgeSummary(user)}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Nível */}
                  <td className="py-4 px-4 text-center font-mono text-xs text-[#CBD5E1]">
                    <span className="px-2 py-0.5 rounded bg-[#151B2B] border border-[#1E273D]">
                      Nv. {user.level}
                    </span>
                  </td>

                  {/* Missões Concluídas */}
                  <td className="py-4 px-4 text-center font-mono text-xs text-[#CBD5E1] font-semibold">
                    <span className="bg-[#151B2B] border border-[#1E273D] px-2.5 py-1 rounded-lg">
                      {user.completedActivitiesCount}
                    </span>
                  </td>

                  {/* Ofensiva (Streak) */}
                  <td className="py-4 px-4 text-center font-mono text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
                        user.streakDays >= 5
                          ? 'bg-[#FFA116]/10 border-[#FFA116]/40 text-[#FFA116] font-bold'
                          : 'bg-[#151B2B] border-[#1E273D] text-[#64748B]'
                      }`}
                    >
                      🔥 {user.streakDays}d
                    </span>
                  </td>

                  {/* XP Total */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-mono font-black text-sm text-[#00E5FF]">
                      {user.xp.toLocaleString('pt-BR')}{' '}
                      <span className="text-[10px] text-[#64748B]">XP</span>
                    </div>
                  </td>

                  {/* Faixa / Liga */}
                  <td className="py-4 px-4 text-center">
                    {renderBandBadge(user)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
