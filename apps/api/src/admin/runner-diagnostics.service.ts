import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PistonRunnerService } from '../submissions/runner/runner.service';

const MARKER = 'nexus-runner-test-ok';
const SAMPLES: Array<{ language: Language; code: string }> = [
  { language: Language.javascript, code: `console.log("${MARKER}");` },
  { language: Language.python, code: `print("${MARKER}")` },
];

@Injectable()
export class RunnerDiagnosticsService {
  private readonly logger = new Logger(RunnerDiagnosticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PistonRunnerService,
  ) {}

  list() {
    return this.prisma.runnerDiagnostic.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async run(adminId: string | null) {
    const results = [];
    for (const sample of SAMPLES) {
      const event = await this.prisma.runnerDiagnostic.create({
        data: { adminId, language: sample.language, status: 'running' },
      });
      let outcome: { status: string; kind: string; durationMs: number | null };
      try {
        const result = await this.runner.execute(sample.language, sample.code);
        const passed = result.status === 'passed' && result.stdout.trim() === MARKER;
        outcome = {
          status: passed ? 'passed' : 'failed',
          kind: passed ? 'passed' : result.status === 'passed' ? 'unexpected_output' : result.kind,
          durationMs: result.durationMs,
        };
      } catch {
        this.logger.error('Runner diagnostic failed unexpectedly.');
        outcome = { status: 'failed', kind: 'internal_error', durationMs: null };
      }
      results.push(await this.prisma.runnerDiagnostic.update({
        where: { id: event.id },
        data: { ...outcome, finishedAt: new Date() },
      }));
    }
    return results;
  }
}
