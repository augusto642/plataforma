import { DiceService } from './dice.service';
import { TowerBoardService } from './tower-board.service';
import { TOWER_DEFAULT_ITEMS } from './tower.constants';
import { TowerService } from './tower.service';
import { getTowerObjectiveQuestion } from './tower-objectives';
import type {
  TowerActivityRow,
  TowerMoveRow,
  TowerPrismaClient,
  TowerProgressRow,
  TowerUserRow,
} from './tower-prisma.types';

/**
 * Fake em memória do Prisma usado pelos testes da torre (sem banco).
 * Implementa só a interface TowerPrismaClient; $transaction executa o
 * callback com o próprio fake (sem isolamento real — o isolamento é
 * responsabilidade do Postgres em produção).
 */
class FakePrisma implements TowerPrismaClient {
  users = new Map<string, TowerUserRow>();
  progresses = new Map<string, TowerProgressRow>();
  moves: TowerMoveRow[] = [];
  courses = new Map<string, { id: string; slug: string }>();
  activities = new Map<string, TowerActivityRow & { courseId: string; slug: string }>();
  submissions: Record<string, unknown>[] = [];
  testResults: Record<string, unknown>[] = [];
  activeEffects: Array<{
    id: string;
    userId: string;
    effectType: string;
    charges: number;
  }> = [];
  parties: Array<{
    id: string;
    name: string;
    floor: number;
    leaderId: string;
    members: unknown;
    status: string;
  }> = [];
  private seq = 1;

  user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.get(where.id) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { coins: { increment?: number; decrement?: number } };
    }) => {
      const user = this.users.get(where.id);
      if (!user) throw new Error('user not found');
      user.coins =
        (user.coins ?? 0) +
        (data.coins.increment ?? 0) -
        (data.coins.decrement ?? 0);
      return user;
    },
  };

  towerActiveEffect = {
    findFirst: jest.fn(
      async ({
        where,
      }: {
        where: { userId: string; effectType: string; charges: { gt: number } };
      }) =>
        this.activeEffects.find(
          (effect) =>
            effect.userId === where.userId &&
            effect.effectType === where.effectType &&
            effect.charges > where.charges.gt,
        ) ?? null,
    ),
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.activeEffects.findIndex((effect) => effect.id === where.id);
      if (index < 0) throw new Error('tower effect not found');
      return this.activeEffects.splice(index, 1)[0];
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { charges: number };
    }) => {
      const effect = this.activeEffects.find((item) => item.id === where.id);
      if (!effect) throw new Error('tower effect not found');
      effect.charges = data.charges;
      return effect;
    },
    findMany: jest.fn(async () => []),
    create: jest.fn(
      async ({ data }: { data: { userId: string; effectType: string; charges: number } }) => {
        const effect = { id: `effect-${this.seq++}`, ...data };
        this.activeEffects.push(effect);
        return effect;
      },
    ),
  };

  towerItem = {
    findMany: jest.fn(async () => []),
  };

  towerParty = {
    findMany: async ({ where }: { where: { status?: string } }) =>
      this.parties.filter((party) => !where.status || party.status === where.status),
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.parties.find((party) => party.id === where.id) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const party = {
        id: `party-${this.seq++}`,
        name: data.name as string,
        floor: data.floor as number,
        leaderId: data.leaderId as string,
        members: data.members,
        status: data.status as string,
      };
      this.parties.push(party);
      return party;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const party = this.parties.find((candidate) => candidate.id === where.id);
      if (!party) throw new Error('tower party not found');
      Object.assign(party, data);
      return party;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.parties.findIndex((party) => party.id === where.id);
      if (index < 0) throw new Error('tower party not found');
      return this.parties.splice(index, 1)[0];
    },
  };

  inventory: Array<{ id: string; userId: string; itemCode: string; quantity: number }> = [];
  userTowerInventory = {
    findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
      this.inventory.filter((item) => item.userId === where.userId),
    ),
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { userId_itemCode: { userId: string; itemCode: string } };
      create: { userId: string; itemCode: string; quantity: number };
      update: { quantity: { increment: number } };
    }) => {
      const { userId, itemCode } = where.userId_itemCode;
      const item = this.inventory.find(
        (entry) => entry.userId === userId && entry.itemCode === itemCode,
      );
      if (item) {
        item.quantity += update.quantity.increment;
        return item;
      }
      const created = {
        id: `inventory-${this.seq++}`,
        ...create,
      };
      this.inventory.push(created);
      return created;
    },
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { userId: string; itemCode: string; quantity: { gt: number } };
        data: { quantity: { decrement: number } };
      }) => {
        const item = this.inventory.find(
          (entry) =>
            entry.userId === where.userId &&
            entry.itemCode === where.itemCode &&
            entry.quantity > where.quantity.gt,
        );
        if (!item) return { count: 0 };
        item.quantity -= data.quantity.decrement;
        return { count: 1 };
      },
    ),
  };

  towerProgress = {
    findUnique: async ({ where }: { where: { userId: string } }) =>
      this.progresses.get(where.userId) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row: TowerProgressRow = {
        id: `progress-${this.seq++}`,
        userId: data.userId as string,
        floor: (data.floor as number) ?? 1,
        square: (data.square as number) ?? 0,
        movesLeftToday: data.movesLeftToday as number,
        movesResetDate: data.movesResetDate as Date,
        powers: [],
        updatedAt: new Date(),
      };
      this.progresses.set(row.userId, row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = [...this.progresses.values()].find((p) => p.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
  };

  towerMove = {
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, string>;
    }) => {
      const found = this.moves.filter((m) =>
        Object.entries(where).every(([k, v]) => (m as unknown as Record<string, unknown>)[k] === v),
      );
      if (orderBy?.createdAt === 'desc') {
        found.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return found[0] ?? null;
    },
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, string>;
      take?: number;
    }) => {
      const found = this.moves.filter((move) =>
        Object.entries(where).every(([key, value]) => {
          const current = (move as unknown as Record<string, unknown>)[key];
          if (key === 'userId' && typeof value === 'object' && value !== null && 'in' in value) {
            return (value as { in: string[] }).in.includes(current as string);
          }
          if (key === 'createdAt' && typeof value === 'object' && value !== null && 'gte' in value) {
            return (current as Date) >= (value as { gte: Date }).gte;
          }
          return current === value;
        }),
      );
      if (orderBy?.createdAt === 'desc') {
        found.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return take ? found.slice(0, take) : found;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row: TowerMoveRow = {
        id: `move-${this.seq++}`,
        userId: data.userId as string,
        floor: data.floor as number,
        fromSquare: data.fromSquare as number,
        roll: data.roll as number,
        toSquare: data.toSquare as number,
        squareType: data.squareType as string,
        activityId: (data.activityId as string) ?? null,
        result: (data.result as string) ?? null,
        xpGained: (data.xpGained as number) ?? 0,
        timeBonusSeconds: (data.timeBonusSeconds as number) ?? 0,
        createdAt: new Date(),
      };
      this.moves.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = this.moves.find((m) => m.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
  };

  course = {
    findUnique: async ({ where }: { where: { slug: string } }) =>
      [...this.courses.values()].find((c) => c.slug === where.slug) ?? null,
  };

  activity = {
    findUnique: async ({
      where,
    }: {
      where: { id: string } | { courseId_slug: { courseId: string; slug: string } };
    }) => {
      if ('id' in where) return this.activities.get(where.id) ?? null;
      return (
        [...this.activities.values()].find(
          (a) => a.courseId === where.courseId_slug.courseId && a.slug === where.courseId_slug.slug,
        ) ?? null
      );
    },
  };

  submission = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `sub-${this.seq++}`, ...data };
      this.submissions.push(row);
      return { id: row.id as string };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.submissions.find((submission) => submission.id === where.id);
      if (!row) throw new Error('submission not found');
      Object.assign(row, data);
      return { id: row.id as string };
    },
  };

  testCaseResult = {
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      this.testResults.push(...data);
      return { count: data.length };
    },
  };

  async $transaction<T>(fn: (tx: TowerPrismaClient) => Promise<T>): Promise<T> {
    return fn(this as unknown as TowerPrismaClient);
  }

  async $queryRaw(): Promise<unknown> {
    return [];
  }
}

const USER_FREE = 'user-free';
const USER_PRO = 'user-pro';

function buildService(fake: FakePrisma) {
  const dice = new DiceService();
  const board = new TowerBoardService();
  const runner = {
    executeInSandbox: jest.fn(),
  };
  const gamification = {
    awardSubmissionXp: jest.fn(),
    awardTowerObjectiveXp: jest.fn(),
  };
  const service = new TowerService(
    fake as unknown as never,
    dice,
    board,
    runner as unknown as never,
    gamification as unknown as never,
  );
  return { service, dice, runner, gamification };
}

/** Semeia o curso e as atividades do andar 1 (e o guardião do andar 30) no fake. */
function seedContent(fake: FakePrisma) {
  fake.courses.set('course-1', { id: 'course-1', slug: 'torre-de-desafios' });
  for (let i = 1; i <= 18; i++) {
    fake.activities.set(`act-f1-c${i}`, {
      id: `act-f1-c${i}`,
      title: `Desafio ${i}`,
      courseId: 'course-1',
      slug: `torre-f1-c${i}`,
      language: 'javascript',
      testCode: '',
      hiddenTests: null,
      timeLimitMs: 5000,
      memoryLimitMb: 256,
    });
  }
  fake.activities.set('act-f1-guardiao', {
    id: 'act-f1-guardiao',
    title: 'Guardião do andar 1',
    courseId: 'course-1',
    slug: 'torre-f1-guardiao',
    language: 'javascript',
    testCode: '',
    hiddenTests: null,
    timeLimitMs: 5000,
    memoryLimitMb: 256,
  });
  fake.activities.set('act-f30-guardiao', {
    id: 'act-f30-guardiao',
    title: 'Guardião do andar 30',
    courseId: 'course-1',
    slug: 'torre-f30-guardiao',
    language: 'javascript',
    testCode: '',
    hiddenTests: null,
    timeLimitMs: 5000,
    memoryLimitMb: 256,
  });
}

function setupUsers(fake: FakePrisma) {
  fake.users.set(USER_FREE, { id: USER_FREE, plan: 'free', careerTier: 'beginner', coins: 0 });
  fake.users.set(USER_PRO, { id: USER_PRO, plan: 'pro', careerTier: 'beginner', coins: 0 });
}

const passedEvaluation = {
  status: 'passed',
  kind: 'passed',
  score: 100,
  maxScore: 100,
  durationMs: 42,
  testCases: [{ name: 't1', passed: true, durationMs: 10 }],
};

const failedEvaluation = {
  status: 'failed',
  kind: 'failed',
  score: 0,
  maxScore: 100,
  durationMs: 42,
  testCases: [{ name: 't1', passed: false, durationMs: 10, errorMessage: 'x' }],
};

describe('TowerService (Fase 1 — loop rolar → resolver)', () => {
  let fake: FakePrisma;

  beforeEach(() => {
    fake = new FakePrisma();
    setupUsers(fake);
    seedContent(fake);
    jest.clearAllMocks();
  });

  describe('getProgress', () => {
    it('cria o progresso com 5 jogadas para usuário grátis', async () => {
      const { service } = buildService(fake);
      const view = await service.getProgress(USER_FREE);
      expect(view).toMatchObject({
        floor: 1,
        square: 0,
        movesLeftToday: 5,
        dailyMovesLimit: 5,
        plan: 'free',
        maxFloor: 30,
        pendingChallenge: null,
      });
    });

    it('dá 10 jogadas por dia para assinante', async () => {
      const { service } = buildService(fake);
      const view = await service.getProgress(USER_PRO);
      expect(view.dailyMovesLimit).toBe(10);
      expect(view.movesLeftToday).toBe(10);
    });

    it('reseta as jogadas quando o dia virou', async () => {
      const { service } = buildService(fake);
      await service.getProgress(USER_FREE);
      const progress = fake.progresses.get(USER_FREE)!;
      progress.movesLeftToday = 0;
      progress.movesResetDate = new Date('2026-11-06T00:00:00.000Z');
      const view = await service.getProgress(USER_FREE);
      expect(view.movesLeftToday).toBe(5);
    });

    it('lança 404 para usuário inexistente', async () => {
      const { service } = buildService(fake);
      await expect(service.getProgress('inexistente')).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('roll', () => {
    it('casa de quiz cria um desafio pendente e mantém a posição até responder', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]); // casa 3 = quiz
      const result = await service.roll(USER_FREE);
      expect(result).toMatchObject({ roll: 3, fromSquare: 0, toSquare: 3, movesLeftToday: 4 });
      expect(result.square?.type).toBe('quiz');
      expect(result.pendingChallenge).toMatchObject({
        activityId: null,
        squareType: 'quiz',
        objective: {
          kind: 'quiz',
          title: 'Quiz rápido',
          prompt: expect.any(String),
          options: expect.any(Array),
        },
      });
      expect(result.pendingChallenge!).not.toHaveProperty('objective.correctOption');
      expect(fake.progresses.get(USER_FREE)!.square).toBe(0);
      expect(fake.moves[0].result).toBe('pending');
      await expect(service.getProgress(USER_FREE)).resolves.toMatchObject({
        pendingChallenge: {
          squareType: 'quiz',
          objective: { prompt: result.pendingChallenge!.objective!.prompt },
        },
      });
    });

    it('creates a persistent bug-hunt challenge on a mini-game square', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([6]);
      const result = await service.roll(USER_FREE);
      expect(result.square?.type).toBe('minigame');
      expect(result.pendingChallenge).toMatchObject({
        squareType: 'minigame',
        objective: {
          kind: 'bug_hunt',
          title: 'Caça ao bug',
          codeSnippet: expect.any(String),
        },
      });
      expect(fake.progresses.get(USER_FREE)!.square).toBe(0);
      expect(fake.moves[0].result).toBe('pending');
    });

    it('creates a gap-fill challenge on the next mini-game square', async () => {
      const { service, dice } = buildService(fake);
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 14;
      dice.setFixedRolls([1]);

      const result = await service.roll(USER_FREE);

      expect(result.pendingChallenge?.objective).toMatchObject({
        kind: 'gap_fill',
        title: 'Complete o código',
        codeSnippet: expect.stringContaining('___'),
      });
    });

    it('aplica e consome o efeito de dado duplo na mesma transação', async () => {
      const { service, dice } = buildService(fake);
      fake.activeEffects.push({
        id: 'effect-1',
        userId: USER_FREE,
        effectType: 'DOUBLE_DICE',
        charges: 1,
      });
      dice.setFixedRolls([1, 2]);

      const result = await service.roll(USER_FREE);

      expect(result.roll).toBe(3);
      expect(fake.activeEffects).toHaveLength(0);
    });

    it('não consome uma jogada se não conseguir ler o efeito ativo', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]);
      jest
        .spyOn(fake.towerActiveEffect, 'findFirst')
        .mockRejectedValue(new Error('effect query failed'));

      await expect(service.roll(USER_FREE)).rejects.toThrow('effect query failed');

      expect(fake.moves).toHaveLength(0);
      expect(fake.progresses.get(USER_FREE)?.movesLeftToday).toBe(5);
    });

    it('casa de código: cria desafio pendente e NÃO avança até resolver', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([1]); // casa 1 = código (90 s)
      const result = await service.roll(USER_FREE);
      expect(result).toMatchObject({ roll: 1, toSquare: 1, movesLeftToday: 4 });
      expect(result.square?.type).toBe('code');
      expect(result.pendingChallenge).toMatchObject({
        activityId: 'act-f1-c1',
        timeLimitSeconds: 90,
      });
      expect(result.pendingChallenge!.deadlineAt).toBeTruthy();
      expect(fake.progresses.get(USER_FREE)!.square).toBe(0);
      expect(fake.moves[0].result).toBe('pending');
    });

    it('segundo roll com desafio pendente → 409', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([1, 2]);
      await service.roll(USER_FREE);
      await expect(service.roll(USER_FREE)).rejects.toThrow(
        'Você tem um desafio pendente na torre',
      );
    });

    it('limite diário esgotado → 429', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]);
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.movesLeftToday = 0;
      await expect(service.roll(USER_FREE)).rejects.toThrow('Limite diário de jogadas esgotado');
      expect(fake.moves).toHaveLength(0);
    });

    it('conteúdo não semeado → 503 e NENHUMA jogada consumida', async () => {
      const { service, dice } = buildService(fake);
      fake.courses.clear();
      dice.setFixedRolls([1]);
      await expect(service.roll(USER_FREE)).rejects.toThrow(
        'O conteúdo da torre ainda não foi semeado',
      );
      expect(fake.progresses.get(USER_FREE)!.movesLeftToday).toBe(5);
      expect(fake.moves).toHaveLength(0);
    });

    it('dado que passa da casa 30 trava na casa 30 (guardião)', async () => {
      const { service, dice } = buildService(fake);
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 29;
      dice.setFixedRolls([6]);
      const result = await service.roll(USER_FREE);
      expect(result.toSquare).toBe(30);
      expect(result.square?.type).toBe('final');
      expect(result.pendingChallenge).toMatchObject({
        activityId: 'act-f1-guardiao',
        timeLimitSeconds: 420,
      });
    });
  });

  describe('submit', () => {
    it('acerto: avança, premia XP (70 + 50 nota 100) e registra a submissão', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue(passedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue({
        xpGained: 120,
        totalXp: 120,
        level: 1,
        streak: 1,
      });

      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      const result = await service.submit(USER_FREE, 'function soma(a, b) { return a + b; }');
      expect(result).toMatchObject({
        result: 'passed',
        score: 100,
        xpGained: 120,
        floor: 1,
        square: 1,
        movesLeftToday: 4,
        guardianDefeated: false,
        tierComplete: false,
      });
      expect(gamification.awardSubmissionXp).toHaveBeenCalledWith(
        USER_FREE,
        'act-f1-c1',
        true,
        100,
        'submission:sub-3',
        fake,
      );
      expect(fake.submissions).toHaveLength(1);
      expect(fake.submissions[0]).toMatchObject({ status: 'passed', xpAwarded: true });
      expect(fake.moves[0]).toMatchObject({ result: 'passed', xpGained: 120 });
    });

    it('does not complete the challenge if the transactional XP award returns no result', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue(passedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue(null);
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);

      await expect(
        service.submit(USER_FREE, 'function soma(a, b) { return a + b; }'),
      ).rejects.toThrow('Não foi possível registrar a recompensa de XP.');

      expect(gamification.awardSubmissionXp).toHaveBeenCalledWith(
        USER_FREE,
        'act-f1-c1',
        true,
        100,
        expect.stringMatching(/^submission:/),
        fake,
      );
    });

    it('erro: volta para a última casa − 1 e premia 20 XP', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue(failedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue({
        xpGained: 20,
        totalXp: 20,
        level: 1,
        streak: 1,
      });
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 3;
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      const result = await service.submit(USER_FREE, 'function maior(a, b) { return a; }');
      expect(result).toMatchObject({ result: 'failed', xpGained: 20, floor: 1, square: 2 });
      expect(fake.moves[0]).toMatchObject({ result: 'failed', xpGained: 20 });
    });

    it('erro na casa 1: não passa de 0', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue(failedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue({
        xpGained: 20,
        totalXp: 20,
        level: 1,
        streak: 1,
      });
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      const result = await service.submit(USER_FREE, 'código errado');
      expect(result.square).toBe(0);
    });

    it('tempo esgotado: volta −1, sem XP e sem submissão', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 3;
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      // Desafio criado há 2 h (limite da casa 4 = 90 s).
      fake.moves[0].createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = await service.submit(USER_FREE, 'function maior(a, b) { return b; }');
      expect(result).toMatchObject({ result: 'timeout', xpGained: 0, score: null, square: 2 });
      expect(runner.executeInSandbox).not.toHaveBeenCalled();
      expect(gamification.awardSubmissionXp).not.toHaveBeenCalled();
      expect(fake.submissions).toHaveLength(0);
      expect(fake.moves[0].result).toBe('timeout');
    });

    it('guardião: passar avança de andar (casa volta para 0)', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue(passedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue({
        xpGained: 120,
        totalXp: 120,
        level: 1,
        streak: 1,
      });
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 29;
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      const result = await service.submit(USER_FREE, 'function classificaTriangulo(a, b, c) { return "Escaleno"; }');
      expect(result).toMatchObject({
        result: 'passed',
        floor: 2,
        square: 0,
        guardianDefeated: true,
        tierComplete: false,
      });
    });

    it('guardião no teto do nível: completa o nível e trava novas rolagens', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue(passedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue({
        xpGained: 120,
        totalXp: 120,
        level: 1,
        streak: 1,
      });
      await service.getProgress(USER_FREE);
      const progress = fake.progresses.get(USER_FREE)!;
      progress.floor = 30;
      progress.square = 29;
      dice.setFixedRolls([1, 1]);
      await service.roll(USER_FREE);
      const result = await service.submit(USER_FREE, 'código do guardião');
      expect(result).toMatchObject({
        result: 'passed',
        floor: 30,
        square: 30,
        guardianDefeated: true,
        tierComplete: true,
      });
      await expect(service.roll(USER_FREE)).rejects.toThrow(
        'Você chegou ao fim do seu nível na torre',
      );
    });

    it('sandbox indisponível: 503, desafio segue pendente, nada registrado', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      runner.executeInSandbox.mockResolvedValue({
        status: 'error',
        kind: 'sandbox_unavailable',
        score: 0,
        maxScore: 100,
        durationMs: 0,
        testCases: [],
      });
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      await expect(service.submit(USER_FREE, 'function soma(a, b) { return a + b; }')).rejects.toThrow(
        'sandbox de execução está temporariamente indisponível',
      );
      expect(fake.moves[0].result).toBe('pending');
      expect(fake.submissions).toHaveLength(0);
      expect(gamification.awardSubmissionXp).not.toHaveBeenCalled();
      // O jogador pode retentar o submit depois.
      const view = await service.getProgress(USER_FREE);
      expect(view.pendingChallenge).toMatchObject({ activityId: 'act-f1-c1' });
    });

    it('sem desafio pendente → 409', async () => {
      const { service } = buildService(fake);
      await expect(service.submit(USER_FREE, 'código')).rejects.toThrow(
        'Nenhum desafio pendente na torre',
      );
    });
  });

  describe('submitObjective', () => {
    it('awards XP and coins only after a correct answer', async () => {
      const { service, dice, gamification } = buildService(fake);
      gamification.awardTowerObjectiveXp.mockResolvedValue({
        xpGained: 120,
        totalXp: 120,
        level: 1,
        streak: 1,
      });
      dice.setFixedRolls([3]);
      await service.roll(USER_FREE);

      const correctOption = getTowerObjectiveQuestion(1, 3).correctOption;
      const result = await service.submitObjective(USER_FREE, correctOption);

      expect(result).toMatchObject({
        result: 'passed',
        score: 100,
        xpGained: 120,
        floor: 1,
        square: 3,
      });
      expect(result.feedback).toBe(getTowerObjectiveQuestion(1, 3).explanation);
      expect(fake.users.get(USER_FREE)?.coins).toBe(15);
      expect(fake.moves[0].result).toBe('passed');
      expect(gamification.awardTowerObjectiveXp).toHaveBeenCalledWith(
        USER_FREE,
        'tower-objective:quiz:1:3',
        true,
        100,
        'tower-objective:move-2',
        fake,
      );
      await expect(service.submitObjective(USER_FREE, correctOption)).rejects.toThrow(
        'Nenhum quiz ou minigame pendente na torre.',
      );
      expect(gamification.awardTowerObjectiveXp).toHaveBeenCalledTimes(1);
    });

    it('resolves bug-hunt mini-games through the same safe objective flow', async () => {
      const { service, dice, gamification } = buildService(fake);
      gamification.awardTowerObjectiveXp.mockResolvedValue({
        xpGained: 120,
        totalXp: 120,
        level: 1,
        streak: 1,
      });
      dice.setFixedRolls([6]);
      await service.roll(USER_FREE);

      const correctOption = getTowerObjectiveQuestion(1, 6).correctOption;
      const result = await service.submitObjective(USER_FREE, correctOption);

      expect(result).toMatchObject({ result: 'passed', square: 6, score: 100 });
      expect(fake.moves[0].result).toBe('passed');
      expect(gamification.awardTowerObjectiveXp).toHaveBeenCalledWith(
        USER_FREE,
        'tower-objective:bug_hunt:1:6',
        true,
        100,
        'tower-objective:move-2',
        fake,
      );
    });

    it('applies the normal failure penalty and records an incorrect answer', async () => {
      const { service, dice, gamification } = buildService(fake);
      gamification.awardTowerObjectiveXp.mockResolvedValue({
        xpGained: 20,
        totalXp: 20,
        level: 1,
        streak: 1,
      });
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 2;
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);

      const correctOption = getTowerObjectiveQuestion(1, 3).correctOption;
      const result = await service.submitObjective(USER_FREE, (correctOption + 1) % 4);

      expect(result).toMatchObject({ result: 'failed', score: 0, square: 1 });
      expect(result.feedback).toContain(
        getTowerObjectiveQuestion(1, 3).options[correctOption],
      );
      expect(fake.users.get(USER_FREE)?.coins).toBe(0);
      expect(fake.moves[0].result).toBe('failed');
      expect(gamification.awardTowerObjectiveXp).toHaveBeenCalledWith(
        USER_FREE,
        'tower-objective:quiz:1:3',
        false,
        0,
        'tower-objective:move-2',
        fake,
      );
    });

    it('marks an expired quiz as timed out and applies the tower penalty', async () => {
      jest.useFakeTimers();
      try {
        jest.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
        const { service, dice, gamification } = buildService(fake);
        dice.setFixedRolls([3]);
        await service.roll(USER_FREE);
        jest.advanceTimersByTime(91_000);

        const result = await service.submitObjective(USER_FREE, 0);

        expect(result).toMatchObject({ result: 'timeout', xpGained: 0, square: 0 });
        expect(fake.moves[0].result).toBe('timeout');
        expect(gamification.awardTowerObjectiveXp).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('rejects quiz submission when the pending move is not a quiz', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);

      await expect(service.submitObjective(USER_FREE, 0)).rejects.toThrow(
        'Nenhum quiz ou minigame pendente na torre.',
      );
    });

    it('rejects an invalid answer index without resolving the pending quiz', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]);
      await service.roll(USER_FREE);

      await expect(service.submitObjective(USER_FREE, 4)).rejects.toThrow(
        'Alternativa inválida.',
      );
      expect(fake.moves[0].result).toBe('pending');
      expect(fake.progresses.get(USER_FREE)?.square).toBe(0);
    });
  });

  describe('merchant and inventory reads', () => {
    it('rejects inventory reads for a user that no longer exists', async () => {
      const { service } = buildService(fake);

      await expect(service.getUserInventory('missing-user')).rejects.toThrow(
        'Usuário não encontrado.',
      );
    });

    it('uses the available default merchant items when the table is empty', async () => {
      const { service } = buildService(fake);

      await expect(service.listMerchantItems()).resolves.toEqual(TOWER_DEFAULT_ITEMS);
    });

    it('propagates merchant read failures instead of returning defaults', async () => {
      const { service } = buildService(fake);
      jest
        .spyOn(fake.towerItem, 'findMany')
        .mockRejectedValue(new Error('merchant query failed'));

      await expect(service.listMerchantItems()).rejects.toThrow('merchant query failed');
    });

    it('propagates inventory read failures instead of returning an empty inventory', async () => {
      const { service } = buildService(fake);
      jest
        .spyOn(fake.userTowerInventory, 'findMany')
        .mockRejectedValue(new Error('inventory query failed'));

      await expect(service.getUserInventory(USER_FREE)).rejects.toThrow(
        'inventory query failed',
      );
    });

    it('rejects unknown merchant items without charging coins', async () => {
      const { service } = buildService(fake);
      fake.users.get(USER_FREE)!.coins = 100;

      await expect(service.buyItem(USER_FREE, 'UNKNOWN_ITEM')).rejects.toThrow(
        'Item não encontrado.',
      );

      expect(fake.users.get(USER_FREE)!.coins).toBe(100);
    });

    it('lists and sells the implemented sabotage item', async () => {
      const { service } = buildService(fake);
      fake.users.get(USER_FREE)!.coins = 100;

      const items = await service.listMerchantItems();
      expect(items.map((item: { code: string }) => item.code)).toContain('CHAOS_BANANA');
      await expect(service.buyItem(USER_FREE, 'CHAOS_BANANA')).resolves.toMatchObject({
        success: true,
        itemCode: 'CHAOS_BANANA',
        remainingCoins: 40,
      });
      expect(fake.users.get(USER_FREE)!.coins).toBe(40);
    });

    it('returns not found instead of insufficient coins for a deleted user', async () => {
      const { service } = buildService(fake);

      await expect(service.buyItem('missing-user', 'SHIELD')).rejects.toThrow(
        'Usuário não encontrado.',
      );
    });

    it('activates supported effects and consumes exactly one item', async () => {
      const { service } = buildService(fake);
      fake.inventory.push({
        id: 'inventory-shield',
        userId: USER_FREE,
        itemCode: 'SHIELD',
        quantity: 1,
      });

      await expect(service.useItem(USER_FREE, 'SHIELD')).resolves.toMatchObject({
        success: true,
        activatedEffect: 'SHIELD',
        charges: 1,
      });

      expect(fake.inventory[0].quantity).toBe(0);
      expect(fake.activeEffects).toHaveLength(1);
    });

    it('uses the hourglass to extend the active challenge by 60 seconds', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]);
      await service.roll(USER_FREE);
      fake.inventory.push({
        id: 'inventory-extra-time',
        userId: USER_FREE,
        itemCode: 'EXTRA_TIME',
        quantity: 2,
      });

      await expect(service.useItem(USER_FREE, 'EXTRA_TIME')).resolves.toMatchObject({
        success: true,
        itemCode: 'EXTRA_TIME',
        secondsAdded: 60,
        timeLimitSeconds: 150,
      });

      expect(fake.inventory[0].quantity).toBe(1);
      expect(fake.moves[0].timeBonusSeconds).toBe(60);
      expect(fake.activeEffects).toHaveLength(0);
    });

    it('keeps an objective answer valid beyond the original deadline after extension', async () => {
      jest.useFakeTimers();
      try {
        jest.setSystemTime(new Date('2026-11-14T12:00:00.000Z'));
        const { service, dice, gamification } = buildService(fake);
        dice.setFixedRolls([3]);
        await service.roll(USER_FREE);
        fake.inventory.push({
          id: 'inventory-extra-time',
          userId: USER_FREE,
          itemCode: 'EXTRA_TIME',
          quantity: 1,
        });
        await service.useItem(USER_FREE, 'EXTRA_TIME');
        gamification.awardTowerObjectiveXp.mockResolvedValue({
          xpGained: 120,
          totalXp: 120,
          level: 1,
          streak: 1,
        });
        jest.advanceTimersByTime(91_000);

        const question = getTowerObjectiveQuestion(1, 3);
        const result = await service.submitObjective(
          USER_FREE,
          question.correctOption,
        );

        expect(result.result).toBe('passed');
        expect(fake.moves[0].result).toBe('passed');
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not consume an hourglass when no challenge is pending', async () => {
      const { service } = buildService(fake);
      fake.inventory.push({
        id: 'inventory-extra-time',
        userId: USER_FREE,
        itemCode: 'EXTRA_TIME',
        quantity: 1,
      });

      await expect(service.useItem(USER_FREE, 'EXTRA_TIME')).rejects.toThrow(
        'A Ampulheta só pode ser usada durante um desafio pendente.',
      );
      expect(fake.inventory[0].quantity).toBe(1);
    });

    it('does not extend an already expired challenge', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]);
      await service.roll(USER_FREE);
      fake.moves[0].createdAt = new Date(Date.now() - 91_000);
      fake.inventory.push({
        id: 'inventory-extra-time',
        userId: USER_FREE,
        itemCode: 'EXTRA_TIME',
        quantity: 1,
      });

      await expect(service.useItem(USER_FREE, 'EXTRA_TIME')).rejects.toThrow(
        'O tempo do desafio acabou; não é possível estendê-lo.',
      );
      expect(fake.inventory[0].quantity).toBe(1);
    });

    it('prevents reusing one inventory unit to create a second effect', async () => {
      const { service } = buildService(fake);
      fake.inventory.push({
        id: 'inventory-double-dice',
        userId: USER_FREE,
        itemCode: 'DOUBLE_DICE',
        quantity: 1,
      });

      await service.useItem(USER_FREE, 'DOUBLE_DICE');
      await expect(service.useItem(USER_FREE, 'DOUBLE_DICE')).rejects.toThrow(
        'Você não possui este item em seu inventário.',
      );

      expect(fake.inventory[0].quantity).toBe(0);
      expect(fake.activeEffects).toHaveLength(1);
    });

    it('consumes oracle scroll only after validating the pending challenge', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([1]);
      fake.inventory.push({
        id: 'inventory-scroll',
        userId: USER_FREE,
        itemCode: 'ORACLE_SCROLL',
        quantity: 1,
      });
      await service.roll(USER_FREE);

      const result = await service.askOracleHint(USER_FREE);

      expect(result).toMatchObject({ success: true, consumedItem: 'ORACLE_SCROLL' });
      expect(fake.inventory[0].quantity).toBe(0);
    });

    it('preserves oracle scroll when challenge lookup fails', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([1]);
      fake.inventory.push({
        id: 'inventory-scroll',
        userId: USER_FREE,
        itemCode: 'ORACLE_SCROLL',
        quantity: 1,
      });
      await service.roll(USER_FREE);
      jest
        .spyOn(fake.activity, 'findUnique')
        .mockRejectedValue(new Error('activity lookup failed'));

      await expect(service.askOracleHint(USER_FREE)).rejects.toThrow(
        'activity lookup failed',
      );

      expect(fake.inventory[0].quantity).toBe(1);
    });
  });

  describe('async parties and sabotage', () => {
    it('creates a party, joins by invite id, and transfers leadership on leave', async () => {
      const { service } = buildService(fake);

      const created = await service.createParty(USER_FREE, 'Equipe');
      expect(created).toMatchObject({
        name: 'Equipe',
        members: [{ id: USER_FREE, isLeader: true, isCurrentUser: true }],
      });

      const joined = await service.joinParty(USER_PRO, created!.id);
      expect(joined?.members).toHaveLength(2);
      await expect(service.createParty(USER_FREE)).rejects.toThrow(
        'Você já participa de uma party ativa.',
      );

      await service.leaveParty(USER_FREE);
      const remainingParty = await service.getParty(USER_PRO);
      expect(remainingParty).toMatchObject({
        leaderId: USER_PRO,
        members: [{ id: USER_PRO, isLeader: true }],
      });
      await expect(service.getParty(USER_FREE)).resolves.toBeNull();
    });

    it('limits parties to four members and rejects outsider visibility', async () => {
      const { service } = buildService(fake);
      for (const id of ['user-three', 'user-four', 'user-five']) {
        fake.users.set(id, { id, plan: 'free', careerTier: 'beginner' });
      }

      const created = await service.createParty(USER_FREE);
      await service.joinParty(USER_PRO, created!.id);
      await service.joinParty('user-three', created!.id);
      await service.joinParty('user-four', created!.id);

      await expect(service.joinParty('user-five', created!.id)).rejects.toThrow(
        'Esta party já atingiu o limite de 4 participantes.',
      );
      await expect(service.getParty('user-five')).resolves.toBeNull();
    });

    it('exposes persisted floor completions to party members', async () => {
      const { service, dice, runner, gamification } = buildService(fake);
      await service.createParty(USER_FREE);
      await service.getProgress(USER_FREE);
      fake.progresses.get(USER_FREE)!.square = 29;
      dice.setFixedRolls([1]);
      await service.roll(USER_FREE);
      runner.executeInSandbox.mockResolvedValue(passedEvaluation);
      gamification.awardSubmissionXp.mockResolvedValue({
        xpGained: 120,
        totalXp: 120,
        level: 1,
        streak: 1,
      });

      const result = await service.submit(USER_FREE, 'function guardiao() {}');
      const party = await service.getParty(USER_FREE);

      expect(result.guardianDefeated).toBe(true);
      expect(party?.floor).toBe(2);
      expect(party?.recentAdvances).toMatchObject([{ floor: 1 }]);
    });

    it('applies the banana to the next move of a party rival only', async () => {
      const { service, dice } = buildService(fake);
      const created = await service.createParty(USER_FREE);
      await service.joinParty(USER_PRO, created!.id);
      await service.getProgress(USER_PRO);
      fake.inventory.push({
        id: 'inventory-banana',
        userId: USER_FREE,
        itemCode: 'CHAOS_BANANA',
        quantity: 1,
      });

      await expect(
        service.useItem(USER_FREE, 'CHAOS_BANANA', USER_PRO),
      ).resolves.toMatchObject({
        success: true,
        activatedEffect: 'CHAOS_BANANA',
        target: 'Aventureiro',
      });
      expect(fake.inventory[0].quantity).toBe(0);

      dice.setFixedRolls([1]);
      const result = await service.roll(USER_PRO);
      expect(result).toMatchObject({
        roll: 1,
        fromSquare: 0,
        toSquare: 0,
        sabotageApplied: true,
        pendingChallenge: null,
        square: null,
      });
      expect(fake.activeEffects).toHaveLength(0);
    });

    it('does not consume a banana when the target is outside the party', async () => {
      const { service } = buildService(fake);
      await service.createParty(USER_FREE);
      fake.inventory.push({
        id: 'inventory-banana',
        userId: USER_FREE,
        itemCode: 'CHAOS_BANANA',
        quantity: 1,
      });

      await expect(
        service.useItem(USER_FREE, 'CHAOS_BANANA', USER_PRO),
      ).rejects.toThrow('O alvo precisa ser outro integrante da sua party ativa.');
      expect(fake.inventory[0].quantity).toBe(1);
    });
  });
});
