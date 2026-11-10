'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../../../components/MaterialIcon';
import { getMyLeagues, type LeagueStanding } from '../../../lib/challenges';

// Central 216 (auditoria do Designer, §5) — a seção "Liga" do Stitch
// v2 ("Liga Diamante #12") não existe como liga: as tiers reais são
// bronze/silver/gold (A4, league.service) e só quem tem o recurso
// `challenges-full` vê ligas (free recebe 403). Fail-closed: sem
// liga ativa, ou sem acesso, ou com a API fora, o card some inteiro
// — nunca um ranking inventado.
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

  return (
    <section
      aria-label="Sua liga"
      className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8257E5]/15 border border-[#8257E5]/40 text-[#996DFF]">
            <MaterialIcon name="emoji_events" className="text-[22px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              Liga {TIER_LABEL[league.tier] ?? league.tier}
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              {league.position}º de {league.participants} · {league.points} pontos
            </p>
          </div>
        </div>
        <Link
          href="/desafios"
          className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-colors text-decoration-none"
        >
          Ver ligas
        </Link>
      </div>
    </section>
  );
}
