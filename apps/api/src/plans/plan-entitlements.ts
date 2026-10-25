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
 *
 * Fase 1 premium (desenho §1.1) — a matriz ganha um booleano por feature
 * paga. Carreira aparece aqui como tier nomeado, com os mesmos direitos
 * do Pro no desenho, MAS sem preço decidido e sem compra: o checkout
 * rejeita `career` até o Augusto decidir o preço (a lista de espera
 * PlanInterest segue válida para ele). Nada abaixo promete emprego,
 * "reconhecido pelo MEC" ou qualquer selo sem lastro.
 */

/** Escopo da revisão de código por IA liberado pelo plano. */
export type CodeReviewScope = 'none' | 'capstone' | 'all';

export interface PlanEntitlements {
  /**
   * Nível de carreira (CareerTier) mais alto em que a tutora de IA
   * responde para este plano. `null` = todos os níveis.
   */
  aiTutorMaxCareerTier: CareerTier | null;
  /** Certificado verificável com botão "Adicionar ao LinkedIn". */
  certificateLinkedIn: boolean;
  /** Simulador de entrevista com IA. */
  interviewSimulator: boolean;
  /** Revisão de código por IA: none | só projetos finais | todos. */
  codeReviewScope: CodeReviewScope;
  /** Desafios/ligas completos (free só participa, sem liga paga). */
  challengesFull: boolean;
  /** Comunidade: postar e revisar (free só lê). */
  communityPost: boolean;
  /** Mapa completo de gaps + recomendações (free: diagnóstico B09). */
  diagnosticFullMap: boolean;
  /** Talent Match: perfil destacado (só Carreira; Pro é só visível). */
  talentSpotlight: boolean;
  /** PWA/offline não é pago: liberado em todos os planos. */
  pwa: boolean;
  /** B2B não é plano de aluno: nunca liberado por plano. */
  b2b: boolean;
}

export const PLAN_ENTITLEMENTS: Record<Plan, PlanEntitlements> = {
  free: {
    aiTutorMaxCareerTier: CareerTier.beginner,
    certificateLinkedIn: false,
    interviewSimulator: false,
    codeReviewScope: 'none',
    challengesFull: false,
    communityPost: false,
    diagnosticFullMap: false,
    talentSpotlight: false,
    pwa: true,
    b2b: false,
  },
  pro: {
    aiTutorMaxCareerTier: null,
    certificateLinkedIn: true,
    interviewSimulator: true,
    codeReviewScope: 'capstone',
    challengesFull: true,
    communityPost: true,
    diagnosticFullMap: true,
    talentSpotlight: false,
    pwa: true,
    b2b: false,
  },
  career: {
    aiTutorMaxCareerTier: null,
    certificateLinkedIn: true,
    interviewSimulator: true,
    codeReviewScope: 'all',
    challengesFull: true,
    communityPost: true,
    diagnosticFullMap: true,
    talentSpotlight: true,
    pwa: true,
    b2b: false,
  },
};

/** Nomes de feature aceitos pelo FeatureGuard / assertFeature. */
export type PremiumFeature =
  | 'certificate-linkedin'
  | 'interview-simulator'
  | 'code-review'
  | 'challenges-full'
  | 'community-post'
  | 'diagnostic-full-map'
  | 'talent-spotlight';

export const PREMIUM_FEATURES: readonly PremiumFeature[] = [
  'certificate-linkedin',
  'interview-simulator',
  'code-review',
  'challenges-full',
  'community-post',
  'diagnostic-full-map',
  'talent-spotlight',
];

/** A feature está liberada para este plano, pela matriz acima? */
export function planHasFeature(plan: Plan, feature: PremiumFeature): boolean {
  const ent = PLAN_ENTITLEMENTS[plan];
  switch (feature) {
    case 'certificate-linkedin':
      return ent.certificateLinkedIn;
    case 'interview-simulator':
      return ent.interviewSimulator;
    case 'code-review':
      return ent.codeReviewScope !== 'none';
    case 'challenges-full':
      return ent.challengesFull;
    case 'community-post':
      return ent.communityPost;
    case 'diagnostic-full-map':
      return ent.diagnosticFullMap;
    case 'talent-spotlight':
      return ent.talentSpotlight;
  }
}

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
