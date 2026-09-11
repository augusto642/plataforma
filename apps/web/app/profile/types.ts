export type ProfileTab = 'overview' | 'repos' | 'achievements' | 'radar';

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  role: string;
  specialty: string;
  globalRank: number;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streakDays: number;
  highestStreak: number;
  totalContributions: number;
  completedChallenges: number;
  verifiedCertificatesCount: number;
  bio: string;
  location: string;
  status: string;
  githubUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
}

export type DeveloperProfile = UserProfile;

export interface TrackProgress {
  id: string;
  title: string;
  icon: string;
  moduleInfo: string;
  progressPercent: number;
  color: string;
}

export interface ActivityTimelineItem {
  id: string;
  title: string;
  desc: string;
  timeAgo: string;
  xpBonus?: number;
  type: 'challenge' | 'pr' | 'badge' | 'cert';
}

export interface GitRepository {
  id: string;
  name: string;
  description: string;
  language: 'Rust' | 'TypeScript' | 'Go' | 'Wasm' | 'Python' | 'C++';
  langColor: string;
  stars: number;
  forks: number;
  isPinned: boolean;
  repoUrl: string;
}

export interface GitRepositoryItem {
  id: string;
  name: string;
  description: string;
  language: string;
  langColor: string;
  stars: number;
  forks: number;
  isPinned?: boolean;
  repoUrl?: string;
  updatedAt?: string;
  visibility?: string;
  topics?: string[];
  liveUrl?: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'legendary' | 'epic' | 'rare';
  isUnlocked: boolean;
  progressText?: string;
}

export type AchievementRarity = 'Mítico' | 'Lendário' | 'Épico' | 'Raro';

export interface AchievementBadge {
  id: string;
  title: string;
  name?: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  tier?: 'legendary' | 'epic' | 'rare';
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  xpValue?: number;
}

export interface DigitalCertificate {
  id: string;
  title: string;
  trackName: string;
  issueDate: string;
  hours: string;
  hashSha256: string;
  issuer: string;
  skills: string[];
}

export interface VerifiedCertificate {
  id: string;
  title: string;
  trackName?: string;
  issueDate: string;
  hours?: string;
  hashSha256?: string;
  verificationHash?: string;
  issuer: string;
  skills: string[];
  certificateUrl?: string;
  badgeUrl?: string;
}

export interface SkillAxis {
  label: string;
  score: number;
  color: string;
  description: string;
}

export interface Skill6DItem {
  name: string;
  category: string;
  score: number;
  fullScore?: number;
  color: string;
  icon?: string;
  description: string;
  keyProjects?: string[];
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  weekday?: number;
  unitTestsPassed?: number;
  challengesSolved?: number;
  prMerged?: number;
}

export interface HeatmapData {
  year: number;
  totalContributions?: number;
  totalActivities: number;
  currentStreak: number;
  longestStreak?: number;
  maxStreak?: number;
  activeDaysCount?: number;
  days: HeatmapDay[];
}
