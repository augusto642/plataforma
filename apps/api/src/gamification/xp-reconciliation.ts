import { Logger } from '@nestjs/common';

/**
 * C8 (Lote 1) — Reconciliação periódica `users.xp` × XP esperado.
 *
 * REGRA CANÔNICA (mesma do GamificationService.awardSubmissionXp):
 * - submissão normal com xpAwarded=true: passed => 70 XP, failed => 20 XP,
 *   +50 de bônus se score === 100;
 * - submissão de battle (isBattleRun) com xpAwarded=true: o XP creditado
 *   foi o do boss/parcial e está guardado em battleResult.xpGained — é ele
 *   que vale, NÃO a fórmula normal (o prêmio do boss é 75/80, não 70/120).
 * - xpAwarded=false nunca conta (sem claim, sem crédito).
 *
 * Uso: `GamificationService.reconcileXp({ fix })` ou o comando
 * `npm run reconcile:xp [-- --fix]` (ver src/reconcile-xp.cli.ts).
 * Modo leitura por padrão (só lista divergências); --fix aplica a correção
 * (xp + level derivado) numa transação. Rodar 1× por semana (ou após
 * incidentes de fila/banco) e sempre antes de fechar XP de ligas/rankings.
 */

export interface XpReconSubmission {
  id: string;
  userId: string;
  status: string;
  score: number | null;
  xpAwarded: boolean;
  isBattleRun: boolean;
  battleResult?: { xpGained?: unknown } | null;
}

export interface XpReconUser {
  id: string;
  email: string;
  xp: number;
}

export interface XpDivergence {
  userId: string;
  email: string;
  actualXp: number;
  expectedXp: number;
  /** expected - actual: negativo = XP a mais no perfil; positivo = XP perdido. */
  delta: number;
}

export interface XpReconReport {
  checkedUsers: number;
  checkedSubmissions: number;
  divergences: XpDivergence[];
  fixed: number;
}

/** XP esperado de UMA submissão já premiada (xpAwarded=true). */
export function xpForSubmission(sub: XpReconSubmission): number {
  if (!sub.xpAwarded) return 0;
  if (sub.isBattleRun) {
    const gained = (sub.battleResult as { xpGained?: unknown } | null)?.xpGained;
    return typeof gained === 'number' && Number.isFinite(gained) ? gained : 0;
  }
  const base = sub.status === 'passed' ? 70 : 20;
  return base + (sub.score === 100 ? 50 : 0);
}

export function computeExpectedXp(submissions: XpReconSubmission[]): Map<string, number> {
  const expected = new Map<string, number>();
  for (const sub of submissions) {
    expected.set(sub.userId, (expected.get(sub.userId) ?? 0) + xpForSubmission(sub));
  }
  return expected;
}

export function findXpDivergences(
  users: XpReconUser[],
  submissions: XpReconSubmission[],
): XpDivergence[] {
  const expected = computeExpectedXp(submissions);
  const divergences: XpDivergence[] = [];
  for (const user of users) {
    const expectedXp = expected.get(user.id) ?? 0;
    if (user.xp !== expectedXp) {
      divergences.push({
        userId: user.id,
        email: user.email,
        actualXp: user.xp,
        expectedXp,
        delta: expectedXp - user.xp,
      });
    }
  }
  return divergences;
}

const logger = new Logger('XpReconciliation');

/**
 * Lê todos os usuários + submissões premiadas, compara e (só com fix=true)
 * corrige `users.xp` e o `level` derivado (floor(xp/200)+1) numa transação.
 * O `prisma` aqui é o PrismaService (ou qualquer cliente com user/submission).
 */
export async function reconcileXp(
  prisma: {
    user: {
      findMany: (args: unknown) => Promise<XpReconUser[]>;
      update: (args: unknown) => Promise<unknown>;
    };
    submission: {
      findMany: (args: unknown) => Promise<XpReconSubmission[]>;
    };
    $transaction: (cb: (tx: any) => Promise<unknown>) => Promise<unknown>;
  },
  options: { fix?: boolean } = {},
): Promise<XpReconReport> {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, xp: true },
  });
  const submissions = await prisma.submission.findMany({
    where: { xpAwarded: true },
    select: {
      id: true,
      userId: true,
      status: true,
      score: true,
      xpAwarded: true,
      isBattleRun: true,
      battleResult: true,
    },
  });
  const divergences = findXpDivergences(users, submissions);
  let fixed = 0;
  if (options.fix && divergences.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const d of divergences) {
        await tx.user.update({
          where: { id: d.userId },
          data: {
            xp: d.expectedXp,
            level: Math.floor(d.expectedXp / 200) + 1,
          },
        });
        logger.log(
          `XP reconciled for user ${d.userId} (${d.email}): ${d.actualXp} -> ${d.expectedXp} (delta ${d.delta})`,
        );
      }
    });
    fixed = divergences.length;
  }
  return {
    checkedUsers: users.length,
    checkedSubmissions: submissions.length,
    divergences,
    fixed,
  };
}
