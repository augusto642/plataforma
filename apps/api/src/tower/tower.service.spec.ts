import { DiceService } from './dice.service';
import { TowerBoardService } from './tower-board.service';
import { TowerService } from './tower.service';
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
  private seq = 1;

  user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.get(where.id) ?? null,
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
  fake.users.set(USER_FREE, { id: USER_FREE, plan: 'free', careerTier: 'beginner' });
  fake.users.set(USER_PRO, { id: USER_PRO, plan: 'pro', careerTier: 'beginner' });
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
    it('casa sem desafio (quiz): atravessa na hora e consome 1 jogada', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([3]); // casa 3 = quiz
      const result = await service.roll(USER_FREE);
      expect(result).toMatchObject({ roll: 3, fromSquare: 0, toSquare: 3, movesLeftToday: 4 });
      expect(result.square.type).toBe('quiz');
      expect(result.pendingChallenge).toBeNull();
      expect(fake.progresses.get(USER_FREE)!.square).toBe(3);
      expect(fake.moves[0].result).toBe('skipped');
    });

    it('casa de código: cria desafio pendente e NÃO avança até resolver', async () => {
      const { service, dice } = buildService(fake);
      dice.setFixedRolls([1]); // casa 1 = código (90 s)
      const result = await service.roll(USER_FREE);
      expect(result).toMatchObject({ roll: 1, toSquare: 1, movesLeftToday: 4 });
      expect(result.square.type).toBe('code');
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
      expect(result.square.type).toBe('final');
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
      );
      expect(fake.submissions).toHaveLength(1);
      expect(fake.submissions[0]).toMatchObject({ status: 'passed', xpAwarded: true });
      expect(fake.moves[0]).toMatchObject({ result: 'passed', xpGained: 120 });
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
      dice.setFixedRolls([3, 1]); // casa 3 (quiz) → casa 4 (código)
      await service.roll(USER_FREE);
      await service.roll(USER_FREE);
      const result = await service.submit(USER_FREE, 'function maior(a, b) { return a; }');
      expect(result).toMatchObject({ result: 'failed', xpGained: 20, floor: 1, square: 2 });
      expect(fake.moves[1]).toMatchObject({ result: 'failed', xpGained: 20 });
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
      dice.setFixedRolls([3, 1]);
      await service.roll(USER_FREE);
      await service.roll(USER_FREE);
      // Desafio criado há 2 h (limite da casa 4 = 90 s).
      fake.moves[1].createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = await service.submit(USER_FREE, 'function maior(a, b) { return b; }');
      expect(result).toMatchObject({ result: 'timeout', xpGained: 0, score: null, square: 2 });
      expect(runner.executeInSandbox).not.toHaveBeenCalled();
      expect(gamification.awardSubmissionXp).not.toHaveBeenCalled();
      expect(fake.submissions).toHaveLength(0);
      expect(fake.moves[1].result).toBe('timeout');
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
});
