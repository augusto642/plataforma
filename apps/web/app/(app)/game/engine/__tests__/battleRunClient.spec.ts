/**
 * battleRunClient.spec.ts
 * NEXUS CODE — Testes do cliente do contrato assíncrono de battle-run (D2/C7).
 *
 * Prova por teste (não só por leitura):
 * 1. O POST envia o DTO correto (activityId + companionId + code + language)
 *    e NUNCA challengeId/skillId.
 * 2. 202 é tratado como "enfileirado": o resultado só é decidido após o
 *    polling de GET :id/battle devolver o battleResult real.
 * 3. Erro (400/404/timeout/status error) vira BattleRunError honesto — nenhum
 *    caminho inventa resultado ou concede recompensa local.
 */

import { describe, expect, it } from 'vitest';
import {
  BattleRunError,
  battleResultToOutcome,
  buildBattleRunBody,
  pollBattleResult,
  resolveCompanionId,
  submitBattleRun,
  type BattleResult,
  type FetchFn,
} from '../battleRunClient';
import type { BattleChallenge } from '../BattleChallenges';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ACTIVITY_ID = '11111111-1111-4111-8111-111111111111';
const COMPANION_ID = '22222222-2222-4222-8222-222222222222';
const SUBMISSION_ID = '33333333-3333-4333-8333-333333333333';

const CHALLENGE = {
  id: 'challenge_syntax_strike',
  testCases: [
    { id: 't1', name: 'Imposto padrão 10%', inputArgs: [100, 0.1], expected: 110, description: '' },
    { id: 't2', name: 'Imposto com casas decimais', inputArgs: [49.9, 0.08], expected: 53.89, description: '' },
  ],
} as unknown as BattleChallenge;

function serverResult(overrides: Partial<BattleResult> = {}): BattleResult {
  return {
    status: 'passed',
    allPassed: true,
    testsPassed: 2,
    totalTests: 2,
    damageDealt: 100,
    recoilDamage: 0,
    remainingBossHp: 0,
    isVictory: true,
    isCriticalHit: true,
    xpGained: 75,
    bitsGained: 50,
    combatLog: 'COMPILAÇÃO IMPECÁVEL! Golpe crítico causou 100 de dano!',
    companion: { id: COMPANION_ID, starterName: 'Pythox', currentStage: 1, xp: 75, evolved: false },
    testResults: [
      { name: 'Imposto padrão 10%', passed: true },
      { name: 'Imposto com casas decimais', passed: true },
    ],
    ...overrides,
  };
}

describe('buildBattleRunBody', () => {
  it('envia o DTO correto do backend (activityId + companionId), sem challengeId/skillId', () => {
    const body = buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'const x = 1;', 'javascript');
    expect(body).toEqual({
      activityId: ACTIVITY_ID,
      companionId: COMPANION_ID,
      code: 'const x = 1;',
      language: 'javascript',
    });
    expect(body).not.toHaveProperty('challengeId');
    expect(body).not.toHaveProperty('skillId');
  });
});

describe('submitBattleRun', () => {
  it('202 com submissionId é sucesso enfileirado (não resultado)', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn: FetchFn = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ submissionId: SUBMISSION_ID, status: 'queued', jobId: 'battle:u:a:c' }, 202);
    };

    const enqueued = await submitBattleRun(fetchFn, buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'code', 'javascript'));
    expect(enqueued.submissionId).toBe(SUBMISSION_ID);
    expect(enqueued.status).toBe('queued');

    // O corpo POSTado é o DTO correto — o 400 pré-existente não pode ocorrer.
    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent.activityId).toBe(ACTIVITY_ID);
    expect(sent.companionId).toBe(COMPANION_ID);
    expect(sent).not.toHaveProperty('challengeId');
    expect(sent).not.toHaveProperty('skillId');
  });

  it('400 vira erro honesto (nunca fallback silencioso)', async () => {
    const fetchFn: FetchFn = async () =>
      jsonResponse({ message: 'activityId must be a UUID' }, 400);
    await expect(
      submitBattleRun(fetchFn, buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'code', 'javascript')),
    ).rejects.toBeInstanceOf(BattleRunError);
  });

  it('404 vira erro honesto de atividade/companion inexistente', async () => {
    const fetchFn: FetchFn = async () => jsonResponse({ message: 'Activity not found' }, 404);
    await expect(
      submitBattleRun(fetchFn, buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'code', 'javascript')),
    ).rejects.toThrow(/não encontrado/);
  });

  it('resposta 200 sem submissionId (formato síncrono antigo) é violação de contrato, não vitória', async () => {
    const fetchFn: FetchFn = async () =>
      jsonResponse({ allPassed: true, testsPassed: 2 }, 200);
    await expect(
      submitBattleRun(fetchFn, buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'code', 'javascript')),
    ).rejects.toBeInstanceOf(BattleRunError);
  });

  it('202 com status error (fila fora do ar, fail-closed) vira erro honesto', async () => {
    const fetchFn: FetchFn = async () =>
      jsonResponse({ submissionId: SUBMISSION_ID, status: 'error', jobId: 'battle:u:a:c' }, 202);
    await expect(
      submitBattleRun(fetchFn, buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'code', 'javascript')),
    ).rejects.toThrow(/fila/);
  });

  it('falha de rede vira erro honesto', async () => {
    const fetchFn: FetchFn = async () => {
      throw new Error('network down');
    };
    await expect(
      submitBattleRun(fetchFn, buildBattleRunBody(ACTIVITY_ID, COMPANION_ID, 'code', 'javascript')),
    ).rejects.toBeInstanceOf(BattleRunError);
  });
});

describe('resolveCompanionId', () => {
  it('devolve companion.id de GET /users/me', async () => {
    const fetchFn: FetchFn = async (url) => {
      expect(url).toBe('/users/me');
      return jsonResponse({ id: 'u1', companion: { id: COMPANION_ID, starterName: 'Pythox' } });
    };
    await expect(resolveCompanionId(fetchFn)).resolves.toBe(COMPANION_ID);
  });

  it('devolve null quando o usuário ainda não adotou companion', async () => {
    const fetchFn: FetchFn = async () => jsonResponse({ id: 'u1', companion: null });
    await expect(resolveCompanionId(fetchFn)).resolves.toBeNull();
  });
});

describe('pollBattleResult', () => {
  it('aguarda o resultado real: ignora queued/null e só retorna com battleResult', async () => {
    const seen: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      seen.push(url);
      if (seen.length < 3) return jsonResponse({ status: 'queued', result: null });
      if (seen.length === 3) return jsonResponse({ status: 'running', result: null });
      return jsonResponse({ status: 'passed', result: serverResult() });
    };

    const result = await pollBattleResult(fetchFn, SUBMISSION_ID, { intervalMs: 1, timeoutMs: 5000 });
    expect(result.allPassed).toBe(true);
    expect(result.remainingBossHp).toBe(0);
    expect(seen.length).toBeGreaterThanOrEqual(4);
    expect(seen.every((u) => u === `/submissions/${SUBMISSION_ID}/battle`)).toBe(true);
  });

  it('status error vira erro honesto (sem resultado inventado)', async () => {
    const fetchFn: FetchFn = async () => jsonResponse({ status: 'error', result: null });
    await expect(
      pollBattleResult(fetchFn, SUBMISSION_ID, { intervalMs: 1, timeoutMs: 1000 }),
    ).rejects.toThrow(/não conseguiu avaliar/);
  });

  it('timeout vira erro honesto', async () => {
    const fetchFn: FetchFn = async () => jsonResponse({ status: 'queued', result: null });
    await expect(
      pollBattleResult(fetchFn, SUBMISSION_ID, { intervalMs: 1, timeoutMs: 10 }),
    ).rejects.toThrow(/demorou demais/);
  });
});

describe('battleResultToOutcome', () => {
  it('mapeia o resultado do servidor sem inventar expected/actual', () => {
    const mapped = battleResultToOutcome(serverResult(), CHALLENGE);
    expect(mapped.outcome.allPassed).toBe(true);
    expect(mapped.outcome.testsPassed).toBe(2);
    expect(mapped.damageDealt).toBe(100);
    expect(mapped.remainingBossHp).toBe(0);
    expect(mapped.isVictory).toBe(true);
    expect(mapped.xpGained).toBe(75);
    expect(mapped.bitsGained).toBe(50);
    // Nada inventado: o servidor não devolve expected/actual.
    expect(mapped.outcome.testResults[0].expected).toBeUndefined();
    expect(mapped.outcome.testResults[0].actual).toBeUndefined();
  });

  it('derrota parcial usa dano/recoil do servidor, não cálculo local', () => {
    const mapped = battleResultToOutcome(
      serverResult({
        status: 'failed',
        allPassed: false,
        testsPassed: 1,
        damageDealt: 25,
        recoilDamage: 8,
        remainingBossHp: 75,
        isVictory: false,
        xpGained: 13,
        bitsGained: 5,
        combatLog: 'TESTES PARCIAIS (1/2)',
        testResults: [
          { name: 'Imposto padrão 10%', passed: true },
          { name: 'Imposto com casas decimais', passed: false, errorMessage: 'Expected 53.89, got 53.9' },
        ],
      }),
      CHALLENGE,
    );
    expect(mapped.outcome.allPassed).toBe(false);
    expect(mapped.damageDealt).toBe(25);
    expect(mapped.recoilDamage).toBe(8);
    expect(mapped.outcome.testResults[1].error).toBe('Expected 53.89, got 53.9');
  });
});
