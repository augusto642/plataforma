// Trilha dinâmica v1 (Central 209 — DESIGN D1/D2): regras DETERMINÍSTICAS
// de sugestão de trilha + pontuação de sinais de mercado.
//
// TODAS as regras são puras e testadas em dynamic-track.rules.spec.ts.
// Não há score oculto, probabilidade nem LLM sugerindo livremente: um LLM
// sugerindo trilha arrisca inventar dado de mercado — o modo de falha da
// auditoria 07/11. A sugestão é uma função de (perfil + diagnóstico +
// hint da landing) → 1 das 4 trilhas; cada sugestão grava `reasons[]`
// (quais entradas pesaram) e o texto ao aluno é montado por templates
// a partir deles, nunca por redação livre sobre mercado.
//
// Precedência (v1, documentada e ajustável — Q3 da spec last30days):
//   1. diagnóstico (quiz B09: o arquétipo já mapeia para uma trilha);
//   2. hint da landing (?track=: interesse declarado, NÃO escolha);
//   3. objetivo de carreira (tabela abaixo, derivada da descrição de
//      cada objetivo no StepGoals — não de dado de mercado);
//   4. fallback: frontend (a rampa de entrada — o mesmo default do
//      arquétipo "explorador" do diagnóstico).
// O nível de experiência (expLevel) é CONTEXTO registrado no snapshot:
// em v1 ele não decide a trilha sozinho (nenhuma evidência sustenta que
// "sênior → IA" ou similar) — ele aparece no rationale como contexto e
// pode virar decider numa revisão futura com lastro.

import { TRACK_NAMES, type TrackId } from '../diagnostic/data/quiz-v1';

export type { TrackId };
export { TRACK_NAMES };

export type ExperienceLevel = 'beginner' | 'junior' | 'mid' | 'senior';
export type TimeCommitment = '5h' | '10h' | '20h';

export const CAREER_GOALS = [
  'frontend',
  'backend',
  'ai',
  'fullstack',
  'architect',
  'devops',
  'data_science',
  'data_engineering',
  'design',
  'freelancer',
  'mobile',
  'security',
  'qa',
  'global',
  'lead',
  'startup',
  'hackathons',
  'mlops',
  'platform_engineering',
  'cloud_architect',
  'gamedev',
  'blockchain',
  'embedded_iot',
  'automation_rpa',
  'product_manager',
] as const;

export type CareerGoal = (typeof CAREER_GOALS)[number];

export function isCareerGoal(value: unknown): value is CareerGoal {
  return typeof value === 'string' && (CAREER_GOALS as readonly string[]).includes(value);
}

/** Base da sugestão: o que sustentou a recomendação. */
export type SuggestionBasis = 'profile-only' | 'profile+market';

export interface TrackSuggestionInput {
  expLevel?: ExperienceLevel | null;
  timeCommitment?: TimeCommitment | null;
  careerGoal?: CareerGoal | null;
  careerGoals?: CareerGoal[] | null;
  /** Hint da landing (?track=): interesse declarado, não escolha. */
  sourceTrack?: TrackId | null;
  /** Trilha recomendada pelo quiz diagnóstico (arquétipo), quando houver. */
  diagnosticTrackId?: TrackId | null;
  /** Tecnologia principal escolhida pelo aluno no cadastro. */
  primaryTechnology?: string | null;
  hasProgrammedBefore?: boolean | null;
  priorLanguage?: string | null;
}

/** Códigos de motivo — o que a API persiste em `rationale.reasons`. */
export type SuggestionReason =
  | 'diagnostic'
  | 'landing-hint'
  | 'career-goal:frontend'
  | 'career-goal:backend'
  | 'career-goal:ai'
  | 'career-goal:fullstack'
  | 'career-goal:architect'
  | 'career-goal:devops'
  | 'career-goal:data_science'
  | 'career-goal:data_engineering'
  | 'career-goal:design'
  | 'career-goal:freelancer'
  | 'career-goal:mobile'
  | 'career-goal:security'
  | 'career-goal:qa'
  | 'career-goal:global'
  | 'career-goal:lead'
  | 'career-goal:startup'
  | 'career-goal:hackathons'
  | 'career-goal:mlops'
  | 'career-goal:platform_engineering'
  | 'career-goal:cloud_architect'
  | 'career-goal:gamedev'
  | 'career-goal:blockchain'
  | 'career-goal:embedded_iot'
  | 'career-goal:automation_rpa'
  | 'career-goal:product_manager'
  | 'primary-technology'
  | 'default-entry';

/**
 * Objetivo de carreira → trilha (v1). Cada linha deriva da descrição do
 * próprio objetivo no cadastro (StepGoals), não de dado de mercado:
 * - global: vaga internacional/remota — frontend é a porta de entrada
 *   mais ampla para a web (mesma rampa do arquétipo "explorador");
 * - lead: arquitetura distribuída, code review, mentoria → backend;
 * - startup: "criar produtos com stack moderna e Web3" (descrição do
 *   objetivo) → web3;
 * - hackathons: construir rápido e iterar na tela → frontend;
 * - objetivos específicos de área apontam para a trilha master mais aderente.
 */
export const CAREER_GOAL_TO_TRACK: Record<CareerGoal, TrackId> = {
  frontend: 'frontend',
  backend: 'backend',
  ai: 'ai',
  fullstack: 'frontend',
  architect: 'backend',
  devops: 'backend',
  data_science: 'ai',
  data_engineering: 'ai',
  design: 'frontend',
  freelancer: 'frontend',
  mobile: 'frontend',
  security: 'backend',
  qa: 'backend',
  global: 'frontend',
  lead: 'backend',
  startup: 'web3',
  hackathons: 'frontend',
  mlops: 'ai',
  platform_engineering: 'backend',
  cloud_architect: 'backend',
  gamedev: 'frontend',
  blockchain: 'web3',
  embedded_iot: 'backend',
  automation_rpa: 'ai',
  product_manager: 'frontend',
};

export const CAREER_GOAL_LABELS: Record<CareerGoal, string> = {
  frontend: 'Front-end',
  backend: 'Back-end',
  ai: 'Inteligência Artificial',
  fullstack: 'Full-stack',
  architect: 'Arquitetura de Software',
  devops: 'DevOps & Infraestrutura',
  data_science: 'Ciência de Dados',
  data_engineering: 'Engenharia de Dados',
  design: 'Design & Tecnologia',
  freelancer: 'Freelancer',
  mobile: 'Desenvolvimento Mobile',
  security: 'Segurança da Informação',
  qa: 'Qualidade & QA',
  global: 'Vaga Internacional',
  lead: 'Liderança Técnica',
  startup: 'Startup',
  hackathons: 'Hackathons',
  mlops: 'MLOps',
  platform_engineering: 'Platform Engineering',
  cloud_architect: 'Cloud Architect',
  gamedev: 'Game Developer',
  blockchain: 'Blockchain / Web3',
  embedded_iot: 'Sistemas Embarcados & IoT',
  automation_rpa: 'Automação, Bots & RPA',
  product_manager: 'Product Manager',
};

/**
 * Afinidades explícitas e determinísticas de cada objetivo de carreira para
 * as trilhas (substitui o colapso cego em `careerGoals[0]` quando há múltiplos
 * objetivos ou escolha de stack técnica). Objetivos abrangentes (fullstack,
 * global, freelancer, product_manager) têm peso moderado entre front/back para
 * permitir que outros objetivos marcados ou a `primaryTechnology` inclinem a
 * recomendação de forma fiel ao perfil do aluno.
 */
export const GOAL_TRACK_AFFINITY: Record<
  CareerGoal,
  Partial<Record<TrackId, number>>
> = {
  frontend: { frontend: 4 },
  design: { frontend: 3.5 },
  mobile: { frontend: 3, backend: 0.5 },
  gamedev: { frontend: 3 },
  hackathons: { frontend: 2.5, ai: 0.5 },
  backend: { backend: 4 },
  architect: { backend: 3.5 },
  devops: { backend: 3.5 },
  platform_engineering: { backend: 3.5 },
  cloud_architect: { backend: 3.5 },
  security: { backend: 3.5 },
  qa: { backend: 3 },
  lead: { backend: 3.5 },
  embedded_iot: { backend: 3.5 },
  ai: { ai: 4 },
  mlops: { ai: 3.5, backend: 1 },
  data_science: { ai: 4 },
  data_engineering: { ai: 3, backend: 1.5 },
  automation_rpa: { ai: 3, backend: 1 },
  blockchain: { web3: 4 },
  startup: { web3: 2.5, backend: 0.5, frontend: 0.5 },
  fullstack: { frontend: 2.0, backend: 2.0 },
  global: { frontend: 1.5, backend: 1.2 },
  freelancer: { frontend: 1.5, backend: 1.2 },
  product_manager: { frontend: 1.5, ai: 1.0 },
};

/** Peso da stack/tecnologia principal escolhida pelo aluno na Etapa 4. */
export const TECH_TRACK_AFFINITY: Record<
  string,
  Partial<Record<TrackId, number>>
> = {
  javascript: { frontend: 2.5 },
  typescript: { frontend: 2.0, backend: 1.0 },
  'react-nextjs': { frontend: 3.0 },
  react: { frontend: 3.0 },
  nextjs: { frontend: 3.0 },
  'next.js': { frontend: 3.0 },
  'mobile-rn-flutter': { frontend: 2.5 },
  python: { ai: 2.5, backend: 2.0 },
  'sql-data': { ai: 2.5, backend: 1.5 },
  sql: { ai: 2.5, backend: 1.5 },
  go: { backend: 3.0 },
  golang: { backend: 3.0 },
  java: { backend: 3.0 },
  csharp: { backend: 2.5 },
  'c#': { backend: 2.5 },
  nodejs: { backend: 2.5, frontend: 0.5 },
  node: { backend: 2.5, frontend: 0.5 },
  'node.js': { backend: 2.5, frontend: 0.5 },
  'docker-cloud': { backend: 3.0 },
  docker: { backend: 3.0 },
  cloud: { backend: 2.5 },
  php: { backend: 2.5 },
  laravel: { backend: 2.5 },
  rust: { backend: 2.5, web3: 1.5 },
};

const PRIOR_LANG_TRACK_AFFINITY: Record<
  string,
  Partial<Record<TrackId, number>>
> = {
  python: { ai: 0.8, backend: 0.6 },
  go: { backend: 0.8 },
  java: { backend: 0.8 },
  csharp: { backend: 0.8 },
  php: { backend: 0.8 },
  sql: { backend: 0.8 },
  rust: { backend: 0.8 },
  javascript: { frontend: 0.8 },
  typescript: { frontend: 0.8 },
};

const TRACK_TIE_BREAK_ORDER: TrackId[] = ['frontend', 'backend', 'ai', 'web3'];

function isMeaningfulTech(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== 'undecided';
}

function addScores(
  scores: Record<TrackId, number>,
  weights: Partial<Record<TrackId, number>> | undefined,
  multiplier = 1,
): void {
  if (!weights) return;
  for (const trackId of TRACK_TIE_BREAK_ORDER) {
    const val = weights[trackId];
    if (typeof val === 'number') {
      scores[trackId] += val * multiplier;
    }
  }
}

export const DEFAULT_TRACK: TrackId = 'frontend';

export interface TrackSuggestion {
  track: TrackId;
  trackName: string;
  reasons: SuggestionReason[];
}

/**
 * Função pura de sugestão. Determinística: mesma entrada → mesma saída.
 * Precedência:
 * 1. Diagnóstico completo (`diagnosticTrackId`);
 * 2. Perfil explícito ponderado (todos `careerGoals` + `primaryTechnology` + `priorLanguage`,
 *    com `sourceTrack` entrando apenas como desempate suave);
 * 3. Hint da landing (`sourceTrack`);
 * 4. Fallback (`frontend`).
 */
export function suggestTrack(input: TrackSuggestionInput): TrackSuggestion {
  const hasTech = isMeaningfulTech(input.primaryTechnology);
  const orderedGoals = Array.from(
    new Set<CareerGoal>([
      ...(input.careerGoal && isCareerGoal(input.careerGoal)
        ? [input.careerGoal]
        : []),
      ...(input.careerGoals ?? []).filter(isCareerGoal),
    ]),
  );

  if (input.diagnosticTrackId) {
    const reasons: SuggestionReason[] = ['diagnostic'];
    if (hasTech) reasons.push('primary-technology');
    return {
      track: input.diagnosticTrackId,
      trackName: TRACK_NAMES[input.diagnosticTrackId],
      reasons,
    };
  }

  if (orderedGoals.length > 0 || hasTech) {
    const scores: Record<TrackId, number> = {
      frontend: 0,
      backend: 0,
      ai: 0,
      web3: 0,
    };

    orderedGoals.forEach((goal, index) => {
      const multiplier = index === 0 ? 1.0 : 0.6;
      addScores(scores, GOAL_TRACK_AFFINITY[goal], multiplier);
    });

    if (hasTech) {
      const techKey = input.primaryTechnology!.trim().toLowerCase();
      addScores(scores, TECH_TRACK_AFFINITY[techKey]);
    }

    if (input.priorLanguage) {
      const priorKey = input.priorLanguage.trim().toLowerCase();
      addScores(scores, PRIOR_LANG_TRACK_AFFINITY[priorKey]);
    }

    const primaryGoal = orderedGoals[0] ?? null;
    const primaryFallbackTrack = primaryGoal
      ? CAREER_GOAL_TO_TRACK[primaryGoal]
      : null;

    const sortedTracks = [...TRACK_TIE_BREAK_ORDER].sort((a, b) => {
      const diff = scores[b] - scores[a];
      if (Math.abs(diff) > 1e-6) return diff;
      if (primaryFallbackTrack) {
        if (a === primaryFallbackTrack) return -1;
        if (b === primaryFallbackTrack) return 1;
      }
      if (input.sourceTrack) {
        if (a === input.sourceTrack) return -1;
        if (b === input.sourceTrack) return 1;
      }
      return (
        TRACK_TIE_BREAK_ORDER.indexOf(a) - TRACK_TIE_BREAK_ORDER.indexOf(b)
      );
    });

    const winningTrack =
      scores[sortedTracks[0]] > 0
        ? sortedTracks[0]
        : (primaryFallbackTrack ?? input.sourceTrack ?? DEFAULT_TRACK);

    const reasons: SuggestionReason[] = [];
    if (orderedGoals.length > 0) {
      let bestGoalForWinner = orderedGoals[0];
      if (CAREER_GOAL_TO_TRACK[bestGoalForWinner] !== winningTrack) {
        let bestGoalScore = -1;
        for (const goal of orderedGoals) {
          const affinity = GOAL_TRACK_AFFINITY[goal]?.[winningTrack] ?? 0;
          if (affinity > bestGoalScore) {
            bestGoalScore = affinity;
            bestGoalForWinner = goal;
          }
        }
      }
      reasons.push(`career-goal:${bestGoalForWinner}` as SuggestionReason);
    }

    if (hasTech) {
      reasons.push('primary-technology');
    } else if (reasons.length === 0) {
      reasons.push('default-entry');
    }

    return {
      track: winningTrack,
      trackName: TRACK_NAMES[winningTrack],
      reasons,
    };
  }

  if (input.sourceTrack) {
    return {
      track: input.sourceTrack,
      trackName: TRACK_NAMES[input.sourceTrack],
      reasons: ['landing-hint'],
    };
  }

  return {
    track: DEFAULT_TRACK,
    trackName: TRACK_NAMES[DEFAULT_TRACK],
    reasons: ['default-entry'],
  };
}

/** Texto ao aluno para cada motivo (template — nunca redação livre). */
export const REASON_TEXTS: Record<SuggestionReason, string> = {
  diagnostic:
    'O quiz diagnóstico apontou afinidade com esta área.',
  'landing-hint':
    'Você demonstrou interesse por esta área ao chegar na plataforma.',
  'career-goal:frontend':
    'Seu objetivo é atuar em desenvolvimento Front-end — esta trilha aprofunda interfaces modernas, arquitetura web e experiência do usuário.',
  'career-goal:backend':
    'Seu objetivo é atuar em desenvolvimento Back-end — esta trilha cobre APIs, arquitetura, persistência e sistemas escaláveis.',
  'career-goal:ai':
    'Seu objetivo é trabalhar com Inteligência Artificial — esta trilha cobre automação inteligente, agentes e engenharia aplicada de IA.',
  'career-goal:fullstack':
    'Seu objetivo é atuar como Full-stack — começamos pela base web completa para conectar interface, lógica de aplicação e serviços.',
  'career-goal:architect':
    'Seu objetivo é evoluir para Arquitetura de Software — esta trilha aprofunda sistemas distribuídos, contratos e decisões estruturais.',
  'career-goal:devops':
    'Seu objetivo é atuar em DevOps & Infraestrutura — esta trilha fortalece a base de serviços, automação e confiabilidade em produção.',
  'career-goal:data_science':
    'Seu objetivo é atuar em Ciência de Dados — esta trilha conecta modelagem analítica, dados e aplicações de inteligência artificial.',
  'career-goal:data_engineering':
    'Seu objetivo é atuar em Engenharia de Dados — esta trilha prepara a base de fluxos de dados, processamento e pipelines de IA.',
  'career-goal:design':
    'Seu objetivo une Design e Tecnologia — esta trilha dá domínio prático para transformar interfaces e protótipos em produtos reais.',
  'career-goal:freelancer':
    'Seu objetivo é atuar como Freelancer — esta trilha permite construir e entregar produtos web completos com agilidade.',
  'career-goal:mobile':
    'Seu objetivo é desenvolvimento Mobile — esta trilha constrói a base de interfaces reativas, estado e arquitetura de aplicativos.',
  'career-goal:security':
    'Seu objetivo é Segurança da Informação — esta trilha cobre fundamentos de back-end, proteção de APIs, autenticação e sistemas resilientes.',
  'career-goal:qa':
    'Seu objetivo é Qualidade & QA — esta trilha fortalece leitura de sistemas, contratos de API e verificação automatizada.',
  'career-goal:global':
    'Seu objetivo é uma vaga internacional — esta trilha é a porta de entrada mais ampla para a web.',
  'career-goal:lead':
    'Seu objetivo é evoluir para liderança técnica — esta trilha cobre arquitetura e sistemas distribuídos.',
  'career-goal:startup':
    'Seu objetivo é construir sua própria startup — esta trilha cobre a stack de produtos descentralizados.',
  'career-goal:hackathons':
    'Seu objetivo é competir em hackathons — esta trilha permite construir e iterar rápido na tela.',
  'career-goal:mlops':
    'Seu objetivo é atuar em MLOps — esta trilha cobre automação de fluxos, publicação e operação de modelos de inteligência artificial.',
  'career-goal:platform_engineering':
    'Seu objetivo é Engenharia de Plataforma — esta trilha aprofunda serviços internos, automação e confiabilidade de sistemas.',
  'career-goal:cloud_architect':
    'Seu objetivo é Arquitetura Cloud — esta trilha fortalece a base de sistemas distribuídos, serviços em nuvem e escalabilidade.',
  'career-goal:gamedev':
    'Seu objetivo é desenvolvimento de Jogos (Game Developer) — esta trilha constrói a base de lógica interativa, renderização e experiência em tempo real.',
  'career-goal:blockchain':
    'Seu objetivo é atuar com Blockchain e Web3 — esta trilha cobre contratos inteligentes, protocolos descentralizados e aplicações Web3.',
  'career-goal:embedded_iot':
    'Seu objetivo é Sistemas Embarcados & IoT — esta trilha fortalece arquitetura de serviços, protocolos de comunicação e integração de dispositivos.',
  'career-goal:automation_rpa':
    'Seu objetivo é Automação, Bots & RPA — esta trilha cobre agentes inteligentes, orquestração de processos e automação aplicada.',
  'career-goal:product_manager':
    'Seu objetivo é Product Manager — esta trilha dá base prática de construção web, experiência do usuário e fluxo de entrega de produto.',
  'primary-technology':
    'Sua tecnologia principal selecionada entra como contexto prático nos desafios recomendados.',
  'default-entry':
    'Sem um sinal mais forte no seu perfil, começamos pela base da web — você pode fazer cursos avulsos quando quiser.',
};

/** Monta o rationale legível da sugestão a partir de reasons[] + basis. */
export function buildRationaleText(
  reasons: SuggestionReason[],
  basis: SuggestionBasis,
  options?: {
    primaryTechnology?: string | null;
    careerGoals?: CareerGoal[] | null;
  },
): string {
  const tech = options?.primaryTechnology?.trim();
  const hasRealTech = Boolean(tech && tech.toLowerCase() !== 'undecided');
  const parts = reasons.map((r) => {
    if (r === 'primary-technology') {
      if (hasRealTech && tech) {
        return `Sua tecnologia principal selecionada (${tech}) entra como contexto prático nos desafios recomendados.`;
      }
      return 'Como você optou por ajuda para escolher a tecnologia, a trilha define a stack inicial por você.';
    }
    return REASON_TEXTS[r];
  });
  const uniqueGoals = Array.from(
    new Set((options?.careerGoals ?? []).filter(isCareerGoal)),
  );
  if (uniqueGoals.length > 1) {
    const labels = uniqueGoals.map((goal) => CAREER_GOAL_LABELS[goal]).join(', ');
    parts.push(
      `Também consideramos seus múltiplos objetivos selecionados (${labels}) para contextualizar as próximas recomendações.`,
    );
  }
  if (basis === 'profile-only') {
    parts.push(
      'A sugestão usou só o seu perfil: nenhuma fonte de mercado estava disponível no momento.',
    );
  } else {
    parts.push(
      'A sugestão considerou também sinais de mercado verificados, listados abaixo com fonte e data.',
    );
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Sinais de mercado — spec last30days §6/§7 (pesos default, ajustáveis)
// ---------------------------------------------------------------------------

/** Limiar da spec §7: >= 70 vira evidência anexada à sugestão. */
export const MARKET_EVIDENCE_THRESHOLD = 70;

/** Janela de vagas da trilha: 2 anos (DESIGN D2, TRACK_WINDOW_DAYS). */
export const TRACK_WINDOW_DAYS = 730;

/** Janela de recência do sinal last30days: 30 dias na data da fonte. */
export const MARKET_SIGNAL_RECENCY_DAYS = 30;

export interface MarketSignalScoreInput {
  /** Fonte oficial (docs/release notes): 50. */
  isOfficialSource: boolean;
  /** Segunda fonte independente confirmando: 25. */
  confirmedBySecondSource: boolean;
  /** Afeta diretamente o objetivo do aluno: 15. */
  affectsGoal: boolean;
  /** Afeta versão estável em uso na trilha: 10. */
  affectsStableVersion: boolean;
  /** Beta, RC, alpha ou rumor: 0, sempre ignorado (spec §7). */
  isBetaOrRumor: boolean;
}

/**
 * Pontuação da spec §7: oficial 50 + 2ª fonte 25 + afeta objetivo 15 +
 * versão estável em uso 10 (máx. 100). Beta/RC/rumor = 0, sempre.
 */
export function scoreMarketSignal(input: MarketSignalScoreInput): number {
  if (input.isBetaOrRumor) return 0;
  let score = 0;
  if (input.isOfficialSource) score += 50;
  if (input.confirmedBySecondSource) score += 25;
  if (input.affectsGoal) score += 15;
  if (input.affectsStableVersion) score += 10;
  return score;
}

/** Um sinal só vira evidência exibida ao aluno com score >= 70. */
export function isMarketEvidence(score: number): boolean {
  return score >= MARKET_EVIDENCE_THRESHOLD;
}

export interface MarketEvidenceItem {
  titulo: string;
  tecnologia: string;
  tipo: string;
  publishedAt: string;
  retrievedAt: string;
  sourceName: string;
  sourceUrl: string;
  evidencia?: string | null;
  objetivoAfetado?: string | null;
  passoAfetado?: string | null;
  score: number;
  isBetaOrRumor?: boolean;
}

/**
 * Filtra sinais para a evidência exibida ao aluno (DESIGN D2):
 * - descarta beta/rumor (score 0 por construção) e score < 70;
 * - descarta sinal sem `publishedAt`, sem fonte ou sem URL (spec §6:
 *   sinal sem esses campos é descartado, não exibido);
 * - dedupe por URL: mesma URL = confirmação, não sinal novo — fica o
 *   de maior score.
 * Devolve no máximo os sinais que a UI pode exibir com fonte+URL+data.
 */
export function toMarketEvidence(
  signals: MarketEvidenceItem[],
): MarketEvidenceItem[] {
  const byUrl = new Map<string, MarketEvidenceItem>();
  for (const signal of signals) {
    if (signal.isBetaOrRumor) continue;
    if (!isMarketEvidence(signal.score)) continue;
    if (!signal.publishedAt || !signal.sourceName || !signal.sourceUrl) {
      continue;
    }
    const existing = byUrl.get(signal.sourceUrl);
    if (!existing || signal.score > existing.score) {
      byUrl.set(signal.sourceUrl, signal);
    }
  }
  return [...byUrl.values()].sort(
    (a, b) => b.score - a.score || a.titulo.localeCompare(b.titulo),
  );
}

/**
 * Dedupe genérico por URL (spec §10 passo 3): mesma URL = confirmação.
 * Devolve os únicos e as URLs duplicadas (para registrar a confirmação
 * no sinal original, sem criar sinal novo).
 */
export function dedupeSignalsByUrl<T extends { sourceUrl: string }>(
  signals: T[],
): { unique: T[]; duplicates: T[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicates: T[] = [];
  for (const signal of signals) {
    if (seen.has(signal.sourceUrl)) {
      duplicates.push(signal);
    } else {
      seen.add(signal.sourceUrl);
      unique.push(signal);
    }
  }
  return { unique, duplicates };
}

// ---------------------------------------------------------------------------
// SLA da investigação (DESIGN D3)
// ---------------------------------------------------------------------------

/** SLA da investigação: 48h a partir da criação. */
export const TRACK_INVESTIGATION_SLA_HOURS = 48;

export function slaDueAtFrom(createdAt: Date): Date {
  return new Date(
    createdAt.getTime() + TRACK_INVESTIGATION_SLA_HOURS * 60 * 60 * 1000,
  );
}

/** Passou de slaDueAt sem concluir: a UI mostra "prazo estendido". */
export function isSlaOverdue(now: Date, slaDueAt: Date): boolean {
  return now.getTime() > slaDueAt.getTime();
}
