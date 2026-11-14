'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../../../components/MaterialIcon';
import { getMyLeagues, type LeagueStanding } from '../../../lib/challenges';

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
};

export function LeagueCard() {
  const [league, setLeague] = useState<LeagueStanding | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const leagues = await getMyLeagues();
        if (!cancelled && Array.isArray(leagues) && leagues.length > 0) {
          setLeague(leagues[0]);
        }
      } catch {
        // Sem acesso (403), sem liga ou API fora: omitir o card.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!league) return null;

  const tierName = TIER_LABEL[league.tier] ?? league.tier;

  return (
    <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#1C2338]">
        <div className="flex items-center gap-2">
          <MaterialIcon name="shield" className="text-[#FFA116] text-[20px]" />
          <h4 className="font-brand font-bold text-white text-sm">Sua Liga: {tierName}</h4>
        </div>
        <span className="text-[11px] font-mono text-[#94A3B8]">Semanal</span>
      </div>

      {/* Status do Aluno na Liga */}
      <div className="p-3 rounded-xl bg-[#121624] border border-[#1C2338] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-[#8257E5] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
            #{league.position}
          </span>
          <div>
            <div className="text-xs font-bold text-white">Posição na rodada</div>
            <div className="text-[10px] font-mono text-[#04D361]">
              {league.position <= 3 ? 'Zona de promoção' : 'Em disputa'}
            </div>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-[#00E5FF] shrink-0">
          {league.points} pts
        </span>
      </div>

      <div className="text-[11px] font-mono text-[#94A3B8] flex items-center justify-between px-1">
        <span>{league.participants} competidores</span>
        <Link href="/leaderboard" className="text-[#04D361] hover:underline font-semibold">
          Ver classificação completa →
        </Link>
      </div>
    </div>
  );
}
