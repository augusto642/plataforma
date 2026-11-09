import { AnalyticsService, ANALYTICS_SCHEMA_VERSION } from './analytics.service';
import { TrackEventsDto } from './dto/track-events.dto';

// B08 (mínimo) — o service persiste o lote inteiro numa única escrita,
// mapeando o envelope do cliente para as colunas da tabela e carimbando
// a versão do esquema dentro de props.
describe('AnalyticsService', () => {
  function makeService() {
    const prisma = {
      analyticsEvent: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('persiste o lote com createMany e devolve a contagem aceita', async () => {
    const { service, prisma } = makeService();
    prisma.analyticsEvent.createMany.mockResolvedValue({ count: 2 });

    const dto: TrackEventsDto = {
      events: [
        {
          event: 'hero_cta',
          ctaId: 'hero_primary',
          sessionId: 'sess-1',
          path: '/',
          ts: '2026-10-20T23:00:00.000Z',
        },
        { event: 'signup_success', sessionId: 'sess-1', path: '/register' },
      ],
    };

    const result = await service.trackBatch(dto);

    expect(result).toEqual({ accepted: 2 });
    expect(prisma.analyticsEvent.createMany).toHaveBeenCalledTimes(1);
    const { data } = prisma.analyticsEvent.createMany.mock.calls[0][0];
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      event: 'hero_cta',
      ctaId: 'hero_primary',
      sessionId: 'sess-1',
      path: '/',
    });
    expect(data[0].props).toMatchObject({
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      clientTs: '2026-10-20T23:00:00.000Z',
    });
  });

  it('preenche nulos nos campos opcionais ausentes e preserva props do cliente', async () => {
    const { service, prisma } = makeService();

    await service.trackBatch({
      events: [{ event: 'pricing_cta', props: { plan: 'pro' } }],
    });

    const { data } = prisma.analyticsEvent.createMany.mock.calls[0][0];
    expect(data[0].ctaId).toBeNull();
    expect(data[0].sessionId).toBeNull();
    expect(data[0].path).toBeNull();
    expect(data[0].props).toMatchObject({
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      plan: 'pro',
    });
    expect(data[0].props.clientTs).toBeUndefined();
  });

  it('persiste o visitorId persistente quando o cliente o envia (Sprint 5)', async () => {
    const { service, prisma } = makeService();

    await service.trackBatch({
      events: [
        { event: 'pageview', visitorId: 'visitor-42', path: '/' },
        { event: 'signup_success', sessionId: 'sess-9', path: '/register' },
      ],
    });

    const { data } = prisma.analyticsEvent.createMany.mock.calls[0][0];
    expect(data[0].visitorId).toBe('visitor-42');
    expect(data[1].visitorId).toBeNull();
  });

  it('getFunnelSummary agrega totais, cliques por CTA, cadastros por campanha e visitantes únicos', async () => {
    const { service, prisma } = makeService();
    prisma.analyticsEvent.groupBy
      .mockResolvedValueOnce([
        { event: 'pageview', _count: { _all: 120 } },
        { event: 'hero_cta', _count: { _all: 40 } },
        { event: 'signup_success', _count: { _all: 12 } },
      ])
      .mockResolvedValueOnce([
        { event: 'hero_cta', ctaId: 'hero_primary', _count: { _all: 31 } },
        { event: 'pricing_cta', ctaId: 'pricing_pro', _count: { _all: 9 } },
      ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { campaign: 'lancamento', count: 7 },
        { campaign: null, count: 5 },
      ])
      .mockResolvedValueOnce([{ count: 98 }])
      // Sprint 8 — terceira query crua: visualizações por etapa do prólogo
      .mockResolvedValueOnce([]);

    const summary = await service.getFunnelSummary();

    expect(summary.totalsByEvent).toEqual({
      pageview: 120,
      hero_cta: 40,
      signup_success: 12,
    });
    expect(summary.clicksByCta).toEqual([
      { event: 'hero_cta', ctaId: 'hero_primary', count: 31 },
      { event: 'pricing_cta', ctaId: 'pricing_pro', count: 9 },
    ]);
    expect(summary.signupsByCampaign).toEqual([
      { campaign: 'lancamento', count: 7 },
      { campaign: '(sem campanha)', count: 5 },
    ]);
    expect(summary.uniqueVisitors).toBe(98);
    // Sprint 8 — sem eventos de missão/etapa, as agregações novas zeram
    // (estado vazio honesto, sem invenção) e não há cadastro por porta
    expect(summary.mission).toEqual({ started: 0, completed: 0, failed: 0, skipped: 0 });
    expect(summary.onboarding).toEqual({ steps: [], resumed: 0 });
    expect(summary.signupsByDoor).toEqual([]);
    // a quebra por CTA só conta eventos com ctaId
    expect(prisma.analyticsEvent.groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { ctaId: { not: null } } }),
    );
  });

  it('getFunnelSummary agrega Missão 1, etapas do prólogo e cadastros por porta (Sprint 8)', async () => {
    const { service, prisma } = makeService();
    prisma.analyticsEvent.groupBy
      .mockResolvedValueOnce([
        { event: 'pageview', _count: { _all: 200 } },
        { event: 'mission_started', _count: { _all: 60 } },
        { event: 'mission_completed', _count: { _all: 41 } },
        { event: 'mission_failed', _count: { _all: 12 } },
        { event: 'mission_skipped', _count: { _all: 9 } },
        { event: 'onboarding_resumed', _count: { _all: 15 } },
        { event: 'signup_success', _count: { _all: 30 } },
      ])
      .mockResolvedValueOnce([
        { event: 'signup_success', ctaId: 'onboarding_save', _count: { _all: 22 } },
        { event: 'signup_success', ctaId: 'register_submit', _count: { _all: 8 } },
        { event: 'hero_cta', ctaId: 'hero_primary', _count: { _all: 90 } },
      ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 150 }])
      .mockResolvedValueOnce([
        { step: 'mascot', count: 180 },
        { step: 'mission', count: 140 },
        { step: 'account', count: 55 },
        { step: null, count: 2 },
      ]);

    const summary = await service.getFunnelSummary();

    expect(summary.mission).toEqual({ started: 60, completed: 41, failed: 12, skipped: 9 });
    expect(summary.onboarding.resumed).toBe(15);
    expect(summary.onboarding.steps).toEqual([
      { step: 'mascot', count: 180 },
      { step: 'mission', count: 140 },
      { step: 'account', count: 55 },
      { step: '(sem etapa)', count: 2 },
    ]);
    // porta = ctaId do signup_success; outros eventos ficam fora da quebra
    expect(summary.signupsByDoor).toEqual([
      { door: 'onboarding_save', count: 22 },
      { door: 'register_submit', count: 8 },
    ]);
  });

  it('aceita os eventos da Missão 1 e do prólogo no lote (catálogo Sprint 8)', async () => {
    const { service, prisma } = makeService();

    const result = await service.trackBatch({
      events: [
        { event: 'mission_started', props: { source: 'onboarding', starter: 'pythox', attempt: 1 } },
        { event: 'mission_skipped', props: { source: 'onboarding', attempted: false } },
        { event: 'onboarding_step_viewed', props: { step: 'mission' } },
        { event: 'onboarding_resumed', props: { step: 'tier' } },
      ],
    });

    expect(result).toEqual({ accepted: 4 });
    const { data } = prisma.analyticsEvent.createMany.mock.calls[0][0];
    expect(data.map((d: any) => d.event)).toEqual([
      'mission_started',
      'mission_skipped',
      'onboarding_step_viewed',
      'onboarding_resumed',
    ]);
    expect(data[0].props).toMatchObject({ starter: 'pythox', attempt: 1 });
    expect(data[1].props).toMatchObject({ attempted: false });
  });
});
