import { CareerTier, Plan } from '@prisma/client';

/**
 * B32 (Sprint 10) — matriz de entitlements por plano.
 *
 * Fonte única do que cada plano libera. Os valores espelham as promessas
 * REAIS da landing depois do saneamento (B31):
 * - Explorer (free): "Tutora de IA socrática no nível Iniciante".
 * - Pro: "Tutora de IA socrática em todas as trilhas e níveis".
 *
 * É também o desenho freemium definido pelo Augusto para a plataforma:
 * nível Iniciante grátis; Júnior/Pleno pagos.
 */
export interface PlanEntitlements {
  /**
   * Nível de carreira (CareerTier) mais alto em que a tutora de IA
   * responde para este plano. `null` = todos os níveis.
   */
  aiTutorMaxCareerTier: CareerTier | null;
}

export const PLAN_ENTITLEMENTS: Record<Plan, PlanEntitlements> = {
  free: { aiTutorMaxCareerTier: CareerTier.beginner },
  pro: { aiTutorMaxCareerTier: null },
};

const CAREER_TIER_RANK: Record<CareerTier, number> = {
  beginner: 0,
  junior: 1,
  mid: 2,
  senior: 3,
};

/** A tutora de IA está liberada para este plano neste nível de carreira? */
export function canUseAiTutor(plan: Plan, careerTier: CareerTier): boolean {
  const max = PLAN_ENTITLEMENTS[plan].aiTutorMaxCareerTier;
  if (max === null) return true;
  return CAREER_TIER_RANK[careerTier] <= CAREER_TIER_RANK[max];
}
