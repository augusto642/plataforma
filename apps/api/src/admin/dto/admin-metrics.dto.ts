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

export interface AdminMetricsResponseDto {
  timestamp: string;
  system: SystemTelemetryMetrics;
  platform: PlatformCountsSummary;
  cache: CacheHealthSummary;
}
