import { describe, expect, it } from 'vitest';
import {
  courseProgressStatus,
  extractCoursesProgress,
  extractMyStats,
  initialsOf,
  mapApiCourse,
  mapApiCourseDetail,
  mapApiCourses,
  mapApiCoursePath,
  moduleStatusLabel,
  pickActiveProgress,
  progressByCourseId,
} from '../utils';
import type { CourseProgressEntry } from '../types';

// B41 (Sprint 14) — a listagem só pode exibir o que a API sustenta.
// Estes testes travam o mapeamento: nenhum campo inventado entra e
// registros sem sustentação são descartados.

const apiCourse = {
  id: 'course-1',
  title: 'Rust na Prática',
  slug: 'rust-na-pratica',
  description: 'Curso real vindo da API.',
  instructor: { id: 'inst-1', name: 'Professora Real', email: 'real@example.com' },
  _count: { enrollments: 17, activities: 9 },
};

describe('mapApiCourse', () => {
  it('mapeia somente os campos reais do DTO da listagem', () => {
    const mapped = mapApiCourse(apiCourse);
    expect(mapped).toEqual({
      id: 'course-1',
      title: 'Rust na Prática',
      slug: 'rust-na-pratica',
      description: 'Curso real vindo da API.',
      instructorName: 'Professora Real',
      enrollmentsCount: 17,
      activitiesCount: 9,
    });
    // O DTO não tem nível/horas/XP/tags — nada disso pode aparecer.
    expect(mapped).not.toHaveProperty('level');
    expect(mapped).not.toHaveProperty('hours');
    expect(mapped).not.toHaveProperty('xp');
    expect(mapped).not.toHaveProperty('tags');
  });

  it('descarta registros sem id, título ou slug válidos', () => {
    expect(mapApiCourse(null)).toBeNull();
    expect(mapApiCourse({})).toBeNull();
    expect(mapApiCourse({ id: 'x', title: 'Sem slug' })).toBeNull();
    expect(mapApiCourse({ id: 'x', slug: 'sem-titulo' })).toBeNull();
    expect(mapApiCourses('não é lista')).toEqual([]);
    expect(mapApiCourses([apiCourse, { id: 42 }, null])).toHaveLength(1);
  });

  it('não inventa descrição nem instrutor quando a API não os traz', () => {
    const mapped = mapApiCourse({ id: 'c2', title: 'Go Básico', slug: 'go-basico' });
    expect(mapped?.description).toBeNull();
    expect(mapped?.instructorName).toBeNull();
    expect(mapped?.enrollmentsCount).toBe(0);
    expect(mapped?.activitiesCount).toBe(0);
  });
});

describe('progresso real (GET /users/me/progress)', () => {
  const progressPayload = {
    xp: 1250,
    streakDays: 4,
    coursesProgress: [
      {
        courseId: 'course-1',
        courseTitle: 'Rust na Prática',
        slug: 'rust-na-pratica',
        totalActivities: 9,
        completedActivities: 3,
        progressPercent: 33,
      },
    ],
  };

  it('extrai stats do cabeçalho e progressos por curso', () => {
    expect(extractMyStats(progressPayload)).toEqual({ xp: 1250, streakDays: 4 });
    expect(extractMyStats(null)).toBeNull();
    expect(extractMyStats({ xp: 'muito' })).toBeNull();

    const entries = extractCoursesProgress(progressPayload);
    expect(entries).toHaveLength(1);
    expect(progressByCourseId(entries).get('course-1')?.progressPercent).toBe(33);
    expect(extractCoursesProgress({ coursesProgress: 'x' })).toEqual([]);
  });

  it('pickActiveProgress prefere o curso em andamento de maior percentual', () => {
    const base: CourseProgressEntry = {
      courseId: 'a',
      courseTitle: 'A',
      slug: 'a',
      totalActivities: 10,
      completedActivities: 0,
      progressPercent: 0,
    };
    const entries: CourseProgressEntry[] = [
      { ...base, courseId: 'done', progressPercent: 100, completedActivities: 10 },
      { ...base, courseId: 'mid', progressPercent: 40, completedActivities: 4 },
      { ...base, courseId: 'low', progressPercent: 10, completedActivities: 1 },
      { ...base, courseId: 'fresh', progressPercent: 0 },
    ];
    expect(pickActiveProgress(entries)?.courseId).toBe('mid');
    // Sem curso em andamento, um matriculado não iniciado é a trilha ativa.
    expect(
      pickActiveProgress(entries.filter((e) => e.courseId === 'fresh'))?.courseId,
    ).toBe('fresh');
    // Só concluído ou nenhuma matrícula: sem banner.
    expect(
      pickActiveProgress(entries.filter((e) => e.courseId === 'done')),
    ).toBeNull();
    expect(pickActiveProgress([])).toBeNull();
  });
});

describe('courseProgressStatus (Q2 — Sprint 15)', () => {
  const base: CourseProgressEntry = {
    courseId: 'c1',
    courseTitle: 'Curso',
    slug: 'curso',
    totalActivities: 10,
    completedActivities: 0,
    progressPercent: 0,
  };

  it('0% é "Não iniciado" — com e sem matrícula', () => {
    expect(courseProgressStatus(base)).toEqual({
      kind: 'not-started',
      label: 'Não iniciado',
    });
    expect(courseProgressStatus(undefined)).toEqual({
      kind: 'not-started',
      label: 'Não iniciado',
    });
    expect(courseProgressStatus(null).kind).toBe('not-started');
  });

  it('1–99% é "Em Progresso (N%)" e 100% é "Concluído (100%)"', () => {
    expect(
      courseProgressStatus({ ...base, progressPercent: 40, completedActivities: 4 }),
    ).toEqual({ kind: 'in-progress', label: 'Em Progresso (40%)' });
    expect(
      courseProgressStatus({ ...base, progressPercent: 100, completedActivities: 10 }),
    ).toEqual({ kind: 'completed', label: 'Concluído (100%)' });
  });
});

describe('mapApiCourseDetail', () => {
  it('ordena as atividades reais e conta a partir da lista', () => {
    const detail = mapApiCourseDetail({
      ...apiCourse,
      _count: { enrollments: 21 },
      activities: [
        { id: 'a2', title: 'Segunda', language: 'rust', order: 2 },
        { id: 'a1', title: 'Primeira', language: 'rust', order: 1 },
        { id: 'a3', title: 'Terceira', language: 'rust', order: 3 },
      ],
    });
    expect(detail?.activities.map((a) => a.title)).toEqual([
      'Primeira',
      'Segunda',
      'Terceira',
    ]);
    expect(detail?.activitiesCount).toBe(3);
    expect(detail?.enrollmentsCount).toBe(21);
  });
});

describe('initialsOf', () => {
  it('deriva as iniciais do nome real', () => {
    expect(initialsOf('Maria Silva')).toBe('MS');
    expect(initialsOf('Maria da Silva')).toBe('MS');
    expect(initialsOf('Madonna')).toBe('MA');
    expect(initialsOf('  ')).toBe('?');
  });
});

// Sprint 21 — caminho de adaptação: a página só exibe o que a API de
// adaptação sustentou; payload malformado some com a camada inteira.
describe('mapApiCoursePath', () => {
  const rawPath = {
    courseId: 'course-1',
    courseSlug: 'introducao-python',
    isSyntaxTrack: true,
    entryModuleTag: 'operadores',
    modules: [
      {
        tag: 'saida-e-variaveis',
        title: 'Saída e variáveis',
        order: 1,
        status: 'tested-out',
        totalActivities: 3,
        passedActivities: 1,
        effectiveCompletedActivities: 3,
        testOutActivity: { id: 'a3', slug: 'a3', title: 'A3' },
      },
      {
        tag: 'operadores',
        title: 'Operadores',
        order: 3,
        status: 'not-started',
        totalActivities: 3,
        passedActivities: 0,
        effectiveCompletedActivities: 0,
        testOutActivity: null,
      },
    ],
    nextActivity: {
      id: 'b1',
      slug: 'b1',
      title: 'B1',
      order: 4,
      moduleTag: 'operadores',
    },
  };

  it('mapeia módulos, test-out e próximo passo reais', () => {
    const path = mapApiCoursePath(rawPath);
    expect(path?.isSyntaxTrack).toBe(true);
    expect(path?.modules).toHaveLength(2);
    expect(path?.modules[0].status).toBe('tested-out');
    expect(path?.modules[0].testOutActivity?.id).toBe('a3');
    expect(path?.modules[0].effectiveCompletedActivities).toBe(3);
    expect(path?.nextActivity?.id).toBe('b1');
    expect(path?.entryModuleTag).toBe('operadores');
  });

  it('rejeita payload sem courseId ou não-objeto', () => {
    expect(mapApiCoursePath(null)).toBeNull();
    expect(mapApiCoursePath('path')).toBeNull();
    expect(mapApiCoursePath({ modules: [] })).toBeNull();
  });

  it('curso concluído: nextActivity nulo é preservado', () => {
    const path = mapApiCoursePath({ ...rawPath, nextActivity: null });
    expect(path?.nextActivity).toBeNull();
  });
});

describe('moduleStatusLabel', () => {
  it('rótulos únicos por estado do módulo', () => {
    expect(moduleStatusLabel('completed')).toBe('Concluído');
    expect(moduleStatusLabel('tested-out')).toBe('Concluído via test-out');
    expect(moduleStatusLabel('in-progress')).toBe('Em andamento');
    expect(moduleStatusLabel('not-started')).toBe('Não iniciado');
    expect(moduleStatusLabel('qualquer-outro')).toBe('Não iniciado');
  });
});
