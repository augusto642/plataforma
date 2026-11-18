/**
 * @plataforma/contracts
 * Shared domain interfaces and DTO definitions across apps/api and apps/web
 */

export type Role = 'student' | 'instructor' | 'admin';
export type Language = 'java' | 'javascript' | 'typescript' | 'python' | 'portugol';
export type SubmissionStatus = 'pending' | 'queued' | 'running' | 'passed' | 'failed' | 'error';

export const LEGAL_DOCUMENT_VERSIONS = {
  terms: '2026-11-15',
  privacy: '2026-11-15',
} as const;

export const AGE_ELIGIBILITY_POLICY_VERSION = '2026-11-15';

export const BILLING_PRICES_CENTS = {
  pro: {
    monthly: 3990,
    annual: 35880,
  },
} as const;

export const CAREER_GOALS = [
  'frontend',
  'backend',
  'ai',
  'fullstack',
  'architect',
  'devops',
  'data_science',
  'data_engineering',
  'design',
  'freelancer',
  'mobile',
  'security',
  'qa',
  'global',
  'lead',
  'startup',
  'hackathons',
  'mlops',
  'platform_engineering',
  'cloud_architect',
  'gamedev',
  'blockchain',
  'embedded_iot',
  'automation_rpa',
  'product_manager',
] as const;

export type CareerGoal = (typeof CAREER_GOALS)[number];

export const CAREER_GOAL_LABELS: Record<CareerGoal, string> = {
  frontend: 'Front-end',
  backend: 'Back-end',
  ai: 'Inteligência Artificial',
  fullstack: 'Full-stack',
  architect: 'Arquitetura de Software',
  devops: 'DevOps & Infraestrutura',
  data_science: 'Ciência de Dados',
  data_engineering: 'Engenharia de Dados',
  design: 'Design & Tecnologia',
  freelancer: 'Freelancer',
  mobile: 'Desenvolvimento Mobile',
  security: 'Segurança da Informação',
  qa: 'Qualidade & QA',
  global: 'Vaga Internacional',
  lead: 'Liderança Técnica',
  startup: 'Startup',
  hackathons: 'Hackathons',
  mlops: 'MLOps',
  platform_engineering: 'Platform Engineering',
  cloud_architect: 'Cloud Architect',
  gamedev: 'Game Developer',
  blockchain: 'Blockchain / Web3',
  embedded_iot: 'Sistemas Embarcados & IoT',
  automation_rpa: 'Automação, Bots & RPA',
  product_manager: 'Product Manager',
};

export const EXPERIENCE_LEVELS = ['beginner', 'junior', 'mid', 'senior'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const WEEKLY_TIME_COMMITMENTS = ['5h', '10h', '20h'] as const;
export type WeeklyTimeCommitment = (typeof WEEKLY_TIME_COMMITMENTS)[number];

/**
 * B38b (Sprint 11) — faixa de EXIBIÇÃO derivada do XP total acumulado.
 * Não existe sistema de ligas no produto e a API de leaderboard NÃO
 * retorna faixa: o ranking é por curso, ordenado por XP total.
 */
export type XpBand = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'challenger';

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
  streakDays: number;
  badges: Array<Pick<BadgeDto, 'id' | 'badgeCode' | 'title' | 'icon'>>;
  completedActivitiesCount: number;
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
