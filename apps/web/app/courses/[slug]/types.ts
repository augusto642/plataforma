export type LessonType = 'git_challenge' | 'quiz' | 'lab' | 'project';
export type LessonStatus = 'completed' | 'in_progress' | 'locked';

export interface CourseLesson {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  xp: number;
  status: LessonStatus;
  description: string;
  targetFile?: string;
}

export interface DetailedCourseModule {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  xpTotal: number;
  estimatedHours: string;
  lessons: CourseLesson[];
  completedCount: number;
}

export interface PrerequisiteNode {
  id: string;
  title: string;
  level: 'fundamental' | 'core' | 'advanced';
  status: 'mastered' | 'current' | 'locked';
  description: string;
}

export interface CapstoneProject {
  title: string;
  description: string;
  deliverables: string[];
  gitRepoTemplate: string;
  estimatedHours: string;
  xpReward: number;
}

export interface DetailedCourse {
  slug: string;
  title: string;
  badgeTitle: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Especialista';
  hours: string;
  challengesCount: number;
  totalXp: number;
  rating: number;
  studentsCount: number;
  instructor: {
    name: string;
    role: string;
    avatarInitials: string;
    bio: string;
  };
  overview: string;
  tags: string[];
  userProgressPercent: number;
  currentLessonId?: string;
  socraticFocusAreas: string[];
  prerequisites: PrerequisiteNode[];
  modules: DetailedCourseModule[];
  capstone: CapstoneProject;
}
