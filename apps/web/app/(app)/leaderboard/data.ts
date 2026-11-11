import type { XpBandInfo } from './types';

// B38b (Sprint 11) / fechamento na Sprint 12 — faixas de EXIBIÇÃO
// derivadas do XP total acumulado. Não são ligas: não há temporada,
// rodada, promoção nem rebaixamento no produto. O ranking real da API
// (GET /courses/:id/leaderboard) é por curso e ordenado por XP total;
// estas faixas só agrupam a pontuação para leitura.
export const XP_BANDS: XpBandInfo[] = [
  {
    band: 'bronze',
    name: 'Faixa Bronze',
    rangeLabel: '0–1.499 XP',
    icon: '🥉',
    color: '#CD7F32',
    accentBorder: 'border-[#CD7F32]/50',
    minXp: 0,
    description: 'Início da jornada: primeiros desafios e fundamentos.',
  },
  {
    band: 'silver',
    name: 'Faixa Prata',
    rangeLabel: '1.500–3.499 XP',
    icon: '🥈',
    color: '#E2E8F0',
    accentBorder: 'border-[#E2E8F0]/50',
    minXp: 1500,
    description: 'Fundamentos consolidados e prática constante.',
  },
  {
    band: 'gold',
    name: 'Faixa Ouro',
    rangeLabel: '3.500–5.999 XP',
    icon: '🥇',
    color: '#FFA116',
    accentBorder: 'border-[#FFA116]/60',
    minXp: 3500,
    description: 'Boa cadência de desafios concluídos e projetos.',
  },
  {
    band: 'platinum',
    name: 'Faixa Platina',
    rangeLabel: '6.000–9.499 XP',
    icon: '💠',
    color: '#00E5FF',
    accentBorder: 'border-[#00E5FF]/60',
    minXp: 6000,
    description: 'Ritmo avançado de prática e consistência.',
  },
  {
    band: 'diamond',
    name: 'Faixa Diamante',
    rangeLabel: '9.500–13.999 XP',
    icon: '💎',
    color: '#8257E5',
    accentBorder: 'border-[#8257E5]/70',
    minXp: 9500,
    description: 'Pontuação alta acumulada em desafios e projetos.',
  },
  {
    band: 'master',
    name: 'Faixa Mestre',
    rangeLabel: '14.000–19.999 XP',
    icon: '🔮',
    color: '#EC4899',
    accentBorder: 'border-[#EC4899]/70',
    minXp: 14000,
    description: 'Entre as maiores pontuações acumuladas da comunidade.',
  },
  {
    band: 'challenger',
    name: 'Faixa Challenger',
    rangeLabel: '20.000+ XP',
    icon: '👑',
    color: '#04D361',
    accentBorder: 'border-[#04D361]/80',
    minXp: 20000,
    description: 'O topo do ranking de XP acumulado da plataforma.',
  },
];

/** Faixa de exibição de um XP total (última faixa cujo minXp foi atingido). */
export function bandForXp(xp: number): XpBandInfo {
  let current = XP_BANDS[0];
  for (const band of XP_BANDS) {
    if (xp >= band.minXp) current = band;
  }
  return current;
}
