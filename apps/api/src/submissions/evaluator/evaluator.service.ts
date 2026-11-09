import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { GamificationService } from '../../gamification/gamification.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PistonRunnerService,
  SandboxResultKind,
  SandboxExecutionResult,
} from '../runner/runner.service';

const NO_XP_KINDS: ReadonlySet<SandboxResultKind> = new Set([
  'unsupported',
  'sandbox_unavailable',
  'compile_error',
]);

const KIND_MESSAGES: Record<SandboxResultKind, string> = {
  passed: '',
  failed: 'Os testes não passaram. Revise a solução e tente novamente.',
  compile_error:
    'O código submetido não compilou. Revise os erros apontados e tente novamente.',
  runtime_error: 'O programa falhou em tempo de execução nos testes.',
  timeout: 'O programa excedeu o tempo limite de execução.',
  signal: 'O programa foi encerrado pelo sistema operacional.',
  output_limit: 'O programa excedeu o limite de saída permitido.',
  sandbox_unavailable:
    'O sandbox de execução está temporariamente indisponível. Tente novamente mais tarde.',
  unsupported:
    'Esta linguagem ainda não é suportada pelo sandbox de execução. Submeta o código em uma das linguagens disponíveis.',
};

@Injectable()
export class EvaluatorService {
  private readonly logger = new Logger(EvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PistonRunnerService,
    private readonly gamification: GamificationService,
    private readonly cache: CacheService,
  ) {}

  async processSubmission(submissionId: string): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { activity: true },
    });

    if (!submission) {
      this.logger.error(`Submission ${submissionId} not found for evaluation`);
      return;
    }

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'running' },
    });

    try {
      const evaluation = await this.runner.executeInSandbox({
        language: submission.activity.language,
        code: submission.codeSnapshot || '',
        testScript: submission.activity.testCode || '',
        hiddenTests: submission.activity.hiddenTests || undefined,
        timeLimitMs: submission.activity.timeLimitMs,
        memoryLimitMb: submission.activity.memoryLimitMb,
      });

      const kind = this.normalizeKind(evaluation);
      const canAwardXp = !NO_XP_KINDS.has(kind);
      const errorMessage =
        evaluation.errorMessage || (kind === 'passed' ? undefined : KIND_MESSAGES[kind]);

      // C8 (Lote 1): claim + premiação do XP fundidos numa SÓ transação.
      // Antes eram duas transações separadas (esta, com o CAS xpAwarded, e a
      // do GamificationService): se a segunda falhasse, o catch dela só
      // logava e retornava null — o XP era perdido silenciosamente com o
      // claim já marcado. Agora o award roda dentro desta transação (com o
      // tx do Prisma): qualquer falha desfaz TUDO (inclusive o claim) e o
      // retry do BullMQ (attempts: 2) pode reclamar o XP de novo.
      const shouldAwardXp = await this.prisma.$transaction(async (tx) => {
        const resultData = {
          status: kind === 'sandbox_unavailable' ? 'error' : evaluation.status,
          score: evaluation.score,
          maxScore: evaluation.maxScore,
          durationMs: evaluation.durationMs,
          errorMessage,
          logs: evaluation.logs,
        };

        // M5 — ordem canônica de locks (ver `common/tx-lock-order.ts`):
        // a SUBMISSÃO é travada primeiro. O claim CAS abaixo precisa
        // preceder o prêmio (C8): premiar antes de reclamar pagaria XP
        // por uma submissão que outro worker já reclamou.
        let claimed = false;
        if (canAwardXp) {
          // Compare-and-set atômico: só o worker que flipar xpAwarded false->true
          // (count === 1) tem o direito de premiar XP. Impede XP em dobro quando
          // BullMQ retries (attempts: 2) ou réplicas concorrentes processam a
          // mesma submissão.
          const claim = await tx.submission.updateMany({
            where: { id: submissionId, xpAwarded: false },
            data: { ...resultData, xpAwarded: true },
          });
          claimed = claim.count === 1;
          if (!claimed) {
            // Outra corrida já processou esta submissão; persiste o resultado
            // mais recente sem premiar XP novamente.
            await tx.submission.update({
              where: { id: submissionId },
              data: resultData,
            });
          }
        } else {
          // Outcomes que nunca premiam XP preservam o flag existente.
          await tx.submission.update({
            where: { id: submissionId },
            data: { ...resultData, xpAwarded: submission.xpAwarded },
          });
        }

        // M5 — testCaseResults DEPOIS da submissão, ANTES do usuário
        // (ordem canônica: submissions → test_case_results → users).
        // Clean up previous test results if this is a retry
        await tx.testCaseResult.deleteMany({
          where: { submissionId },
        });

        // Batch insert test case results
        if (evaluation.testCases.length > 0) {
          await tx.testCaseResult.createMany({
            data: evaluation.testCases.map((test) => ({
              submissionId,
              name: test.name,
              passed: test.passed,
              durationMs: test.durationMs,
              stdout: test.stdout,
              stderr: test.stderr,
              errorMessage: test.errorMessage,
              isHidden: test.isHidden ?? false,
            })),
          });
        }

        if (claimed) {
          // O award dentro da mesma transação: sem ele não há commit do
          // claim — nada de XP perdido silenciosamente.
          await this.gamification.awardSubmissionXp(
            submission.userId,
            submission.activityId,
            evaluation.status === 'passed',
            evaluation.score,
            tx as any,
          );
          return true;
        }
        return false;
      });

      if (shouldAwardXp) {
        this.logger.log(
          `XP awarded in-transaction for submission ${submissionId} (user ${submission.userId})`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed evaluating submission ${submissionId}: ${err.message}`);
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'error',
          errorMessage: err.message || 'Internal evaluation error',
        },
      });
    }

    // A4: a avaliação persiste status/score/XP — o ranking do curso mudou
    // (ou pode ter mudado), então o cache `leaderboard:<courseId>:*` não
    // vale mais. Invalidação best-effort: falha do Redis nunca pode
    // transformar uma avaliação concluída em erro (o TTL de 45 s cobre).
    await this.invalidateLeaderboard(submission.activity.courseId);
  }

  private async invalidateLeaderboard(courseId: string): Promise<void> {
    try {
      await this.cache.delPattern(`leaderboard:${courseId}:*`);
    } catch (err: any) {
      this.logger.warn(
        `Failed to invalidate leaderboard cache for course ${courseId}: ${err?.message}`,
      );
    }
  }

  private normalizeKind(evaluation: SandboxExecutionResult): SandboxResultKind {
    if (evaluation.kind) return evaluation.kind;
    return evaluation.status === 'passed' ? 'passed' : 'failed';
  }
}