import { describe, expect, it } from 'vitest';
import {
  extractCoursesProgress,
  extractMyStats,
  initialsOf,
  mapApiCourse,
  mapApiCourseDetail,
  mapApiCourses,
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
