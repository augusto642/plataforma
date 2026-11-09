/**
 * battleRunClient.ts
 * NEXUS CODE — Cliente do contrato ASSÍNCRONO de POST /submissions/battle-run (Lote 1, C7/D2).
 *
 * Contrato do backend (apps/api/src/submissions/submissions.controller.ts):
 * - POST /submissions/battle-run responde **202** `{ submissionId, status: 'queued', jobId }`
 *   — NUNCA o resultado na própria resposta. O corpo é o BattleRunDto:
 *   `{ activityId: UUID, companionId: UUID, code, language, commitSha? }`.
 * - Resultado em GET /submissions/:id/battle → `{ status, result: battleResult | null }`,
 *   onde `result` é null enquanto o job não termina. O `battleResult` tem o
 *   mesmo formato da antiga resposta síncrona: `allPassed, testsPassed,
 *   totalTests, damageDealt, recoilDamage, remainingBossHp, isVictory,
 *   xpGained, bitsGained, combatLog, companion, testResults[]`.
 * - O servidor JÁ persiste XP/bits na transação do job (user.xp/bitsBalance e
 *   companion.xp). O front NUNCA soma XP/bits localmente a partir daqui:
 *   `xpGained`/`bitsGained` são apenas exibidos.
 *
 * Origem dos identificadores (descoberta 07/11 — ver CodeBattleModal.tsx):
 * - `companionId`: GET /users/me devolve `companion.id` (1 companion por
 *   usuário, UserCompanion.userId @unique). Resolvido aqui por
 *   `resolveCompanionId()` quando o chamador não o informa.
 * - `activityId`: NÃO existe origem no front hoje — os desafios locais de
 *   batalha (`challenge_*` em BattleChallenges.ts) não são Activities no
 *   banco (sem testCode/bossMetadata) e não há endpoint de lookup
 *   skill→activity. O chamador precisa receber o UUID de uma Activity real.
 *   Sem ele, o modal roda em modo treino (avaliação local, sem registro).
 *
 * Polling em vez de SSE: GET :id/battle via `apiFetch` reutiliza o refresh
 * automático de cookie 401; o SSE exigiria gerenciar o ciclo de vida do
 * stream dentro do handler de clique. O contrato permite os dois caminhos.
 */

import { apiFetch } from '../../lib/apiClient';
import type { BattleChallenge } from './BattleChallenges';
import type { ExecutionOutcome, TestOutcome } from './CodeSandboxEvaluator';

/** Erro honesto de batalha: mensagem pronta para exibição ao aluno. */
export class BattleRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BattleRunError';
  }
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Corpo exato do BattleRunDto — sem challengeId/skillId (o DTO os rejeita com 400). */
export interface BattleRunBody {
  activityId: string;
  companionId: string;
  code: string;
  language: string;
  commitSha?: string;
}

export function buildBattleRunBody(
  activityId: string,
  companionId: string,
  code: string,
  language: string,
): BattleRunBody {
  return { activityId, companionId, code, language };
}

export interface BattleRunEnqueued {
  submissionId: string;
  status: string;
  jobId?: string;
}

/** Resultado completo do combate, no formato persistido pelo servidor. */
export interface BattleResult {
  status: string;
  allPassed: boolean;
  testsPassed: number;
  totalTests: number;
  damageDealt: number;
  recoilDamage: number;
  remainingBossHp: number;
  isVictory: boolean;
  isCriticalHit: boolean;
  xpGained: number;
  bitsGained: number;
  combatLog: string;
  companion?: {
    id: string;
    starterName: string;
    currentStage: number;
    xp: number;
    evolved: boolean;
  };
  testResults: Array<{
    name: string;
    passed: boolean;
    durationMs?: number;
    isHidden?: boolean;
    errorMessage?: string;
  }>;
}

export interface PollOptions {
  /** Intervalo entre polls (padrão 1000 ms). */
  intervalMs?: number;
  /** Tempo máximo de espera antes de desistir com erro honesto (padrão 60_000 ms). */
  timeoutMs?: number;
}

const DEFAULT_POLL: Required<PollOptions> = { intervalMs: 1000, timeoutMs: 60_000 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /submissions/battle-run. Sucesso = 202 com submissionId.
 * Qualquer outro status vira BattleRunError (nunca cai em fallback local).
 */
export async function submitBattleRun(
  fetchFn: FetchFn = apiFetch,
  body: BattleRunBody,
): Promise<BattleRunEnqueued> {
  let res: Response;
  try {
    res = await fetchFn('/submissions/battle-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BattleRunError(
      'Não foi possível falar com o servidor de batalha. Verifique sua conexão e tente novamente — nada foi registrado.',
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  // 202 enfileirado (ou 200 tolerado) com submissionId = único sucesso válido.
  // Um 200 com o formato síncrono antigo (allPassed direto) NÃO existe mais;
  // se vier sem submissionId, é violação de contrato, não resultado.
  if (res.ok && data && typeof data === 'object' && typeof (data as { submissionId?: unknown }).submissionId === 'string') {
    const d = data as { submissionId: string; status?: unknown; jobId?: unknown };
    if (d.status === 'error') {
      throw new BattleRunError(
        'O serviço de fila está indisponível no momento. Sua batalha não foi avaliada — tente novamente em instantes.',
      );
    }
    return {
      submissionId: d.submissionId,
      status: typeof d.status === 'string' ? d.status : 'queued',
      jobId: typeof d.jobId === 'string' ? d.jobId : undefined,
    };
  }

  if (res.status === 404) {
    throw new BattleRunError(
      'Atividade ou companion não encontrado no servidor. Esta batalha ainda não está ligada a uma atividade válida — avise o professor.',
    );
  }
  if (res.status === 400) {
    const detail = await Promise.resolve(
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message ?? '')
        : '',
    );
    throw new BattleRunError(
      `O servidor rejeitou a batalha (400)${detail ? `: ${detail}` : ''}. Nada foi registrado.`,
    );
  }
  const detail =
    data && typeof data === 'object' && 'message' in data
      ? (data as { message?: unknown }).message
      : undefined;
  const detailText =
    typeof detail === 'string' && detail.trim()
      ? `: ${detail}`
      : Array.isArray(detail) && typeof detail[0] === 'string'
        ? `: ${detail[0]}`
        : '';
  throw new BattleRunError(
    `O servidor de batalha respondeu ${res.status}${detailText}. Nada foi registrado — tente novamente.`,
  );
}

/**
 * GET /users/me → companion.id (ou null quando o usuário ainda não adotou
 * um companion via POST /users/me/companion).
 */
export async function resolveCompanionId(
  fetchFn: FetchFn = apiFetch,
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetchFn('/users/me', { method: 'GET' });
  } catch {
    throw new BattleRunError(
      'Não foi possível confirmar seu companion no servidor. Tente novamente.',
    );
  }
  if (!res.ok) {
    throw new BattleRunError(
      `Não foi possível confirmar seu companion no servidor (${res.status}). Tente novamente.`,
    );
  }
  const data: unknown = await res.json().catch(() => null);
  const companion = (data as { companion?: { id?: unknown } } | null)?.companion;
  return typeof companion?.id === 'string' ? companion.id : null;
}

/**
 * Aguarda o resultado real via polling de GET /submissions/:id/battle.
 * Retorna quando `result` não é null ou o status é terminal
 * (passed/failed/error). Timeout ou status 'error' viram BattleRunError —
 * nunca um resultado inventado localmente.
 */
export async function pollBattleResult(
  fetchFn: FetchFn = apiFetch,
  submissionId: string,
  options: PollOptions = {},
): Promise<BattleResult> {
  const { intervalMs, timeoutMs } = { ...DEFAULT_POLL, ...options };
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    let res: Response;
    try {
      res = await fetchFn(`/submissions/${submissionId}/battle`, { method: 'GET' });
    } catch {
      throw new BattleRunError(
        'A conexão com o servidor caiu enquanto sua batalha era avaliada. O resultado pode já estar registrado — recarregue e confira antes de tentar de novo.',
      );
    }
    if (!res.ok) {
      throw new BattleRunError(
        `Não foi possível buscar o resultado da batalha (${res.status}). Nada foi aplicado localmente.`,
      );
    }
    const data: unknown = await res.json().catch(() => null);
    const status = (data as { status?: unknown } | null)?.status;
    const result = (data as { result?: unknown } | null)?.result;

    if (result && typeof result === 'object') {
      return result as BattleResult;
    }
    if (status === 'error') {
      throw new BattleRunError(
        'O servidor não conseguiu avaliar sua batalha (status error). Nada foi registrado — tente novamente.',
      );
    }
    if (status === 'passed' || status === 'failed') {
      // Terminal sem battleResult: violação de contrato do backend.
      throw new BattleRunError(
        `A batalha terminou como "${status}", mas o servidor não devolveu o resultado. Avise o professor — nada foi aplicado localmente.`,
      );
    }
    if (Date.now() >= deadline) {
      throw new BattleRunError(
        'O servidor demorou demais para avaliar sua batalha. Ela pode ainda estar na fila — aguarde um pouco antes de tentar de novo para não duplicar o envio.',
      );
    }
    await sleep(intervalMs);
  }
}

/**
 * Converte o battleResult do servidor em ExecutionOutcome para o painel de
 * testes do modal, preservando dano/HP/recompensas autoritativos.
 *
 * Os testResults do servidor NÃO trazem `expected`/`actual` (só
 * name/passed/durationMs/isHidden/errorMessage) — nada é inventado aqui:
 * ficam `undefined` e a UI exibe `errorMessage` quando houver.
 */
export function battleResultToOutcome(result: BattleResult, challenge: BattleChallenge): {
  outcome: ExecutionOutcome;
  damageDealt: number;
  recoilDamage: number;
  remainingBossHp: number;
  isVictory: boolean;
  xpGained: number;
  bitsGained: number;
  combatLog: string;
} {
  const testResults: TestOutcome[] = (result.testResults ?? []).map((t, idx) => ({
    id: `server-${idx}`,
    name: t.name,
    passed: t.passed,
    expected: undefined,
    actual: undefined,
    error: t.errorMessage,
    hidden: t.isHidden ?? false,
  }));

  return {
    outcome: {
      allPassed: result.allPassed,
      testsPassed: result.testsPassed,
      totalTests: result.totalTests || challenge.testCases.length,
      testResults,
      stdout: '',
      executionTimeMs: 0,
      syntaxError: undefined,
    },
    damageDealt: result.damageDealt,
    recoilDamage: result.recoilDamage,
    remainingBossHp: result.remainingBossHp,
    isVictory: result.isVictory,
    xpGained: result.xpGained,
    bitsGained: result.bitsGained,
    combatLog: result.combatLog,
  };
}
