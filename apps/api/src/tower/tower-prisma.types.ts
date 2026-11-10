/**
 * Interface mínima do Prisma usada pela torre.
 *
 * Por que não usar o PrismaClient gerado: o client em node_modules é gerado
 * a partir do schema no momento do `prisma generate`. Até a migration da
 * torre ser aplicada e o client ser regenerado, `prisma.towerProgress`,
 * `prisma.towerMove` e `user.plan` não existem no tipo gerado — o acesso
 * direto não compilaria. O service faz cast para esta interface (que espelha
 * o schema) e os testes usam um fake que a implementa. Depois de
 * `prisma generate`, o client real satisfaz esta interface.
 */
export interface TowerUserRow {
  id: string;
  plan: 'free' | 'pro';
  careerTier: string;
}

export interface TowerProgressRow {
  id: string;
  userId: string;
  floor: number;
  square: number;
  movesLeftToday: number;
  movesResetDate: Date;
  powers: unknown;
  updatedAt: Date;
}

export interface TowerMoveRow {
  id: string;
  userId: string;
  floor: number;
  fromSquare: number;
  roll: number;
  toSquare: number;
  squareType: string;
  activityId: string | null;
  result: string | null;
  xpGained: number;
  createdAt: Date;
}

export interface TowerActivityRow {
  id: string;
  language: string;
  testCode: string | null;
  hiddenTests: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface TowerPrismaClient {
  user: {
    findUnique(args: {
      where: { id: string };
      select?: Record<string, boolean>;
    }): Promise<TowerUserRow | null>;
  };
  towerProgress: {
    findUnique(args: { where: { userId: string } }): Promise<TowerProgressRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<TowerProgressRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<TowerProgressRow>;
  };
  towerMove: {
    findFirst(args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, string>;
    }): Promise<TowerMoveRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<TowerMoveRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<TowerMoveRow>;
  };
  course: {
    findUnique(args: { where: { slug: string } }): Promise<{ id: string } | null>;
  };
  activity: {
    findUnique(args: {
      where: { id: string } | { courseId_slug: { courseId: string; slug: string } };
    }): Promise<TowerActivityRow | null>;
  };
  submission: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  testCaseResult: {
    createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
  };
  $transaction<T>(fn: (tx: TowerPrismaClient) => Promise<T>): Promise<T>;
  $queryRaw(...args: unknown[]): Promise<unknown>;
}
