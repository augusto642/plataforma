import { Injectable, Logger } from '@nestjs/common';
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

      const shouldAwardXp = await this.prisma.$transaction(async (tx) => {
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

        const resultData = {
          status: kind === 'sandbox_unavailable' ? 'error' : evaluation.status,
          score: evaluation.score,
          maxScore: evaluation.maxScore,
          durationMs: evaluation.durationMs,
          errorMessage,
          logs: evaluation.logs,
        };

        if (canAwardXp) {
          // Compare-and-set atômico: só o worker que flipar xpAwarded false->true
          // (count === 1) tem o direito de premiar XP. Impede XP em dobro quando
          // BullMQ retries (attempts: 2) ou réplicas concorrentes processam a
          // mesma submissão.
          const claimed = await tx.submission.updateMany({
            where: { id: submissionId, xpAwarded: false },
            data: { ...resultData, xpAwarded: true },
          });
          if (claimed.count === 1) {
            return true;
          }
          // Outra corrida já processou esta submissão; persiste o resultado
          // mais recente sem premiar XP novamente.
          await tx.submission.update({
            where: { id: submissionId },
            data: resultData,
          });
          return false;
        }

        // Outcomes que nunca premiam XP preservam o flag existente.
        await tx.submission.update({
          where: { id: submissionId },
          data: { ...resultData, xpAwarded: submission.xpAwarded },
        });
        return false;
      });

      // Award XP and evaluate Badges only for the worker that won the
      // compare-and-set above (exactly-once per submission)
      if (shouldAwardXp) {
        await this.gamification.awardSubmissionXp(
          submission.userId,
          submission.activityId,
          evaluation.status === 'passed',
          evaluation.score,
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
  }

  private normalizeKind(evaluation: SandboxExecutionResult): SandboxResultKind {
    if (evaluation.kind) return evaluation.kind;
    return evaluation.status === 'passed' ? 'passed' : 'failed';
  }
}