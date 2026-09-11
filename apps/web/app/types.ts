export interface UserBadge {
  id: string;
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface CourseProgress {
  courseId: string;
  courseTitle: string;
  slug: string;
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
}

export interface UserProgress {
  xp?: number;
  level?: number;
  streakDays?: number;
  badges?: UserBadge[];
  completedActivitiesCount: number;
  totalSubmissionsCount: number;
  averageScore: number;
  coursesProgress: CourseProgress[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  streakDays: number;
  badges: Array<{ id: string; badgeCode: string; title: string; icon: string }>;
  completedActivitiesCount: number;
}

export interface LibraryActivity {
  id: string;
  title: string;
  slug: string;
  description: string;
  language: string;
  order: number;
  conceptTags: string[];
  course?: { id: string; title: string; slug: string };
}

export interface LineFeedbackItem {
  line: number;
  comment: string;
  severity: 'info' | 'warning';
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface TalentEntry {
  rank: number;
  initials: string;
  name: string;
  xp: number;
  level: number;
  streakDays: number;
  completedActivitiesCount: number;
}
