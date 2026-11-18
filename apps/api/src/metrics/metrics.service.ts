import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { AiUsageService } from '../ai/llm/ai-usage.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

export const MONITORED_QUEUE_NAMES = [
  'submissions',
  'ai-reviews',
  'billing-events',
  'track-investigation',
  'research',
  'track-generation',
] as const;

export const CONTROLLED_AI_QUEUE_NAMES = [
  'ai-reviews',
  'track-investigation',
  'research',
  'track-generation',
] as const;

const HTTP_LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500, 5000] as const;

export interface QueueMetrics {
  name: (typeof MONITORED_QUEUE_NAMES)[number];
  available: boolean;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  headWaitingAgeSeconds?: number;
}

export interface MetricSnapshot {
  requestsTotal: number;
  errorsTotal: number;
  avgLatencyMs: number;
  lastReset: string;
}

type RegistrationEvaluationSource = 'llm' | 'heuristic';
type RegistrationEvaluationConfidence = 'high' | 'medium' | 'low';
type RunnerDiagnosticMetric = { language: string; status: string; finishedAt: Date | null } | null;

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private requestsTotal = 0;
  private errorsTotal = 0;
  private totalLatencyMs = 0;
  private readonly requestLatencyBuckets = new Map<number, number>(
    HTTP_LATENCY_BUCKETS_MS.map((bucket) => [bucket, 0]),
  );
  private activeSubmissions = 0;
  private lastReset = new Date().toISOString();
  private registrationFollowUpsGenerated = 0;
  private readonly registrationEvaluations = new Map<string, number>();
  private readonly healthProbes = new Map<string, Promise<boolean>>();
  private runnerDiagnosticsRead: Promise<RunnerDiagnosticMetric[] | null> | null = null;

  constructor(
    @Optional() @InjectQueue('submissions') private readonly submissionsQueue?: Queue,
    @Optional() @InjectQueue('ai-reviews') private readonly reviewsQueue?: Queue,
    @Optional() @InjectQueue('billing-events') private readonly billingQueue?: Queue,
    @Optional() @InjectQueue('track-investigation') private readonly trackQueue?: Queue,
    @Optional() @InjectQueue('research') private readonly researchQueue?: Queue,
    @Optional() @InjectQueue('track-generation') private readonly trackGenerationQueue?: Queue,
    @Optional() private readonly aiUsage?: AiUsageService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly cache?: CacheService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private async probe(name: string, operation: () => Promise<boolean>): Promise<boolean> {
    let active = this.healthProbes.get(name);
    if (!active) {
      active = Promise.resolve().then(operation).catch(() => false).finally(() => this.healthProbes.delete(name));
      this.healthProbes.set(name, active);
    }
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        active,
        new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 1500); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async readRunnerDiagnostics(): Promise<RunnerDiagnosticMetric[] | null> {
    if (!this.prisma) return null;
    if (!this.runnerDiagnosticsRead) {
      const prisma = this.prisma;
      this.runnerDiagnosticsRead = Promise.all(
        (['javascript', 'python'] as const).map((language) => prisma.runnerDiagnostic.findFirst({
          where: { language, status: { in: ['passed', 'failed'] } },
          orderBy: { createdAt: 'desc' },
          select: { language: true, status: true, finishedAt: true },
        })),
      ).catch(() => {
        this.logger.warn('Runner diagnostic metrics unavailable.');
        return null;
      }).finally(() => { this.runnerDiagnosticsRead = null; });
    }
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        this.runnerDiagnosticsRead,
        new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  recordRequest(latencyMs: number, isError: boolean) {
    this.requestsTotal += 1;
    this.totalLatencyMs += latencyMs;
    for (const bucket of HTTP_LATENCY_BUCKETS_MS) {
      if (latencyMs <= bucket) {
        this.requestLatencyBuckets.set(bucket, (this.requestLatencyBuckets.get(bucket) ?? 0) + 1);
      }
    }
    if (isError) {
      this.errorsTotal += 1;
    }
  }

  recordSubmissionStart() {
    this.activeSubmissions += 1;
  }

  recordSubmissionEnd() {
    this.activeSubmissions = Math.max(0, this.activeSubmissions - 1);
  }

  recordRegistrationFollowUpGenerated() {
    this.registrationFollowUpsGenerated += 1;
  }

  recordRegistrationEvaluation(
    source: RegistrationEvaluationSource,
    confidence: RegistrationEvaluationConfidence,
    followUpUsed: boolean,
  ) {
    const key = `${source}:${confidence}:${followUpUsed ? 'true' : 'false'}`;
    this.registrationEvaluations.set(key, (this.registrationEvaluations.get(key) ?? 0) + 1);
  }

  snapshot(): MetricSnapshot {
    return {
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      avgLatencyMs: this.requestsTotal > 0 ? Math.round(this.totalLatencyMs / this.requestsTotal) : 0,
      lastReset: this.lastReset,
    };
  }

  async queueMetrics(): Promise<QueueMetrics[]> {
    const queues: Array<{
      name: QueueMetrics['name'];
      queue?: Queue;
    }> = [
      { name: 'submissions', queue: this.submissionsQueue },
      { name: 'ai-reviews', queue: this.reviewsQueue },
      { name: 'billing-events', queue: this.billingQueue },
      { name: 'track-investigation', queue: this.trackQueue },
      { name: 'research', queue: this.researchQueue },
      { name: 'track-generation', queue: this.trackGenerationQueue },
    ];

    return Promise.all(
      queues.map(async ({ name, queue }): Promise<QueueMetrics> => {
        if (!queue) return { name, available: false };
        try {
          const [counts, headWaitingJobs] = await Promise.all([
            queue.getJobCounts(
              'wait',
              'active',
              'completed',
              'failed',
              'delayed',
            ),
            queue.getWaiting(0, 0),
          ]);
          const headTimestamp = headWaitingJobs[0]?.timestamp;
          return {
            name,
            available: true,
            waiting: counts.wait ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            headWaitingAgeSeconds:
              typeof headTimestamp === 'number'
                ? Math.max(0, Math.floor((Date.now() - headTimestamp) / 1000))
                : 0,
          };
        } catch (error) {
          this.logger.warn(`Queue metrics unavailable for ${name}: ${(error as Error).message}`);
          return { name, available: false };
        }
      }),
    );
  }

  async controlQueue(
    name: (typeof CONTROLLED_AI_QUEUE_NAMES)[number],
    action: 'pause' | 'resume',
  ): Promise<void> {
    const queues: Record<(typeof CONTROLLED_AI_QUEUE_NAMES)[number], Queue | undefined> = {
      'ai-reviews': this.reviewsQueue,
      'track-investigation': this.trackQueue,
      research: this.researchQueue,
      'track-generation': this.trackGenerationQueue,
    };
    const queue = queues[name];
    if (!queue) {
      throw new ServiceUnavailableException(`A fila ${name} não está disponível.`);
    }

    if (action === 'pause') {
      await queue.pause();
    } else {
      await queue.resume();
    }
  }

  async toPrometheusFormat(): Promise<string> {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const avgLatency = this.requestsTotal > 0 ? this.totalLatencyMs / this.requestsTotal : 0;
    const queueMetrics = await this.queueMetrics();
    const [databaseUp, redisUp] = await Promise.all([
      this.prisma ? this.probe('database', async () => { await this.prisma!.$queryRaw`SELECT 1`; return true; }) : false,
      this.cache ? this.probe('redis', () => this.cache!.ping()) : false,
    ]);
    const runnerEnabled = this.config?.get<string>('PISTON_ENABLED') === 'true';
    const runnerDiagnostics = runnerEnabled && databaseUp ? await this.readRunnerDiagnostics() : null;
    let aiOperations: Awaited<ReturnType<AiUsageService['getDailyOperations']>> | null = null;
    try {
      aiOperations = this.aiUsage
        ? await this.aiUsage.getDailyOperations(new Date().toISOString().slice(0, 10))
        : null;
    } catch (error) {
      this.logger.warn(`AI fallback metrics unavailable: ${(error as Error).message}`);
    }

    const output = [
      '# HELP nexus_http_requests_total Total number of HTTP requests received.',
      '# TYPE nexus_http_requests_total counter',
      `nexus_http_requests_total ${this.requestsTotal}`,
      '',
      '# HELP nexus_dependency_up Whether the API can reach a required dependency.',
      '# TYPE nexus_dependency_up gauge',
      `nexus_dependency_up{service="database"} ${databaseUp ? 1 : 0}`,
      `nexus_dependency_up{service="redis"} ${redisUp ? 1 : 0}`,
      '# HELP nexus_runner_enabled Whether execution is enabled.',
      '# TYPE nexus_runner_enabled gauge',
      `nexus_runner_enabled ${runnerEnabled ? 1 : 0}`,
      '# HELP nexus_runner_diagnostics_available Whether diagnostic results were read.',
      '# TYPE nexus_runner_diagnostics_available gauge',
      `nexus_runner_diagnostics_available ${runnerDiagnostics ? 1 : 0}`,
      ...(runnerDiagnostics ? [
        '# HELP nexus_runner_diagnostic_timestamp_seconds Timestamp of the latest completed runner diagnostic.',
        '# TYPE nexus_runner_diagnostic_timestamp_seconds gauge',
        ...(['javascript', 'python'] as const).map((language, index) =>
          `nexus_runner_diagnostic_timestamp_seconds{language="${language}"} ${Math.floor((runnerDiagnostics![index]?.finishedAt?.getTime() ?? 0) / 1000)}`),
        '# HELP nexus_runner_diagnostic_success Whether the latest completed runner diagnostic passed.',
        '# TYPE nexus_runner_diagnostic_success gauge',
        ...(['javascript', 'python'] as const).map((language, index) =>
          `nexus_runner_diagnostic_success{language="${language}"} ${runnerDiagnostics![index]?.status === 'passed' ? 1 : 0}`),
      ] : []),
      '',
      '# HELP nexus_http_errors_total Total number of HTTP requests that resulted in error.',
      '# TYPE nexus_http_errors_total counter',
      `nexus_http_errors_total ${this.errorsTotal}`,
      '',
      '# HELP nexus_http_avg_latency_ms Average HTTP latency in milliseconds.',
      '# TYPE nexus_http_avg_latency_ms gauge',
      `nexus_http_avg_latency_ms ${avgLatency.toFixed(2)}`,
      '',
      '# HELP nexus_http_request_duration_seconds HTTP request duration distribution in seconds.',
      '# TYPE nexus_http_request_duration_seconds histogram',
      ...HTTP_LATENCY_BUCKETS_MS.map(
        (bucket) =>
          `nexus_http_request_duration_seconds_bucket{le="${(bucket / 1000).toString()}"} ${this.requestLatencyBuckets.get(bucket) ?? 0}`,
      ),
      `nexus_http_request_duration_seconds_bucket{le="+Inf"} ${this.requestsTotal}`,
      `nexus_http_request_duration_seconds_sum ${(this.totalLatencyMs / 1000).toFixed(3)}`,
      `nexus_http_request_duration_seconds_count ${this.requestsTotal}`,
      '',
      '# HELP nexus_active_sandbox_submissions Number of concurrent code submissions executing.',
      '# TYPE nexus_active_sandbox_submissions gauge',
      `nexus_active_sandbox_submissions ${this.activeSubmissions}`,
      '',
      '# HELP nexus_process_memory_rss_bytes Resident Set Size in bytes.',
      '# TYPE nexus_process_memory_rss_bytes gauge',
      `nexus_process_memory_rss_bytes ${memory.rss}`,
      '',
      '# HELP nexus_process_memory_heap_used_bytes Heap memory used in bytes.',
      '# TYPE nexus_process_memory_heap_used_bytes gauge',
      `nexus_process_memory_heap_used_bytes ${memory.heapUsed}`,
      '',
      '# HELP nexus_process_uptime_seconds Process uptime in seconds.',
      '# TYPE nexus_process_uptime_seconds gauge',
      `nexus_process_uptime_seconds ${uptime.toFixed(1)}`,
      '',
      '# HELP nexus_queue_metrics_available Whether queue counts were successfully read.',
      '# TYPE nexus_queue_metrics_available gauge',
    ];

    for (const queue of queueMetrics) {
      output.push(
        `nexus_queue_metrics_available{queue="${queue.name}"} ${queue.available ? 1 : 0}`,
      );
    }
    output.push(
      '',
      '# HELP nexus_queue_head_waiting_age_seconds Age of the next waiting queue job in seconds.',
      '# TYPE nexus_queue_head_waiting_age_seconds gauge',
    );
    for (const queue of queueMetrics) {
      if (queue.available) {
        output.push(
          `nexus_queue_head_waiting_age_seconds{queue="${queue.name}"} ${queue.headWaitingAgeSeconds ?? 0}`,
        );
      }
    }
    output.push(
      '',
      '# HELP nexus_queue_jobs Number of BullMQ jobs by queue and state.',
      '# TYPE nexus_queue_jobs gauge',
    );
    for (const queue of queueMetrics) {
      if (!queue.available) continue;
      for (const [state, value] of [
        ['waiting', queue.waiting],
        ['active', queue.active],
        ['completed', queue.completed],
        ['failed', queue.failed],
        ['delayed', queue.delayed],
      ] as const) {
        output.push(`nexus_queue_jobs{queue="${queue.name}",state="${state}"} ${value ?? 0}`);
      }
    }

    output.push(
      '',
      '# HELP nexus_registration_followups_generated_total Server-generated registration follow-up questions.',
      '# TYPE nexus_registration_followups_generated_total counter',
      `nexus_registration_followups_generated_total ${this.registrationFollowUpsGenerated}`,
      '# HELP nexus_registration_evaluations_total Registration evaluations by server result quality.',
      '# TYPE nexus_registration_evaluations_total counter',
    );
    for (const [key, count] of this.registrationEvaluations) {
      const [source, confidence, followUp] = key.split(':');
      output.push(
        `nexus_registration_evaluations_total{source="${source}",confidence="${confidence}",follow_up="${followUp}"} ${count}`,
      );
    }

    output.push(
      '',
      '# HELP nexus_ai_fallback_metrics_available Whether persisted AI fallback indicators were read.',
      '# TYPE nexus_ai_fallback_metrics_available gauge',
      `nexus_ai_fallback_metrics_available ${aiOperations ? 1 : 0}`,
    );
    if (aiOperations) {
      output.push(
        '# HELP nexus_ai_llm_calls_today Number of LLM calls recorded today (UTC).',
        '# TYPE nexus_ai_llm_calls_today gauge',
        `nexus_ai_llm_calls_today ${aiOperations.calls}`,
        '# HELP nexus_ai_llm_failed_calls_today Number of failed LLM calls recorded today (UTC).',
        '# TYPE nexus_ai_llm_failed_calls_today gauge',
        `nexus_ai_llm_failed_calls_today ${aiOperations.failedCalls}`,
        '# HELP nexus_ai_llm_blocked_calls_today Number of LLM calls blocked before provider completion today (UTC).',
        '# TYPE nexus_ai_llm_blocked_calls_today gauge',
        `nexus_ai_llm_blocked_calls_today ${aiOperations.blockedCalls}`,
        '# HELP nexus_ai_llm_tokens_today Tokens reported by providers today (UTC).',
        '# TYPE nexus_ai_llm_tokens_today gauge',
        `nexus_ai_llm_tokens_today ${aiOperations.totalTokens}`,
        '# HELP nexus_ai_llm_unpriced_calls_today Calls without a known public tariff or token usage today (UTC).',
        '# TYPE nexus_ai_llm_unpriced_calls_today gauge',
        `nexus_ai_llm_unpriced_calls_today ${aiOperations.unpricedCalls}`,
        '# HELP nexus_ai_llm_latency_samples_today AI request latency samples recorded today (UTC).',
        '# TYPE nexus_ai_llm_latency_samples_today gauge',
        `nexus_ai_llm_latency_samples_today ${aiOperations.latencySamples}`,
        '# HELP nexus_ai_fallback_calls_today LLM calls failed or blocked before provider completion today (UTC).',
        '# TYPE nexus_ai_fallback_calls_today gauge',
        `nexus_ai_fallback_calls_today ${aiOperations.fallbackCalls}`,
        '# HELP nexus_ai_fallback_rate_today Estimated share of LLM calls failed or blocked today (UTC).',
        '# TYPE nexus_ai_fallback_rate_today gauge',
      );
      if (aiOperations.fallbackRate !== null) {
        output.push(`nexus_ai_fallback_rate_today ${aiOperations.fallbackRate}`);
      }
      if (aiOperations.averageLatencyMs !== null) {
        output.push(
          '# HELP nexus_ai_llm_avg_latency_ms_today Average AI provider latency today (UTC).',
          '# TYPE nexus_ai_llm_avg_latency_ms_today gauge',
          `nexus_ai_llm_avg_latency_ms_today ${aiOperations.averageLatencyMs}`,
        );
      }
      if (aiOperations.p95LatencyMs !== null) {
        output.push(
          '# HELP nexus_ai_llm_p95_latency_ms_today 95th percentile AI provider latency today (UTC).',
          '# TYPE nexus_ai_llm_p95_latency_ms_today gauge',
          `nexus_ai_llm_p95_latency_ms_today ${aiOperations.p95LatencyMs}`,
        );
      }
      if (aiOperations.estimatedCostUsd !== null) {
        output.push(
          '# HELP nexus_ai_estimated_cost_usd_today Estimated public-list-price AI cost today (UTC), not invoice amount.',
          '# TYPE nexus_ai_estimated_cost_usd_today gauge',
          `nexus_ai_estimated_cost_usd_today ${aiOperations.estimatedCostUsd}`,
        );
      }
    }

    return output.join('\n');
  }

  reset() {
    this.requestsTotal = 0;
    this.errorsTotal = 0;
    this.totalLatencyMs = 0;
    for (const bucket of HTTP_LATENCY_BUCKETS_MS) {
      this.requestLatencyBuckets.set(bucket, 0);
    }
    this.activeSubmissions = 0;
    this.registrationFollowUpsGenerated = 0;
    this.registrationEvaluations.clear();
    this.lastReset = new Date().toISOString();
  }
}
