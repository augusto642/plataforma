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

// Central 216 (F2) — o catálogo público não traz `id`, só `slug`:
// o progresso do usuário logado é casado pelo slug do curso.
export function progressByCourseSlug(
  entries: CourseProgressEntry[],
): Map<string, CourseProgressEntry> {
  return new Map(
    entries.filter((entry) => entry.slug).map((entry) => [entry.slug, entry]),
  );
}

export type CourseProgressStatusKind = 'not-started' | 'in-progress' | 'completed';

/**
 * Q2 (Sprint 15) — regra ÚNICA de rótulo de progresso, compartilhada
 * por CourseCard e ActiveMissionBanner: 0% é "Não iniciado" (a mesma
 * leitura que pickActiveProgress já fazia ao escolher a trilha
 * ativa). Antes o card dizia "Em Progresso (0%)" para uma matrícula
 * real em 0%, enquanto o restante da página tratava 0% como não
 * iniciado. O dado não muda — só o rótulo é unificado.
 */
export function courseProgressStatus(
  progress?: CourseProgressEntry | null,
): { kind: CourseProgressStatusKind; label: string } {
  if (!progress || progress.progressPercent <= 0) {
    return { kind: 'not-started', label: 'Não iniciado' };
  }
  if (progress.progressPercent >= 100) {
    return { kind: 'completed', label: 'Concluído (100%)' };
  }
  return {
    kind: 'in-progress',
    label: `Em Progresso (${progress.progressPercent}%)`,
  };
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

/** Caminho de adaptação do aluno num curso (GET /adaptation/courses/:id/path). */
export interface CoursePathModuleView {
  tag: string;
  title: string;
  order: number;
  status: string;
  totalActivities: number;
  passedActivities: number;
  effectiveCompletedActivities: number;
  testOutActivity: { id: string; slug: string; title: string } | null;
}

export interface CoursePathView {
  courseId: string;
  isSyntaxTrack: boolean;
  modules: CoursePathModuleView[];
  nextActivity: {
    id: string;
    slug: string;
    title: string;
    order: number;
    moduleTag: string | null;
  } | null;
  entryModuleTag: string | null;
}

/**
 * Converte a resposta bruta do caminho de adaptação. Retorna null se o
 * payload não tiver a forma mínima — a página do curso simplesmente não
 * mostra a camada de adaptação nesse caso (nada é inventado).
 */
export function mapApiCoursePath(raw: unknown): CoursePathView | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.courseId !== 'string' || !raw.courseId) return null;
  const modulesRaw = Array.isArray(raw.modules) ? raw.modules : [];
  const modules: CoursePathModuleView[] = [];
  for (const item of modulesRaw) {
    if (!isRecord(item)) continue;
    if (typeof item.tag !== 'string' || typeof item.status !== 'string') continue;
    const testOut = isRecord(item.testOutActivity)
      ? item.testOutActivity
      : null;
    modules.push({
      tag: item.tag,
      title: typeof item.title === 'string' ? item.title : item.tag,
      order: asCount(item.order),
      status: item.status,
      totalActivities: asCount(item.totalActivities),
      passedActivities: asCount(item.passedActivities),
      effectiveCompletedActivities: asCount(item.effectiveCompletedActivities),
      testOutActivity:
        testOut && typeof testOut.id === 'string'
          ? {
              id: testOut.id,
              slug: typeof testOut.slug === 'string' ? testOut.slug : '',
              title: typeof testOut.title === 'string' ? testOut.title : '',
            }
          : null,
    });
  }
  const nextRaw = isRecord(raw.nextActivity) ? raw.nextActivity : null;
  return {
    courseId: raw.courseId,
    isSyntaxTrack: raw.isSyntaxTrack === true,
    modules,
    nextActivity:
      nextRaw && typeof nextRaw.id === 'string'
        ? {
            id: nextRaw.id,
            slug: typeof nextRaw.slug === 'string' ? nextRaw.slug : '',
            title: typeof nextRaw.title === 'string' ? nextRaw.title : '',
            order: asCount(nextRaw.order),
            moduleTag:
              typeof nextRaw.moduleTag === 'string' ? nextRaw.moduleTag : null,
          }
        : null,
    entryModuleTag:
      typeof raw.entryModuleTag === 'string' ? raw.entryModuleTag : null,
  };
}

/** Rótulo único do estado de um módulo da espinha na interface. */
export function moduleStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Concluído';
    case 'tested-out':
      return 'Concluído via test-out';
    case 'in-progress':
      return 'Em andamento';
    default:
      return 'Não iniciado';
  }
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
