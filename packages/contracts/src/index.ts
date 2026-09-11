/**
 * @plataforma/contracts
 * Shared domain interfaces and DTO definitions across apps/api and apps/web
 */

export type Role = 'student' | 'instructor' | 'admin';
export type Language = 'java' | 'javascript' | 'typescript' | 'python' | 'portugol';
export type SubmissionStatus = 'pending' | 'queued' | 'running' | 'passed' | 'failed' | 'error';
export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'challenger';

export interface UserProfileDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  xp: number;
  level: number;
  streakDays: number;
  talentVisible: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface TestCaseResultDto {
  id: string;
  name: string;
  passed: boolean;
  durationMs?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  errorMessage?: string | null;
  isHidden?: boolean;
}

export interface SubmissionResponseDto {
  id: string;
  activityId: string;
  userId: string;
  status: SubmissionStatus;
  score?: number | null;
  maxScore?: number | null;
  durationMs?: number | null;
  errorMessage?: string | null;
  logs?: string | null;
  xpAwarded: boolean;
  aiFeedback?: string | null;
  aiHints?: string | null;
  createdAt: string;
  testResults: TestCaseResultDto[];
}

export interface GamificationRewardDto {
  xpGained: number;
  totalXp: number;
  level: number;
  streak: number;
}

export interface BadgeDto {
  id: string;
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface ActivitySummaryDto {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  language: Language;
  orderIndex: number;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface CourseDetailDto {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructorName?: string;
  activitiesCount: number;
  enrolledStudentsCount: number;
  activities: ActivitySummaryDto[];
}

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  tier: LeagueTier;
  streakDays: number;
  avatarUrl?: string;
}

export interface CertificateVerificationDto {
  hash: string;
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  issuedAt: string;
  hoursSpent: number;
  gradeAverage: number;
  competencies: string[];
  signatureValid: boolean;
}
