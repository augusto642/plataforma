import {
  findXpDivergences,
  reconcileXp,
  xpForSubmission,
  XpReconSubmission,
} from './xp-reconciliation';

/**
 * C8 (Lote 1) — Reconciliação users.xp × XP esperado das submissões.
 * Cobre a fórmula normal (70/20 + bônus 50) e o prêmio de battle
 * (battleResult.xpGained), e prova que divergências plantadas são
 * detectadas — e corrigidas só com fix=true.
 */
describe('xp-reconciliation (C8)', () => {
  const sub = (overrides: Partial<XpReconSubmission>): XpReconSubmission => ({
    id: 'sub-1',
    userId: 'user-1',
    status: 'passed',
    score: 100,
    xpAwarded: true,
    isBattleRun: false,
    ...overrides,
  });

  describe('xpForSubmission', () => {
    it('passed perfeito vale 120 (70 + 50)', () => {
      expect(xpForSubmission(sub({}))).toBe(120);
    });

    it('passed sem perfeito vale 70; failed vale 20', () => {
      expect(xpForSubmission(sub({ score: 80 }))).toBe(70);
      expect(xpForSubmission(sub({ status: 'failed', score: 50 }))).toBe(20);
    });

    it('sem claim (xpAwarded=false) vale 0', () => {
      expect(xpForSubmission(sub({ xpAwarded: false }))).toBe(0);
    });

    it('battle usa battleResult.xpGained, não a fórmula normal', () => {
      expect(
        xpForSubmission(
          sub({ isBattleRun: true, battleResult: { xpGained: 80 } }),
        ),
      ).toBe(80);
      expect(
        xpForSubmission(
          sub({ isBattleRun: true, status: 'failed', score: 50, battleResult: { xpGained: 13 } }),
        ),
      ).toBe(13);
      // Battle sem resultado guardado não inventa XP.
      expect(xpForSubmission(sub({ isBattleRun: true, battleResult: null }))).toBe(0);
    });
  });

  describe('findXpDivergences', () => {
    it('detecta XP perdido e XP a mais; ignora usuários consistentes', () => {
      const users = [
        { id: 'user-1', email: 'a@x.com', xp: 100 }, // esperado 120 -> perdeu 20
        { id: 'user-2', email: 'b@x.com', xp: 200 }, // esperado 120 -> 80 a mais
        { id: 'user-3', email: 'c@x.com', xp: 70 }, // consistente
      ];
      const submissions = [
        sub({ id: 's1', userId: 'user-1' }),
        sub({ id: 's2', userId: 'user-2' }),
        sub({ id: 's3', userId: 'user-3', score: 80 }),
      ];

      const divergences = findXpDivergences(users, submissions);

      expect(divergences).toHaveLength(2);
      expect(divergences).toContainEqual(
        expect.objectContaining({ userId: 'user-1', actualXp: 100, expectedXp: 120, delta: 20 }),
      );
      expect(divergences).toContainEqual(
        expect.objectContaining({ userId: 'user-2', actualXp: 200, expectedXp: 120, delta: -80 }),
      );
    });
  });

  describe('reconcileXp', () => {
    function buildPrisma(users: any[], submissions: any[]) {
      const updates: any[] = [];
      return {
        prisma: {
          user: {
            findMany: jest.fn(async () => users),
            update: jest.fn(async (args: any) => {
              updates.push(args);
              return args.data;
            }),
          },
          submission: { findMany: jest.fn(async () => submissions) },
          $transaction: jest.fn(async (cb: any) =>
            cb({
              user: {
                update: jest.fn(async (args: any) => {
                  updates.push(args);
                  return args.data;
                }),
              },
            }),
          ),
        },
        updates,
      };
    }

    it('modo leitura (padrão) lista a divergência plantada sem corrigir', async () => {
      const { prisma, updates } = buildPrisma(
        [{ id: 'user-1', email: 'a@x.com', xp: 0 }],
        [sub({})], // esperado 120, perfil com 0 -> XP perdido
      );

      const report = await reconcileXp(prisma as any);

      expect(report.checkedUsers).toBe(1);
      expect(report.checkedSubmissions).toBe(1);
      expect(report.divergences).toEqual([
        { userId: 'user-1', email: 'a@x.com', actualXp: 0, expectedXp: 120, delta: 120 },
      ]);
      expect(report.fixed).toBe(0);
      expect(updates).toHaveLength(0);
    });

    it('fix=true corrige xp e recalcula o level na transação', async () => {
      const { prisma, updates } = buildPrisma(
        [{ id: 'user-1', email: 'a@x.com', xp: 0 }],
        [sub({}), sub({ id: 's2', score: 80 })], // 120 + 70 = 190 -> level 1
      );

      const report = await reconcileXp(prisma as any, { fix: true });

      expect(report.fixed).toBe(1);
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        where: { id: 'user-1' },
        data: { xp: 190, level: 1 },
      });
    });
  });
});
