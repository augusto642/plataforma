/**
 * Sprint 22 — cota diária por plano + registro de uso (AiUsageService).
 *
 * Os defaults 20 (free) / 200 (pro) foram propostos pelo PM e
 * CONFIRMADOS pelo Augusto em 2026-10-23 (decisão Q5) — estes testes
 * fixam os valores confirmados e o comportamento ao redor deles.
 */
import { AiUsageService, DEFAULT_DAILY_QUOTA_FREE, DEFAULT_DAILY_QUOTA_PRO } from './ai-usage.service';

function makeConfig(values: Record<string, string> = {}) {
  return {
    get: jest.fn((key: string, def?: unknown) => (values[key] !== undefined ? values[key] : def)),
  } as any;
}

function makeCache() {
  const store = new Map<string, number>();
  return {
    store,
    increment: jest.fn(async (key: string) => {
      const next = (store.get(key) ?? 0) + 1;
      store.set(key, next);
      return next;
    }),
    decrement: jest.fn(async (key: string) => {
      store.set(key, (store.get(key) ?? 0) - 1);
    }),
  };
}

function makePrisma() {
  return {
    analyticsEvent: { create: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as any;
}

describe('AiUsageService — cota', () => {
  it('defaults confirmados (Q5, 2026-10-23): free=20, pro=200', () => {
    const service = new AiUsageService(makeConfig(), makePrisma(), makeCache() as any);
    expect(DEFAULT_DAILY_QUOTA_FREE).toBe(20);
    expect(DEFAULT_DAILY_QUOTA_PRO).toBe(200);
    expect(service.quotaLimitForPlan('free')).toBe(20);
    expect(service.quotaLimitForPlan('pro')).toBe(200);
    // Plano desconhecido cai no MENOR limite (default seguro)
    expect(service.quotaLimitForPlan('qualquer-outro')).toBe(20);
    expect(service.quotaLimitForPlan(undefined)).toBe(20);
  });

  it('limites são configuráveis por ambiente', () => {
    const service = new AiUsageService(
      makeConfig({ AI_DAILY_QUOTA_FREE: '5', AI_DAILY_QUOTA_PRO: '50' }),
      makePrisma(),
      makeCache() as any,
    );
    expect(service.quotaLimitForPlan('free')).toBe(5);
    expect(service.quotaLimitForPlan('pro')).toBe(50);
  });

  it('reserva até o limite EXATO; a chamada limite+1 é recusada e estornada', async () => {
    const cache = makeCache();
    const service = new AiUsageService(
      makeConfig({ AI_DAILY_QUOTA_FREE: '3' }),
      makePrisma(),
      cache as any,
    );
    await expect(service.reserve('user-1', 'free')).resolves.toEqual({ ok: true, used: 1, limit: 3 });
    await expect(service.reserve('user-1', 'free')).resolves.toEqual({ ok: true, used: 2, limit: 3 });
    await expect(service.reserve('user-1', 'free')).resolves.toEqual({ ok: true, used: 3, limit: 3 });
    // used = uso real após o estorno da tentativa recusada (= o limite)
    await expect(service.reserve('user-1', 'free')).resolves.toEqual({ ok: false, used: 3, limit: 3 });
    // A reserva recusada foi estornada: o contador volta ao limite
    const key = [...cache.store.keys()][0];
    expect(cache.store.get(key)).toBe(3);
    expect(cache.decrement).toHaveBeenCalledTimes(1);
  });

  it('cotas são independentes por aluno', async () => {
    const cache = makeCache();
    const service = new AiUsageService(
      makeConfig({ AI_DAILY_QUOTA_FREE: '1' }),
      makePrisma(),
      cache as any,
    );
    await expect(service.reserve('user-a', 'free')).resolves.toMatchObject({ ok: true });
    await expect(service.reserve('user-a', 'free')).resolves.toMatchObject({ ok: false });
    await expect(service.reserve('user-b', 'free')).resolves.toMatchObject({ ok: true });
  });

  it('refund devolve a vaga da reserva (falha do provedor não consome cota)', async () => {
    const cache = makeCache();
    const service = new AiUsageService(
      makeConfig({ AI_DAILY_QUOTA_FREE: '1' }),
      makePrisma(),
      cache as any,
    );
    await expect(service.reserve('user-1', 'free')).resolves.toMatchObject({ ok: true });
    await service.refund('user-1');
    await expect(service.reserve('user-1', 'free')).resolves.toMatchObject({ ok: true });
  });

  it('M17: sem Redis (cache indisponível) a reserva FALHA FECHADA — nada de fail-open', async () => {
    const service = new AiUsageService(makeConfig(), makePrisma(), undefined);
    await expect(service.reserve('user-1', 'free')).resolves.toEqual({
      ok: false,
      used: 0,
      limit: 20,
      error: 'quota-unavailable',
    });

    const brokenCache = {
      increment: jest.fn().mockRejectedValue(new Error('redis down')),
      decrement: jest.fn(),
    };
    const service2 = new AiUsageService(makeConfig(), makePrisma(), brokenCache as any);
    await expect(service2.reserve('user-1', 'free')).resolves.toEqual({
      ok: false,
      used: 0,
      limit: 20,
      error: 'quota-unavailable',
    });
  });

  it('M17: erro no Redis NÃO estoura a cota nem concede uso (sem INCR bem-sucedido, sem DECR)', async () => {
    const brokenCache = {
      increment: jest.fn().mockRejectedValue(new Error('redis down')),
      decrement: jest.fn(),
    };
    const service = new AiUsageService(makeConfig(), makePrisma(), brokenCache as any);
    const result = await service.reserve('user-1', 'free');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('quota-unavailable');
    expect(brokenCache.decrement).not.toHaveBeenCalled();
  });
});

describe('AiUsageService — registro de uso', () => {
  it('persiste o evento ai_llm_usage com provider/modelo/tokens/resultado', async () => {
    const prisma = makePrisma();
    const service = new AiUsageService(makeConfig(), prisma, makeCache() as any);
    await service.recordUsage({
      userId: 'user-9',
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      purpose: 'hint',
      usage: { promptTokens: 100, completionTokens: 40, totalTokens: 190, thoughtsTokens: 50 },
      latencyMs: 800,
      outcome: 'success',
    });
    expect(prisma.analyticsEvent.create).toHaveBeenCalledTimes(1);
    const arg = prisma.analyticsEvent.create.mock.calls[0][0];
    expect(arg.data.event).toBe('ai_llm_usage');
    expect(arg.data.props).toMatchObject({
      userId: 'user-9',
      provider: 'gemini',
      model: 'gemini-3.5-flash-lite',
      purpose: 'hint',
      totalTokens: 190,
      thoughtsTokens: 50,
      outcome: 'success',
    });
  });

  it('sem Prisma configurado o registro é no-op seguro (nunca lança)', async () => {
    const service = new AiUsageService(makeConfig(), undefined, makeCache() as any);
    await expect(
      service.recordUsage({
        provider: 'gemini',
        model: 'm',
        purpose: 'chat',
        latencyMs: 1,
        outcome: 'error',
        errorKind: 'timeout',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('AiUsageService — evento de bloqueio (ai_llm_blocked)', () => {
  it('persiste o bloqueio por cota com motivo, plano, uso e limite', async () => {
    const prisma = makePrisma();
    const service = new AiUsageService(makeConfig(), prisma, makeCache() as any);
    await service.recordBlocked({
      userId: 'user-7',
      reason: 'quota-exceeded',
      plan: 'free',
      purpose: 'hint',
      used: 20,
      limit: 20,
    });
    expect(prisma.analyticsEvent.create).toHaveBeenCalledTimes(1);
    const arg = prisma.analyticsEvent.create.mock.calls[0][0];
    expect(arg.data.event).toBe('ai_llm_blocked');
    expect(arg.data.props).toMatchObject({
      userId: 'user-7',
      reason: 'quota-exceeded',
      plan: 'free',
      purpose: 'hint',
      used: 20,
      limit: 20,
    });
  });

  it('bloqueio por kill switch: motivo disabled, sem uso/limite (nulos, não fabricados)', async () => {
    const prisma = makePrisma();
    const service = new AiUsageService(makeConfig(), prisma, makeCache() as any);
    await service.recordBlocked({ userId: 'user-8', reason: 'disabled', plan: 'pro' });
    const arg = prisma.analyticsEvent.create.mock.calls[0][0];
    expect(arg.data.event).toBe('ai_llm_blocked');
    expect(arg.data.props).toMatchObject({ reason: 'disabled', plan: 'pro' });
    expect(arg.data.props.used).toBeNull();
    expect(arg.data.props.limit).toBeNull();
  });

  it('sem Prisma o registro de bloqueio é no-op seguro (nunca lança)', async () => {
    const service = new AiUsageService(makeConfig(), undefined, makeCache() as any);
    await expect(
      service.recordBlocked({ reason: 'disabled' }),
    ).resolves.toBeUndefined();
  });

  it('falha ao persistir NÃO propaga (telemetria não derruba a tutora)', async () => {
    const prisma = makePrisma();
    prisma.analyticsEvent.create.mockRejectedValue(new Error('db down'));
    const service = new AiUsageService(makeConfig(), prisma, makeCache() as any);
    await expect(
      service.recordBlocked({ userId: 'user-9', reason: 'quota-exceeded', plan: 'free' }),
    ).resolves.toBeUndefined();
  });
});
