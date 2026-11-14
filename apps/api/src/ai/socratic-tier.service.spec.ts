import { SocraticTierService } from './socratic-tier.service';

/** M12 — specs do SocraticTierService (extraído do AiService). */
describe('SocraticTierService', () => {
  const prismaMock = {
    submission: { count: jest.fn() },
    aiChatMessage: { count: jest.fn() },
  };
  const service = new SocraticTierService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tierFromSignals', () => {
    it('Tier 1 com 0-1 falhas e poucas mensagens', () => {
      expect(service.tierFromSignals(0, 0)).toBe(1);
      expect(service.tierFromSignals(1, 2)).toBe(1);
    });

    it('Tier 2 com 2 falhas ou 3 mensagens', () => {
      expect(service.tierFromSignals(2, 0)).toBe(2);
      expect(service.tierFromSignals(0, 3)).toBe(2);
    });

    it('Tier 3 com 3+ falhas ou 6+ mensagens', () => {
      expect(service.tierFromSignals(3, 0)).toBe(3);
      expect(service.tierFromSignals(0, 6)).toBe(3);
    });
  });

  describe('countTierSignals', () => {
    it('conta falhas e mensagens em paralelo', async () => {
      prismaMock.submission.count.mockResolvedValue(2);
      prismaMock.aiChatMessage.count.mockResolvedValue(4);
      await expect(service.countTierSignals('u1', 'a1')).resolves.toEqual({
        failedCount: 2,
        chatCount: 4,
      });
      expect(prismaMock.submission.count).toHaveBeenCalledWith({
        where: { userId: 'u1', activityId: 'a1', status: { in: ['failed', 'error'] } },
      });
      expect(prismaMock.aiChatMessage.count).toHaveBeenCalledWith({
        where: { userId: 'u1', activityId: 'a1' },
      });
    });
  });

  describe('calculateTier', () => {
    it('deriva o tier dos sinais lidos', async () => {
      prismaMock.submission.count.mockResolvedValue(2);
      prismaMock.aiChatMessage.count.mockResolvedValue(1);
      await expect(service.calculateTier('u1', 'a1')).resolves.toBe(2);
    });

    it('falha na leitura degrada para Tier 1 (fail-open)', async () => {
      prismaMock.submission.count.mockRejectedValue(new Error('db down'));
      prismaMock.aiChatMessage.count.mockResolvedValue(9);
      await expect(service.calculateTier('u1', 'a1')).resolves.toBe(1);
    });
  });

  describe('Pacote 1.2 — getHintUsage & recordHintUsage', () => {
    it('calcula o próximo nível de dica e limites até 3', async () => {
      (prismaMock as any).activityHintUsage = {
        findMany: jest.fn().mockResolvedValue([
          { hintLevel: 1, xpPenaltyPercent: 10 },
        ]),
        upsert: jest.fn().mockResolvedValue({ hintLevel: 2, xpPenaltyPercent: 25 }),
      };

      const usage = await service.getHintUsage('u1', 'a1');
      expect(usage.consumedCount).toBe(1);
      expect(usage.maxHints).toBe(3);
      expect(usage.nextHintLevel).toBe(2);
      expect(usage.currentPenaltyPercent).toBe(10);
      expect(usage.canRequestHint).toBe(true);

      const recorded = await service.recordHintUsage('u1', 'a1', 2);
      expect(recorded.penaltyPercent).toBe(25);
    });

    it('bloqueia novas dicas quando atingir 3 dicas consumidas', async () => {
      (prismaMock as any).activityHintUsage = {
        findMany: jest.fn().mockResolvedValue([
          { hintLevel: 1, xpPenaltyPercent: 10 },
          { hintLevel: 2, xpPenaltyPercent: 25 },
          { hintLevel: 3, xpPenaltyPercent: 50 },
        ]),
      };

      const usage = await service.getHintUsage('u1', 'a1');
      expect(usage.consumedCount).toBe(3);
      expect(usage.canRequestHint).toBe(false);
      expect(usage.currentPenaltyPercent).toBe(50);
    });
  });
});
