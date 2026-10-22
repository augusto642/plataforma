import type { CourseDetail, CourseListItem, CourseProgressEntry } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function instructorNameOf(raw: Record<string, unknown>): string | null {
  const instructor = raw.instructor;
  if (isRecord(instructor) && typeof instructor.name === 'string' && instructor.name) {
    return instructor.name;
  }
  return null;
}

/**
 * Converte um item bruto de GET /courses em CourseListItem.
 * Retorna null para registros sem id/título/slug válidos — a página
 * nunca exibe um curso que a API não sustentou. Nenhum campo é
 * inventado: o DTO real não tem nível, horas, XP nem tags.
 */
export function mapApiCourse(raw: unknown): CourseListItem | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.title !== 'string' || !raw.title) return null;
  if (typeof raw.slug !== 'string' || !raw.slug) return null;

  const count = isRecord(raw._count) ? raw._count : {};
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    description: typeof raw.description === 'string' ? raw.description : null,
    instructorName: instructorNameOf(raw),
    enrollmentsCount: asCount(count.enrollments),
    activitiesCount: asCount(count.activities),
  };
}

export function mapApiCourses(raw: unknown): CourseListItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => mapApiCourse(item))
    .filter((item): item is CourseListItem => item !== null);
}

/** Extrai os progressos por curso de GET /users/me/progress. */
export function extractCoursesProgress(raw: unknown): CourseProgressEntry[] {
  if (!isRecord(raw) || !Array.isArray(raw.coursesProgress)) return [];
  const entries: CourseProgressEntry[] = [];
  for (const item of raw.coursesProgress) {
    if (!isRecord(item)) continue;
    if (typeof item.courseId !== 'string' || !item.courseId) continue;
    entries.push({
      courseId: item.courseId,
      courseTitle: typeof item.courseTitle === 'string' ? item.courseTitle : '',
      slug: typeof item.slug === 'string' ? item.slug : '',
      totalActivities: asCount(item.totalActivities),
      completedActivities: asCount(item.completedActivities),
      progressPercent: asCount(item.progressPercent),
    });
  }
  return entries;
}

export function progressByCourseId(
  entries: CourseProgressEntry[],
): Map<string, CourseProgressEntry> {
  return new Map(entries.map((entry) => [entry.courseId, entry]));
}

/**
 * Escolhe a "trilha ativa" para o banner a partir do progresso REAL:
 * cursos em andamento (1–99%) primeiro, pelo maior percentual; se
 * nenhum estiver em andamento, um curso matriculado ainda não
 * iniciado (0%); cursos concluídos (100%) não são trilha ativa.
 * Sem matrícula correspondente, retorna null e o banner some.
 */
export function pickActiveProgress(
  entries: CourseProgressEntry[],
): CourseProgressEntry | null {
  const inProgress = entries
    .filter((e) => e.progressPercent > 0 && e.progressPercent < 100)
    .sort(
      (a, b) =>
        b.progressPercent - a.progressPercent ||
        b.completedActivities - a.completedActivities,
    );
  if (inProgress.length > 0) return inProgress[0];

  const notStarted = entries.filter((e) => e.progressPercent === 0);
  if (notStarted.length > 0) return notStarted[0];

  return null;
}

/** Converte o detalhe bruto de GET /courses/:id para a ementa real. */
export function mapApiCourseDetail(raw: unknown): CourseDetail | null {
  const base = mapApiCourse(raw);
  if (!base || !isRecord(raw)) return null;

  const activitiesRaw = Array.isArray(raw.activities) ? raw.activities : [];
  const activities = activitiesRaw
    .filter(isRecord)
    .filter(
      (a) => typeof a.id === 'string' && typeof a.title === 'string',
    )
    .map((a) => ({
      id: a.id as string,
      title: a.title as string,
      language: typeof a.language === 'string' ? a.language : '',
      order: asCount(a.order),
    }))
    .sort((a, b) => a.order - b.order);

  const count = isRecord(raw._count) ? raw._count : {};
  return {
    ...base,
    enrollmentsCount: asCount(count.enrollments),
    // O detalhe não traz _count.activities: a contagem real é a
    // própria lista de atividades retornada.
    activitiesCount: activities.length,
    activities,
  };
}

/** Iniciais do avatar a partir do nome real do usuário. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stats pessoais reais do cabeçalho (GET /users/me/progress). */
export function extractMyStats(raw: unknown): { xp: number; streakDays: number } | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.xp !== 'number' || typeof raw.streakDays !== 'number') return null;
  return { xp: raw.xp, streakDays: raw.streakDays };
}
