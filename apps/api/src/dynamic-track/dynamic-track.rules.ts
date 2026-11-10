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

export type ExperienceLevel = 'junior' | 'mid' | 'senior';
export type TimeCommitment = '5h' | '10h' | '20h';
export type CareerGoal = 'global' | 'lead' | 'startup' | 'hackathons';

/** Base da sugestão: o que sustentou a recomendação. */
export type SuggestionBasis = 'profile-only' | 'profile+market';

export interface TrackSuggestionInput {
  expLevel?: ExperienceLevel | null;
  timeCommitment?: TimeCommitment | null;
  careerGoal?: CareerGoal | null;
  /** Hint da landing (?track=): interesse declarado, não escolha. */
  sourceTrack?: TrackId | null;
  /** Trilha recomendada pelo quiz diagnóstico (arquétipo), quando houver. */
  diagnosticTrackId?: TrackId | null;
}

/** Códigos de motivo — o que a API persiste em `rationale.reasons`. */
export type SuggestionReason =
  | 'diagnostic'
  | 'landing-hint'
  | 'career-goal:global'
  | 'career-goal:lead'
  | 'career-goal:startup'
  | 'career-goal:hackathons'
  | 'default-entry';

/**
 * Objetivo de carreira → trilha (v1). Cada linha deriva da descrição do
 * próprio objetivo no cadastro (StepGoals), não de dado de mercado:
 * - global: vaga internacional/remota — frontend é a porta de entrada
 *   mais ampla para a web (mesma rampa do arquétipo "explorador");
 * - lead: arquitetura distribuída, code review, mentoria → backend;
 * - startup: "criar produtos com stack moderna e Web3" (descrição do
 *   objetivo) → web3;
 * - hackathons: construir rápido e iterar na tela → frontend.
 */
export const CAREER_GOAL_TO_TRACK: Record<CareerGoal, TrackId> = {
  global: 'frontend',
  lead: 'backend',
  startup: 'web3',
  hackathons: 'frontend',
};

/** Fallback quando o perfil não traz nenhum sinal mais forte. */
export const DEFAULT_TRACK: TrackId = 'frontend';

export interface TrackSuggestion {
  track: TrackId;
  trackName: string;
  reasons: SuggestionReason[];
}

/**
 * Função pura de sugestão. Determinística: mesma entrada → mesma saída.
 * A precedência é diagnóstico > hint da landing > objetivo > fallback.
 */
export function suggestTrack(input: TrackSuggestionInput): TrackSuggestion {
  let track: TrackId;
  let reason: SuggestionReason;

  if (input.diagnosticTrackId) {
    track = input.diagnosticTrackId;
    reason = 'diagnostic';
  } else if (input.sourceTrack) {
    track = input.sourceTrack;
    reason = 'landing-hint';
  } else if (input.careerGoal && CAREER_GOAL_TO_TRACK[input.careerGoal]) {
    track = CAREER_GOAL_TO_TRACK[input.careerGoal];
    reason = `career-goal:${input.careerGoal}` as SuggestionReason;
  } else {
    track = DEFAULT_TRACK;
    reason = 'default-entry';
  }

  return { track, trackName: TRACK_NAMES[track], reasons: [reason] };
}

/** Texto ao aluno para cada motivo (template — nunca redação livre). */
export const REASON_TEXTS: Record<SuggestionReason, string> = {
  diagnostic:
    'O quiz diagnóstico apontou afinidade com esta área.',
  'landing-hint':
    'Você demonstrou interesse por esta área ao chegar na plataforma.',
  'career-goal:global':
    'Seu objetivo é uma vaga internacional — esta trilha é a porta de entrada mais ampla para a web.',
  'career-goal:lead':
    'Seu objetivo é evoluir para liderança técnica — esta trilha cobre arquitetura e sistemas distribuídos.',
  'career-goal:startup':
    'Seu objetivo é construir sua própria startup — esta trilha cobre a stack de produtos descentralizados.',
  'career-goal:hackathons':
    'Seu objetivo é competir em hackathons — esta trilha permite construir e iterar rápido na tela.',
  'default-entry':
    'Sem um sinal mais forte no seu perfil, começamos pela base da web — você pode fazer cursos avulsos quando quiser.',
};

/** Monta o rationale legível da sugestão a partir de reasons[] + basis. */
export function buildRationaleText(
  reasons: SuggestionReason[],
  basis: SuggestionBasis,
): string {
  const parts = reasons.map((r) => REASON_TEXTS[r]);
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
