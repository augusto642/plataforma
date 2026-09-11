import { Injectable } from '@nestjs/common';

export interface MetricSnapshot {
  requestsTotal: number;
  errorsTotal: number;
  avgLatencyMs: number;
  lastReset: string;
}

@Injectable()
export class MetricsService {
  private requestsTotal = 0;
  private errorsTotal = 0;
  private totalLatencyMs = 0;
  private activeSubmissions = 0;
  private lastReset = new Date().toISOString();

  recordRequest(latencyMs: number, isError: boolean) {
    this.requestsTotal += 1;
    this.totalLatencyMs += latencyMs;
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

  snapshot(): MetricSnapshot {
    return {
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      avgLatencyMs: this.requestsTotal > 0 ? Math.round(this.totalLatencyMs / this.requestsTotal) : 0,
      lastReset: this.lastReset,
    };
  }

  toPrometheusFormat(): string {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const avgLatency = this.requestsTotal > 0 ? this.totalLatencyMs / this.requestsTotal : 0;

    return [
      '# HELP nexus_http_requests_total Total number of HTTP requests received.',
      '# TYPE nexus_http_requests_total counter',
      `nexus_http_requests_total ${this.requestsTotal}`,
      '',
      '# HELP nexus_http_errors_total Total number of HTTP requests that resulted in error.',
      '# TYPE nexus_http_errors_total counter',
      `nexus_http_errors_total ${this.errorsTotal}`,
      '',
      '# HELP nexus_http_avg_latency_ms Average HTTP latency in milliseconds.',
      '# TYPE nexus_http_avg_latency_ms gauge',
      `nexus_http_avg_latency_ms ${avgLatency.toFixed(2)}`,
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
    ].join('\n');
  }

  reset() {
    this.requestsTotal = 0;
    this.errorsTotal = 0;
    this.totalLatencyMs = 0;
    this.activeSubmissions = 0;
    this.lastReset = new Date().toISOString();
  }
}
