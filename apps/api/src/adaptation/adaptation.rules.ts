// Sprint 21 — Adaptação v1: TODAS as regras são determinísticas,
// declaradas neste arquivo e testadas em adaptation.rules.spec.ts.
// Não há score oculto, probabilidade nem "inteligência" simulada:
// cada comportamento da v1 é uma destas funções puras aplicadas a
// dados reais (submissões e conceptTags).
//
// As três regras da v1:
//  1. Diagnóstico → caminho: TRACK_TO_COURSE_SLUG mapeia a trilha
//     recomendada pelo diagnóstico para um curso que EXISTE; e quem
//     acerta TODAS as questões de conhecimento do eixo `codigo`
//     recebe a recomendação de provar o módulo 1 da espinha pelo
//     test-out (recomendação — nunca crédito automático).
//  2. Test-out por módulo: a atividade de verificação de um módulo é a
//     de MAIOR `order` entre as dele. Passar nela (submissão `passed`
//     comum, pelo runner normal) marca o módulo como concluído por
//     test-out: as demais atividades do módulo contam como concluídas
//     na ÚNICA derivação de progresso do sistema (computeCoursePath),
//     que users.service e activities.service consomem — nenhum segundo
//     caminho de verdade, nenhuma tabela nova.
//  3. Remediação por conceito: conceito da espinha com >= 3 submissões
//     `failed` em atividades ainda não concluídas pelo aluno é
//     "frágil". A falha conta SÓ para o conceito PRIMÁRIO da atividade
//     (primeira tag da espinha — a mesma convenção do test-out):
//     contar para todas as tags afirmaria tentativas em conceitos que
//     o aluno não praticou como foco. O reforço é escolhido por pools
//     ordenados (Biblioteca primeiro, com o mapa de aliases do
//     vocabulário legado; depois outra atividade da trilha com o
//     mesmo conceito) e NENHUM pool oferece atividade que o aluno já
//     tentou: repetir a atividade falhada seria a não-remediação que
//     esta regra substitui. Sem reforço disponível, a resposta
//     declara `null` com o motivo — nunca inventa uma atividade.

import {
  QUESTIONS,
  type TrackId,
} from '../diagnostic/data/quiz-v1';
import {
  CONCEPT_SPINE_MODULES,
  SPINE_MODULE_BY_TAG,
  SPINE_TAG_SET,
} from './data/concept-spine';

// ---------------------------------------------------------------------------
// Regra 1 — diagnóstico → trilha real e ponto de entrada
// ---------------------------------------------------------------------------

/**
 * TrackId do diagnóstico → slug de curso REAL do catálogo.
 * Só existem dois cursos de aluno hoje (Sprint 20B); os quatro TrackIds
 * caem neles assim:
 * - frontend → algoritmos-javascript (fundamentos com a linguagem da web)
 * - backend  → introducao-python     (a trilha de sintaxe completa)
 * - ai       → introducao-python     (Python é a base dos cursos de IA)
 * - web3     → algoritmos-javascript (web3 não tem curso próprio hoje;
 *            o destino honesto é o curso de fundamentos — nunca um slug
 *            inventado que a interface não conseguiria abrir)
 * Se o slug não existir no banco, a oferta é `null` (ver DiagnosticService).
 */
export const TRACK_TO_COURSE_SLUG: Record<TrackId, string> = {
  frontend: 'algoritmos-javascript',
  backend: 'introducao-python',
  ai: 'introducao-python',
  web3: 'algoritmos-javascript',
};

/** Módulo da espinha que o test-out recomendado pelo diagnóstico prova. */
export const DIAGNOSTIC_TEST_OUT_MODULE_TAG = 'saida-e-variaveis';

/**
 * Sinal ÚNICO que o diagnóstico oferece sobre conhecimento prévio:
 * o aluno acertou TODAS as questões de conhecimento do eixo `codigo`.
 * (O escore do eixo mistura preferência e conhecimento — derivar
 * "domínio" dele seria precisão falsa. As respostas brutas, não o
 * escore, são a evidência usada aqui, e ela só gera uma RECOMENDAÇÃO
 * de test-out do módulo 1 — o crédito vem de passar no desafio.)
 */
export function diagnosticShowsCodeKnowledge(
  answers: { questionId: string; optionId: string }[],
): boolean {
  const knowledge = QUESTIONS.filter(
    (q) => q.type === 'knowledge' && q.axis === 'codigo',
  );
  if (knowledge.length === 0) return false;
  const chosen = new Map(answers.map((a) => [a.questionId, a.optionId]));
  return knowledge.every((q) => chosen.get(q.id) === q.correctOptionId);
}

// ---------------------------------------------------------------------------
// Regra 2 — caminho do curso, módulos e test-out
// ---------------------------------------------------------------------------

export interface PathActivity {
  id: string;
  slug: string;
  title: string;
  order: number;
  conceptTags: string[];
}

export type ModuleStatus =
  | 'completed'
  | 'tested-out'
  | 'in-progress'
  | 'not-started';

export interface ModulePath {
  tag: string;
  title: string;
  order: number;
  status: ModuleStatus;
  activityIds: string[];
  totalActivities: number;
  /** Concluídas de fato (submissão passed) dentro do módulo. */
  passedActivities: number;
  /** Atividade de verificação (test-out): a de maior order do módulo. */
  testOutActivityId: string;
}

export interface CoursePath {
  modules: ModulePath[];
  /**
   * ÚNICA derivação de conclusão do sistema: atividades com submissão
   * `passed` ∪ atividades de módulos concluídos por test-out.
   * users.service (progresso) e activities.service (desafio diário)
   * consomem este conjunto — não existe outra regra de "concluído".
   */
  effectiveCompletedIds: ReadonlySet<string>;
  /** Primeira atividade (menor order) fora de effectiveCompletedIds. */
  nextActivityId: string | null;
  /** Primeiro módulo nem concluído nem via test-out (o ponto de entrada). */
  entryModuleTag: string | null;
}

/**
 * Módulo primário de uma atividade: a PRIMEIRA conceptTag que pertence
 * à espinha. É a convenção que a autoria da trilha já segue (a tag do
 * módulo abre a lista — ver scripts/track-content.mjs). Sem tag da
 * espinha, a atividade não pertence a módulo nenhum: não é pulável por
 * test-out e só conclui com submissão `passed` própria.
 */
export function primaryModuleTag(conceptTags: string[]): string | null {
  for (const tag of conceptTags) {
    if (SPINE_TAG_SET.has(tag)) return tag;
  }
  return null;
}

export function computeCoursePath(
  activities: PathActivity[],
  passedActivityIds: ReadonlySet<string>,
): CoursePath {
  const sorted = [...activities].sort((a, b) => a.order - b.order);

  const byModule = new Map<string, PathActivity[]>();
  for (const activity of sorted) {
    const tag = primaryModuleTag(activity.conceptTags);
    if (!tag) continue;
    const list = byModule.get(tag) ?? [];
    list.push(activity);
    byModule.set(tag, list);
  }

  const modules: ModulePath[] = [];
  const testedOutModuleTags = new Set<string>();
  for (const def of CONCEPT_SPINE_MODULES) {
    const list = byModule.get(def.tag);
    if (!list || list.length === 0) continue;
    // `list` está em order crescente: a verificação é a ÚLTIMA do módulo.
    const testOutActivityId = list[list.length - 1].id;
    const passedActivities = list.filter((a) =>
      passedActivityIds.has(a.id),
    ).length;
    let status: ModuleStatus;
    if (passedActivities === list.length) {
      status = 'completed';
    } else if (passedActivityIds.has(testOutActivityId)) {
      status = 'tested-out';
      testedOutModuleTags.add(def.tag);
    } else if (passedActivities > 0) {
      status = 'in-progress';
    } else {
      status = 'not-started';
    }
    modules.push({
      tag: def.tag,
      title: def.title,
      order: def.order,
      status,
      activityIds: list.map((a) => a.id),
      totalActivities: list.length,
      passedActivities,
      testOutActivityId,
    });
  }

  const effectiveCompletedIds = new Set<string>(passedActivityIds);
  for (const activity of sorted) {
    const tag = primaryModuleTag(activity.conceptTags);
    if (tag && testedOutModuleTags.has(tag)) {
      effectiveCompletedIds.add(activity.id);
    }
  }
  // effectiveCompletedIds só pode conter atividades DESTE curso:
  for (const id of [...effectiveCompletedIds]) {
    if (!sorted.some((a) => a.id === id)) effectiveCompletedIds.delete(id);
  }

  const next = sorted.find((a) => !effectiveCompletedIds.has(a.id)) ?? null;
  const entryModule =
    modules.find(
      (m) => m.status !== 'completed' && m.status !== 'tested-out',
    ) ?? null;

  return {
    modules,
    effectiveCompletedIds,
    nextActivityId: next ? next.id : null,
    entryModuleTag: entryModule ? entryModule.tag : null,
  };
}

// ---------------------------------------------------------------------------
// Regra 3 — remediação por conceito
// ---------------------------------------------------------------------------

/** Falhas no mesmo conceito que disparam a oferta de reforço. */
export const REMEDIATION_FAILURE_THRESHOLD = 3;

/**
 * A Biblioteca nasceu com vocabulário próprio de tags (legado) e só
 * 3 tags coincidem com a espinha (`loops`, `condicionais`, `funcoes`).
 * Este mapa é a ponte DECLARADA entre os dois vocabulários — cada
 * conceito da espinha lista as tags da Biblioteca que o reforçam.
 * `recursao` (Biblioteca) não reforça nenhum conceito da espinha v1.
 */
export const LIBRARY_TAG_ALIASES: Record<string, string[]> = {
  'saida-e-variaveis': ['saida-e-variaveis'],
  'entrada-e-strings': ['entrada-e-strings', 'strings'],
  operadores: ['operadores'],
  condicionais: ['condicionais'],
  loops: ['loops'],
  listas: ['listas', 'arrays'],
  'dicionarios-e-estruturas': ['dicionarios-e-estruturas', 'objetos'],
  funcoes: ['funcoes'],
  'erros-e-depuracao': ['erros-e-depuracao'],
  'projeto-final': ['projeto-final'],
};

export interface RemediationActivity {
  id: string;
  slug: string;
  title: string;
  language: string;
  order: number;
  conceptTags: string[];
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}

export interface RemediationSubmission {
  activityId: string;
  status: string;
  createdAt: Date | string;
}

export interface FragileConcept {
  conceptTag: string;
  moduleTitle: string;
  spineOrder: number;
  /**
   * Submissões `failed` em atividades cujo conceito PRIMÁRIO é este
   * e que o aluno ainda não concluiu. É este número que a interface
   * exibe ("tentativas sem concluir neste conceito") — ele só pode
   * contar tentativas que de fato foram neste conceito.
   */
  failedAttempts: number;
  reinforcement: (RemediationActivity & {
    source: 'library' | 'track';
  }) | null;
  /** Preenchido só quando reinforcement é null. */
  unavailableReason: 'no-reinforcement-available' | null;
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value) || 0;
}

export function computeFragileConcepts(args: {
  submissions: RemediationSubmission[];
  /** Todas as atividades referenciadas pelas submissões (id → dados). */
  activitiesById: ReadonlyMap<string, RemediationActivity>;
  passedActivityIds: ReadonlySet<string>;
  /** Pool 1: atividades da Biblioteca pública. */
  libraryActivities: RemediationActivity[];
  /** Pool 2: atividades de cursos do aluno (fora da Biblioteca). */
  enrolledActivities: RemediationActivity[];
}): FragileConcept[] {
  const {
    submissions,
    activitiesById,
    passedActivityIds,
    libraryActivities,
    enrolledActivities,
  } = args;

  // Falhas por conceito da espinha: só contam submissões `failed` em
  // atividades que o aluno AINDA não concluiu (passou na atividade →
  // as falhas dela saem da conta; o conceito se recupera pela prática).
  const failures = new Map<
    string,
    { count: number; latestFailedLanguage: string | null; latestAt: number }
  >();
  for (const submission of submissions) {
    if (submission.status !== 'failed') continue;
    if (passedActivityIds.has(submission.activityId)) continue;
    const activity = activitiesById.get(submission.activityId);
    if (!activity) continue;
    const at = toTime(submission.createdAt);
    // Correção 21.1 (sonda C do QA) — a falha conta SÓ para o conceito
    // primário da atividade. Antes contava para TODAS as tags da
    // espinha: 3 falhas em `contar-vogais-python` (primário
    // entrada-e-strings; secundárias loops e condicionais) geravam 3
    // conceitos frágeis de uma vez, e a copy afirmava tentativas em
    // loops/condicionais que o aluno nunca praticou como foco.
    const tag = primaryModuleTag(activity.conceptTags);
    if (!tag) continue;
    const entry = failures.get(tag) ?? {
      count: 0,
      latestFailedLanguage: null,
      latestAt: -1,
    };
    entry.count += 1;
    if (at >= entry.latestAt) {
      entry.latestAt = at;
      entry.latestFailedLanguage = activity.language;
    }
    failures.set(tag, entry);
  }

  const attemptedActivityIds = new Set(
    submissions.map((s) => s.activityId),
  );

  const fragile: FragileConcept[] = [];
  for (const def of CONCEPT_SPINE_MODULES) {
    const entry = failures.get(def.tag);
    if (!entry || entry.count < REMEDIATION_FAILURE_THRESHOLD) continue;

    const reinforcement = pickReinforcement({
      conceptTag: def.tag,
      preferredLanguage: entry.latestFailedLanguage,
      passedActivityIds,
      attemptedActivityIds,
      libraryActivities,
      enrolledActivities,
    });

    fragile.push({
      conceptTag: def.tag,
      moduleTitle: def.title,
      spineOrder: def.order,
      failedAttempts: entry.count,
      reinforcement,
      unavailableReason: reinforcement ? null : 'no-reinforcement-available',
    });
  }

  // Mais falhas primeiro; desempate pela ordem da espinha.
  fragile.sort(
    (a, b) =>
      b.failedAttempts - a.failedAttempts || a.spineOrder - b.spineOrder,
  );
  return fragile;
}

function pickReinforcement(args: {
  conceptTag: string;
  preferredLanguage: string | null;
  passedActivityIds: ReadonlySet<string>;
  attemptedActivityIds: ReadonlySet<string>;
  libraryActivities: RemediationActivity[];
  enrolledActivities: RemediationActivity[];
}): (RemediationActivity & { source: 'library' | 'track' }) | null {
  const {
    conceptTag,
    preferredLanguage,
    passedActivityIds,
    attemptedActivityIds,
    libraryActivities,
    enrolledActivities,
  } = args;

  // Pool 1 — Biblioteca: mesma linguagem da última falha primeiro,
  // depois a menor order. Atividade já concluída pelo aluno não
  // reforça — e, desde a Correção 21.1 (sonda A do QA), atividade já
  // TENTADA também não: sem este filtro, quem falhava 3× numa
  // atividade da própria Biblioteca (ex.: `bib-tabuada-lista`)
  // recebia ela mesma como "reforço", a não-remediação que o pool 2
  // já evitava com o filtro de tentadas. Os dois pools aplicam a
  // mesma régua.
  const aliases = LIBRARY_TAG_ALIASES[conceptTag] ?? [conceptTag];
  const libraryCandidates = libraryActivities
    .filter((a) => a.conceptTags.some((t) => aliases.includes(t)))
    .filter((a) => !passedActivityIds.has(a.id))
    .filter((a) => !attemptedActivityIds.has(a.id))
    .sort((a, b) => {
      const langA = preferredLanguage && a.language === preferredLanguage ? 0 : 1;
      const langB = preferredLanguage && b.language === preferredLanguage ? 0 : 1;
      return langA - langB || a.order - b.order;
    });
  if (libraryCandidates.length > 0) {
    return { ...libraryCandidates[0], source: 'library' as const };
  }

  // Pool 2 — a própria trilha: outra atividade com o conceito que o
  // aluno NUNCA tentou (sugerir repetir a mesma seria a não-remediação
  // que esta regra substitui) e ainda não concluiu.
  const trackCandidates = enrolledActivities
    .filter((a) => a.conceptTags.includes(conceptTag))
    .filter((a) => !passedActivityIds.has(a.id))
    .filter((a) => !attemptedActivityIds.has(a.id))
    .sort((a, b) => a.order - b.order);
  if (trackCandidates.length > 0) {
    return { ...trackCandidates[0], source: 'track' as const };
  }

  return null;
}

export { CONCEPT_SPINE_MODULES, SPINE_MODULE_BY_TAG };
