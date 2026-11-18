import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsMarketProvider } from '../knowledge/research/jobs-market.provider';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobResearchPreflightService {
  constructor(
    private readonly jobs: JobsMarketProvider,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getStatus() {
    const sources = this.jobs.configuredSources();
    const budget = Number(this.config.get<string>('JOB_RESEARCH_DAILY_BUDGET', '0'));
    const validBudget = Number.isSafeInteger(budget) && budget >= 0;
    return {
      sources,
      dailyBudget: validBudget ? budget : null,
      enabled: validBudget && budget > 0 && (sources.adzuna || sources.tavily),
    };
  }

  async runDiagnostic(adminId: string) {
    if (!this.getStatus().enabled) {
      throw new BadRequestException('Configure uma fonte e um orçamento diário antes de executar o diagnóstico.');
    }
    const id = randomUUID();
    await this.prisma.adminAuditEvent.create({
      data: { adminId, action: 'knowledge.jobs.diagnostic.started', targetType: 'job-diagnostic', targetId: id },
    });
    const results = await this.jobs.diagnoseSources();
    const auditStatus = { unconfigured: 'off', ok: 'ok', empty: 'empty', failed: 'failed' };
    await this.prisma.adminAuditEvent.create({
      data: {
        adminId,
        action: 'knowledge.jobs.diagnostic.finished',
        targetType: 'job-diagnostic',
        targetId: id,
        newValue: results.map(({ source, status }) => `${source}:${auditStatus[status]}`).join(','),
      },
    });
    return { id, results };
  }
}
