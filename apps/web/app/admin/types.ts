export type AdminRole = 'student' | 'instructor' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type SeverityLevel = 'info' | 'warn' | 'critical';
export type CourseStatus = 'published' | 'draft' | 'archived';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type AdminTab = 'overview' | 'users' | 'instructors' | 'courses' | 'system' | 'audit';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  xp: number;
  streak: number;
  status: UserStatus;
  createdAt: string;
  lastActiveAt: string;
  avatar?: string;
  tracksEnrolled?: string[];
  challengesCompleted?: number;
  specialization?: string;
}

export interface SystemMetric {
  activeUsers: number;
  pistonLatencyMs: number;
  totalSubmissions: number;
  passRate: number;
  containerMemoryUsage: string;
  cpuLoad: string;
  p99LatencyMs: number;
  queueSize: number;
  errorRate: number;
  dockerContainersCount: number;
  sandboxUptime: string;
}

export interface AdminChallengeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface AdminChallengeItem {
  id: string;
  title: string;
  language: string;
  difficulty: DifficultyLevel;
  cpuLimitMs: number;
  ramLimitMb: number;
  codeTemplate: string;
  hiddenTestsCount: number;
  testCases: AdminChallengeTestCase[];
  activeSubmissions: number;
  passRate: number;
}

export interface CourseAdminItem {
  id: string;
  title: string;
  slug: string;
  language: string;
  difficulty: 'iniciante' | 'intermediário' | 'avançado';
  totalChallenges: number;
  enrolledStudents: number;
  status: CourseStatus;
  instructorName: string;
  instructorId: string;
  challenges: AdminChallengeItem[];
  rating: number;
  updatedAt: string;
}

export interface InstructorItem {
  id: string;
  name: string;
  email: string;
  tracksCount: number;
  challengesCount: number;
  activeStudents: number;
  rating: number;
  status: UserStatus;
  specializations: string[];
  joinedAt: string;
  avatar?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: AdminRole;
    email: string;
  };
  action: string;
  target: string;
  ipAddress: string;
  severity: SeverityLevel;
  details?: string;
}

export interface CertificateItem {
  id: string;
  certificateCode: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  issuedAt: string;
  sha256Hash: string;
  score: number;
  status: 'valid' | 'revoked';
}

export interface PistonClusterNode {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'degraded';
  latencyMs: number;
  activeJobs: number;
  memoryUsage: string;
  cpuUsage: string;
  runtimeEngines: string[];
}
