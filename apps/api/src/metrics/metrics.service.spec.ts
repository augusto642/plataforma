import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AiUsageService } from '../ai/llm/ai-usage.service';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should record requests and compute average latency', () => {
    service.recordRequest(100, false);
    service.recordRequest(200, true);

    const snapshot = service.snapshot();
    expect(snapshot.requestsTotal).toBe(2);
    expect(snapshot.errorsTotal).toBe(1);
    expect(snapshot.avgLatencyMs).toBe(150);
  });

  it('exports cumulative HTTP latency buckets and resets them with the request counters', async () => {
    service.recordRequest(50, false);
    service.recordRequest(200, true);
    service.recordRequest(6000, false);

    const output = await service.toPrometheusFormat();
    expect(output).toContain('nexus_http_request_duration_seconds_bucket{le="0.05"} 1');
    expect(output).toContain('nexus_http_request_duration_seconds_bucket{le="0.1"} 1');
    expect(output).toContain('nexus_http_request_duration_seconds_bucket{le="0.25"} 2');
    expect(output).toContain('nexus_http_request_duration_seconds_bucket{le="5"} 2');
    expect(output).toContain('nexus_http_request_duration_seconds_bucket{le="+Inf"} 3');
    expect(output).toContain('nexus_http_request_duration_seconds_sum 6.250');
    expect(output).toContain('nexus_http_request_duration_seconds_count 3');

    service.reset();
    const resetOutput = await service.toPrometheusFormat();
    expect(resetOutput).toContain('nexus_http_request_duration_seconds_bucket{le="0.05"} 0');
    expect(resetOutput).toContain('nexus_http_request_duration_seconds_count 0');
  });

  it('only controls allowlisted AI queues and surfaces unavailable queues', async () => {
    const queue = {
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: getQueueToken('ai-reviews'), useValue: queue },
      ],
    }).compile();
    const metrics = module.get<MetricsService>(MetricsService);

    await metrics.controlQueue('ai-reviews', 'pause');
    await metrics.controlQueue('ai-reviews', 'resume');

    expect(queue.pause).toHaveBeenCalledTimes(1);
    expect(queue.resume).toHaveBeenCalledTimes(1);
    await expect(metrics.controlQueue('research', 'pause')).rejects.toThrow(
      'A fila research não está disponível.',
    );
  });

  it('should export HTTP, process, queue and AI metrics in Prometheus format', async () => {
    service.recordRequest(50, false);
    service.recordSubmissionStart();
    service.recordRegistrationFollowUpGenerated();
    service.recordRegistrationEvaluation('heuristic', 'medium', true);

    const output = await service.toPrometheusFormat();
    expect(output).toContain('nexus_http_requests_total 1');
    expect(output).toContain('nexus_active_sandbox_submissions 1');
    expect(output).toContain('nexus_process_memory_rss_bytes');
    expect(output).toContain('nexus_queue_metrics_available{queue="submissions"} 0');
    expect(output).toContain('nexus_registration_followups_generated_total 1');
    expect(output).toContain(
      'nexus_registration_evaluations_total{source="heuristic",confidence="medium",follow_up="true"} 1',
    );
    expect(output).toContain('nexus_ai_fallback_metrics_available 0');
  });

  it('exports observed queue states and persisted AI fallback indicators', async () => {
    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({
        wait: 2,
        active: 1,
        completed: 8,
        failed: 3,
        delayed: 0,
        paused: 0,
      }),
      getWaiting: jest.fn().mockResolvedValue([
        { timestamp: Date.now() - 5_000 },
      ]),
    };
    const aiUsage = {
      getDailyOperations: jest.fn().mockResolvedValue({
        calls: 10,
        failedCalls: 2,
        blockedCalls: 2,
        totalTokens: 1000,
        unpricedCalls: 1,
        fallbackCalls: 4,
        fallbackRate: 0.2,
        latencySamples: 10,
        averageLatencyMs: 825,
        p95LatencyMs: 1300,
        pricedCalls: 9,
        estimatedCostUsd: 0.01,
        pricingCheckedAt: '2026-11-14',
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: getQueueToken('submissions'), useValue: queue },
        { provide: AiUsageService, useValue: aiUsage },
      ],
    }).compile();
    const metrics = module.get<MetricsService>(MetricsService);

    const output = await metrics.toPrometheusFormat();

    expect(output).toContain('nexus_queue_metrics_available{queue="submissions"} 1');
    expect(output).toContain('nexus_queue_jobs{queue="submissions",state="waiting"} 2');
    expect(output).toContain('nexus_queue_jobs{queue="submissions",state="failed"} 3');
    expect(output).toMatch(/nexus_queue_head_waiting_age_seconds\{queue="submissions"\} [4-6]/);
    expect(output).toContain('nexus_ai_fallback_metrics_available 1');
    expect(output).toContain('nexus_ai_llm_calls_today 10');
    expect(output).toContain('nexus_ai_llm_tokens_today 1000');
    expect(output).toContain('nexus_ai_llm_unpriced_calls_today 1');
    expect(output).toContain('nexus_ai_llm_latency_samples_today 10');
    expect(output).toContain('nexus_ai_llm_avg_latency_ms_today 825');
    expect(output).toContain('nexus_ai_llm_p95_latency_ms_today 1300');
    expect(output).toContain('nexus_ai_fallback_calls_today 4');
    expect(output).toContain('nexus_ai_fallback_rate_today 0.2');
    expect(output).toContain('nexus_ai_estimated_cost_usd_today 0.01');
  });

  it('exports real dependency and runner diagnostic status without inventing success', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      runnerDiagnostic: { findFirst: jest.fn()
        .mockResolvedValueOnce({ language: 'javascript', status: 'failed', finishedAt: new Date('2026-01-01T00:00:00Z') })
        .mockResolvedValueOnce(null) },
    };
    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: { ping: jest.fn().mockResolvedValue(true) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('true') } },
      ],
    }).compile();
    const output = await module.get(MetricsService).toPrometheusFormat();
    expect(output).toContain('nexus_dependency_up{service="database"} 1');
    expect(output).toContain('nexus_dependency_up{service="redis"} 1');
    expect(output).toContain('nexus_runner_diagnostics_available 1');
    expect(output).toContain('nexus_runner_diagnostic_success{language="javascript"} 0');
    expect(output).toContain('nexus_runner_diagnostic_timestamp_seconds{language="python"} 0');
    prisma.$queryRaw.mockRejectedValue(new Error('database down'));
    const degraded = await module.get(MetricsService).toPrometheusFormat();
    expect(degraded).toContain('nexus_dependency_up{service="database"} 0');
    expect(degraded).toContain('nexus_runner_diagnostics_available 0');
  });
});
