import { SocraticGuidanceService } from './socratic-guidance.service';
import { SocraticTierService } from './socratic-tier.service';

/** M12 — specs do SocraticGuidanceService (extraído do AiService). */
describe('SocraticGuidanceService', () => {
  const prismaMock = {
    submission: { count: jest.fn().mockResolvedValue(0) },
    aiChatMessage: { count: jest.fn().mockResolvedValue(0) },
  };
  const cacheMock = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const tier = new SocraticTierService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.submission.count.mockResolvedValue(0);
    prismaMock.aiChatMessage.count.mockResolvedValue(0);
    cacheMock.get.mockResolvedValue(undefined);
    cacheMock.set.mockResolvedValue(undefined);
  });

  it('sem cache: calcula, marca cached=false e tenta gravar por 3600s', async () => {
    const service = new SocraticGuidanceService(tier, cacheMock as any);
    const res = await service.generateSocraticGuidance({ question: 'estou com um bug', starterName: 'Pyra' });
    expect(res.hint).toContain('Bugs e falhas de runtime');
    expect(res.socraticQuestion).toContain('tipo esperado e o tipo que você calculou');
    expect(res.cached).toBe(false);
    expect(res.tier).toBe(1);
    expect(cacheMock.set).toHaveBeenCalledWith(
      expect.stringContaining('ai:socratic:general:'),
      expect.objectContaining({ cached: false }),
      3600,
    );
  });

  it('cache hit: devolve o cached com cached=true, sem recalcular o tier', async () => {
    const cached = {
      hint: 'h',
      socraticQuestion: 'q',
      tier: 2,
      timestamp: '2026-11-07T00:00:00.000Z',
      cached: false,
    };
    cacheMock.get.mockResolvedValue(cached);
    const service = new SocraticGuidanceService(tier, cacheMock as any);
    const res = await service.generateSocraticGuidance({ question: 'bug', starterName: 'Pyra' });
    expect(res).toEqual({ ...cached, cached: true });
    expect(prismaMock.submission.count).not.toHaveBeenCalled();
    expect(cacheMock.set).not.toHaveBeenCalled();
  });

  it('falha ao ler o cache: calcula normalmente (fail-open)', async () => {
    cacheMock.get.mockRejectedValue(new Error('redis down'));
    const service = new SocraticGuidanceService(tier, cacheMock as any);
    const res = await service.generateSocraticGuidance({ question: 'meu loop infinito', starterName: 'Byte' });
    expect(res.hint).toContain('condição de terminação');
    expect(res.cached).toBe(false);
  });

  it('sem CacheService: funciona sem cache', async () => {
    const service = new SocraticGuidanceService(tier);
    const res = await service.generateSocraticGuidance({ question: 'como resolvo?', starterName: 'Giga' });
    expect(res.hint).toContain('Giga');
    expect(res.socraticQuestion).toContain('caso base da sua função');
  });

  it('com challengeId + userId: tier vem dos sinais', async () => {
    prismaMock.submission.count.mockResolvedValue(3);
    const service = new SocraticGuidanceService(tier, cacheMock as any);
    const res = await service.generateSocraticGuidance(
      { question: 'complexidade do meu código', challengeId: 'act-1' },
      'user-1',
    );
    expect(res.tier).toBe(3);
    expect(res.hint).toContain('tempo e memória');
  });

  it('ramo imposto/preço: pergunta sobre o tipo do resultado', async () => {
    const service = new SocraticGuidanceService(tier);
    const res = await service.generateSocraticGuidance({ question: 'como calculo o preco com imposto?' });
    expect(res.hint).toContain('precedência de operadores');
    expect(res.socraticQuestion).toContain('número ou uma string');
  });
});
