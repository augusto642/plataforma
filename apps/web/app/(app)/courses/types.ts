// B41 (Sprint 14) — os tipos desta página passaram a refletir apenas
// o que a API realmente entrega. O tipo antigo (`Course`) carregava
// nível, horas, XP, tags e módulos de um catálogo estático inventado
// (COURSES_DATA) que não existe no DTO de GET /courses.

/** Curso como a listagem da API entrega (findAll de courses.service). */
export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  instructorName: string | null;
  enrollmentsCount: number;
  activitiesCount: number;
}

/** Progresso real do usuário num curso (GET /users/me/progress). */
export interface CourseProgressEntry {
  courseId: string;
  courseTitle: string;
  slug: string;
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
}

/** Detalhe real do curso (GET /courses/:id) — usado na ementa. */
export interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  instructorName: string | null;
  enrollmentsCount: number;
  activitiesCount: number;
  activities: Array<{
    id: string;
    title: string;
    language: string;
    order: number;
  }>;
}
