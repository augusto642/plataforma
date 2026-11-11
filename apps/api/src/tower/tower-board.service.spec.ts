import { TowerBoardService } from './tower-board.service';
import type { TowerPrismaClient } from './tower-prisma.types';

describe('TowerBoardService', () => {
  const board = new TowerBoardService();

  it('cada andar tem 30 casas com a distribuição 18 código + 5 quiz + 3 mini-games + 3 item + 1 final', () => {
    for (const floor of [1, 2, 3]) {
      expect(board.countByType(floor)).toEqual({
        code: 18,
        quiz: 5,
        minigame: 3,
        item: 3,
        final: 1,
      });
      expect(board.getFloorSquares(floor)).toHaveLength(30);
    }
  });

  it('dificuldade cresce ao longo do andar; casa 30 é o guardião (420 s)', () => {
    expect(board.getSquare(1, 1).difficulty).toBe('easy');
    expect(board.getSquare(1, 1).timeLimitSeconds).toBe(90);
    expect(board.getSquare(1, 10).difficulty).toBe('easy');
    expect(board.getSquare(1, 11).difficulty).toBe('medium');
    expect(board.getSquare(1, 11).timeLimitSeconds).toBe(180);
    expect(board.getSquare(1, 20).difficulty).toBe('medium');
    expect(board.getSquare(1, 21).difficulty).toBe('hard');
    expect(board.getSquare(1, 21).timeLimitSeconds).toBe(300);
    expect(board.getSquare(1, 30)).toMatchObject({
      type: 'final',
      difficulty: 'guardian',
      timeLimitSeconds: 420,
      activitySlug: 'torre-f1-guardiao',
    });
  });

  it('casas especiais no layout fixo; o resto é código', () => {
    expect(board.getSquare(1, 3).type).toBe('quiz');
    expect(board.getSquare(1, 8).type).toBe('quiz');
    expect(board.getSquare(1, 6).type).toBe('minigame');
    expect(board.getSquare(1, 10).type).toBe('item');
    expect(board.getSquare(1, 1).type).toBe('code');
    expect(board.getSquare(1, 2).type).toBe('code');
    expect(board.getSquare(1, 3).activitySlug).toBeNull();
    expect(board.getSquare(1, 1).activitySlug).toBe('torre-f1-c1');
    expect(board.getSquare(1, 2).activitySlug).toBe('torre-f1-c2');
    expect(board.getSquare(1, 4).activitySlug).toBe('torre-f1-c3');
  });

  it('rejeita andar/casa fora do intervalo', () => {
    expect(() => board.getSquare(0, 1)).toThrow('Andar inválido');
    expect(() => board.getSquare(1, 0)).toThrow('Casa inválida');
    expect(() => board.getSquare(1, 31)).toThrow('Casa inválida');
  });

  it('resolveActivityId retorna null sem curso semeado e o id com conteúdo', async () => {
    const noCourse = {
      course: { findUnique: async () => null },
      activity: { findUnique: async () => null },
    } as unknown as TowerPrismaClient;
    await expect(board.resolveActivityId(noCourse, 1, 1)).resolves.toBeNull();

    const seeded = {
      course: { findUnique: async () => ({ id: 'course-1' }) },
      activity: {
        findUnique: async () => ({ id: 'act-f1-c1' }),
      },
    } as unknown as TowerPrismaClient;
    await expect(board.resolveActivityId(seeded, 1, 1)).resolves.toBe('act-f1-c1');
  });
});
