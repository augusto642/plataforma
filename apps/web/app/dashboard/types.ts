export interface UserBadge {
  id: string;
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface CourseProgressItem {
  courseId: string;
  courseTitle: string;
  slug: string;
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
}

export interface StudentDashboardData {
  user: {
    name: string;
    email: string;
    avatarInitials: string;
    xp: number;
    level: number;
    levelTitle: string;
    streakDays: number;
    league: {
      name: string;
      tier: string;
      rank: number;
      isPromotionZone: boolean;
      timeRemaining: string;
    };
  };
  activeMission: {
    trackTitle: string;
    difficulty: 'Fácil' | 'Média' | 'Difícil' | 'Extremo';
    moduleInfo: string;
    title: string;
    description: string;
    progressPercent: number;
    completedLabs: number;
    totalLabs: number;
    gitCloneUrl: string;
    activityId?: string;
    courseId?: string;
  };
  weeklyGoal: {
    studiedHours: number;
    targetHours: number;
    percent: number;
    remainingTimeText: string;
    days: Array<{
      day: string;
      completed: boolean;
      isToday: boolean;
      hasFlame?: boolean;
    }>;
  };
  skillRoadmap: Array<{
    id: string;
    title: string;
    progressText: string;
    status: 'completed' | 'active' | 'locked' | 'boss';
    icon: string;
    xpReward?: number;
    badgeName?: string;
    prerequisite?: string;
  }>;
  radarSkills: {
    overallIndex: number;
    skills: Array<{
      name: string;
      value: number; // 0 - 100
      benchmark: number; // 0 - 100
    }>;
  };
  heatmap: {
    totalSubmissions: number;
    maxStreak: number;
    currentStreak: number;
    averageDaily: number;
    days: Array<{
      date: string;
      level: 0 | 1 | 2 | 3;
      count: number;
    }>;
  };
  leaderboard: Array<{
    rank: number;
    name: string;
    initials: string;
    avatarGradient: string;
    completedCount: number;
    xp: number;
    todayGain?: string;
    isCurrentUser?: boolean;
    lastActive?: string;
  }>;
  socraticAi: {
    tip: string;
    strength: string;
    attentionPoint: string;
    lastActivityId?: string;
  };
}
