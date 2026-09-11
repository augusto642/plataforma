import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

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

  it('should export valid Prometheus formatted string', () => {
    service.recordRequest(50, false);
    service.recordSubmissionStart();

    const output = service.toPrometheusFormat();
    expect(output).toContain('nexus_http_requests_total 1');
    expect(output).toContain('nexus_active_sandbox_submissions 1');
    expect(output).toContain('nexus_process_memory_rss_bytes');
  });
});
