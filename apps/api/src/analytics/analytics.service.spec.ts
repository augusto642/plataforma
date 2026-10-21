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
      },
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
});
