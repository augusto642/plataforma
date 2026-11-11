// Central 216 (F3) — "Missões de Hoje" com dados REAIS ou omitidas
// (fail-closed). Fontes:
// - GET /submissions (createdAt real): desafios resolvidos hoje;
// - GET /interview/sessions/me (createdAt real): simulação feita hoje.
// O heatmap e a meta semanal do dashboard NÃO servem: os dias do
// heatmap são do molde (generateInitialHeatmapDays, "Dia N" com
// padrão aleatório) e a meta semanal nunca é sobrescrita com dado
// real — derivar "hoje" deles seria inventar (A3).

export interface DailyMission {
  id: 'challenges' | 'streak' | 'interview';
  title: string;
  done: boolean;
  /** Progresso legível, ex.: "1/2 hoje". */
  detail: string;
}

/** Data local (fuso do navegador) em YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Quantos itens têm createdAt no dia local de `now`. */
export function countCreatedToday(
  items: Array<{ createdAt?: string | null }>,
  now: Date = new Date(),
): number {
  const today = todayKey(now);
  let count = 0;
  for (const item of items) {
    if (!item?.createdAt) continue;
    const at = new Date(item.createdAt);
    if (Number.isNaN(at.getTime())) continue;
    if (todayKey(at) === today) count++;
  }
  return count;
}

const CHALLENGES_TARGET = 2;

/**
 * Deriva as missões do dia. `includeInterview` é false quando a lista
 * de sessões não pôde ser carregada (403 free / API fora): a missão
 * some em vez de fingir "Pendente" sem base.
 */
export function deriveDailyMissions(input: {
  submissionsToday: number;
  interviewDoneToday: boolean;
  includeInterview: boolean;
}): DailyMission[] {
  const missions: DailyMission[] = [
    {
      id: 'challenges',
      title: 'Resolver 2 desafios no editor',
      done: input.submissionsToday >= CHALLENGES_TARGET,
      detail: `${Math.min(input.submissionsToday, CHALLENGES_TARGET)}/${CHALLENGES_TARGET} hoje`,
    },
    {
      id: 'streak',
      title: 'Manter streak ativo',
      done: input.submissionsToday > 0,
      detail:
        input.submissionsToday > 0
          ? 'Atividade registrada hoje'
          : 'Nenhuma submissão hoje ainda',
    },
  ];
  if (input.includeInterview) {
    missions.push({
      id: 'interview',
      title: 'Fazer 1 simulação de entrevista',
      done: input.interviewDoneToday,
      detail: input.interviewDoneToday ? 'Simulação feita hoje' : 'Ainda não feita hoje',
    });
  }
  return missions;
}
