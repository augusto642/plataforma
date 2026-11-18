export interface SystemMemoryMetrics {
  rssMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  externalMb: number;
}

export interface SystemTelemetryMetrics {
  uptimeSeconds: number;
  memory: SystemMemoryMetrics;
  nodeVersion: string;
  platform: string;
  httpRequestsTotal: number;
  httpErrorsTotal: number;
  avgLatencyMs: number;
  activeSubmissions: number;
}

export interface UserMetricsSummary {
  total: number;
  students: number;
  instructors: number;
  admins: number;
  activeLast24h: number;
}

export interface CourseMetricsSummary {
  total: number;
  publicLibrary: number;
  totalEnrollments: number;
}

export interface SubmissionMetricsSummary {
  total: number;
  passed: number;
  failed: number;
  pendingOrRunning: number;
  passRate: number;
}

export interface PlatformCountsSummary {
  users: UserMetricsSummary;
  courses: CourseMetricsSummary;
  activities: {
    total: number;
  };
  submissions: SubmissionMetricsSummary;
}

export interface CacheHealthSummary {
  status: 'connected' | 'degraded' | 'unavailable';
  pingLatencyMs?: number;
}

export interface AiOperationsSummary {
  calls: number;
  failedCalls: number;
  blockedCalls: number;
  fallbackCalls: number;
  fallbackRate: number | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  pricedCalls: number;
  unpricedCalls: number;
  estimatedCostUsd: number | null;
  pricingCheckedAt: string;
}

export interface AdminQueueMetrics {
  name: string;
  available: boolean;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  headWaitingAgeSeconds?: number;
}

export interface AiQualitySummary {
  windowDays: number;
  total: number;
  helpful: number;
  notHelpful: number;
  concerns: {
    tooMuchAnswer: number;
    incorrect: number;
    unclear: number;
  };
}

export interface AdminMetricsResponseDto {
  timestamp: string;
  system: SystemTelemetryMetrics;
  platform: PlatformCountsSummary;
  ai: AiOperationsSummary;
  aiQuality: AiQualitySummary;
  queues: AdminQueueMetrics[];
  cache: CacheHealthSummary;
}
