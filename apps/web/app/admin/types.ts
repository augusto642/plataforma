// B40/A4 (Sprint 13) — tipos do painel admin espelham os DTOs REAIS da
// API. Os tipos fictícios anteriores (SystemMetric de "cluster Piston",
// PistonClusterNode, AuditLogItem, CertificateItem, CourseAdminItem com
// rating/status, InstructorItem com rating/especializações) nasceram do
// mockData e foram removidos junto com ele: nada aqui descreve um dado
// que a API não retorne de verdade.

export type AdminTab =
  | 'overview'
  | 'funnel'
  | 'users'
  | 'instructors'
  | 'courses'
  | 'system'
  | 'audit';

export type AdminRole = 'student' | 'instructor' | 'admin';
export type AdminPlan = 'free' | 'pro';

/** Linha de GET /admin/users (AdminService.getUsers). */
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  plan: AdminPlan;
  xp: number;
  level: number;
  streakDays: number;
  talentVisible: boolean;
  giteaUserId: number | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  enrollmentsCount: number;
  submissionsCount: number;
  instructedCoursesCount: number;
  badgesCount: number;
}

export interface AdminUsersPage {
  data: AdminUserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

/** Item de GET /courses (CoursesService.findAll). */
export interface AdminCourseRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublicLibrary: boolean;
  instructorId: string;
  createdAt: string;
  updatedAt: string;
  instructor: { id: string; name: string; email: string } | null;
  _count: { enrollments: number; activities: number };
}

/** GET /admin/metrics (AdminService.getMetrics). */
export interface AdminMetrics {
  timestamp: string;
  system: {
    uptimeSeconds: number;
    memory: {
      rssMb: number;
      heapTotalMb: number;
      heapUsedMb: number;
      externalMb: number;
    };
    nodeVersion: string;
    platform: string;
    httpRequestsTotal: number;
    httpErrorsTotal: number;
    avgLatencyMs: number;
    activeSubmissions: number;
  };
  platform: {
    users: {
      total: number;
      students: number;
      instructors: number;
      admins: number;
      activeLast24h: number;
    };
    courses: { total: number; publicLibrary: number; totalEnrollments: number };
    activities: { total: number };
    submissions: {
      total: number;
      passed: number;
      failed: number;
      pendingOrRunning: number;
      passRate: number;
    };
  };
  cache: { status: string; pingLatencyMs: number };
}

/** GET /admin/health (AdminService.getHealth). */
export interface AdminHealth {
  status: string;
  timestamp: string;
  uptime: number;
  services: { database: string; redis: string };
}
