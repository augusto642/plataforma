export type CourseLevel = 'Iniciante' | 'Intermediário' | 'Avançado' | 'Todos os Níveis';
export type FilterLevel = 'all' | 'Iniciante' | 'Intermediário' | 'Avançado';

export interface CourseModule {
  name: string;
  tasks: string;
}

export interface Course {
  id: string;
  title: string;
  modalTitle?: string;
  level: CourseLevel;
  hours: string;
  challenges: string;
  xp: string;
  iconType: 'fullstack' | 'gobackend' | 'algorithms' | 'devops' | 'ai' | 'fundamentals';
  desc: string;
  shortDesc?: string;
  tags: string[];
  filterTags: string[];
  inProgress?: boolean;
  progressPercent?: number;
  modules: CourseModule[];
}
