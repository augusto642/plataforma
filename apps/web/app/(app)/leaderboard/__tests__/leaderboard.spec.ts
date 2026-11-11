import { describe, expect, it } from 'vitest';
import { bandForXp } from '../data';
import type { LeaderboardApiEntry } from '../types';
import {
  chooseInitialCourseId,
  initialsForName,
  mapLeaderboardEntries,
} from '../utils';

const apiEntries: LeaderboardApiEntry[] = [
  {
    rank: 1,
    userId: 'student-1',
    name: 'Maria Silva',
    xp: 3600,
    level: 8,
    streakDays: 12,
    badges: [{ id: 'badge-1', badgeCode: 'starter', title: 'Primeiro passo', icon: '⭐' }],
    completedActivitiesCount: 14,
  },
  {
    rank: 2,
    userId: 'student-2',
    name: 'João Pereira',
    xp: 2100,
    level: 5,
    streakDays: 4,
    badges: [],
    completedActivitiesCount: 7,
  },
];

describe('leaderboard — mapeamento da API real', () => {
  it('marca "Você" somente no userId autenticado presente na resposta', () => {
    const rows = mapLeaderboardEntries(apiEntries, 'student-2');

    expect(rows).toHaveLength(2);
    expect(rows[0].isCurrentUser).toBe(false);
    expect(rows[1].isCurrentUser).toBe(true);
    expect(rows[1]).toMatchObject({
      id: 'student-2',
      rank: 2,
      xp: 2100,
      completedActivitiesCount: 7,
    });
  });

  it('não cria um usuário atual quando ele não está no ranking', () => {
    const rows = mapLeaderboardEntries(apiEntries, 'another-user');
    expect(rows.every((row) => !row.isCurrentUser)).toBe(true);
  });

  it('deriva iniciais do nome retornado pela API', () => {
    expect(initialsForName('Maria Silva')).toBe('MS');
    expect(initialsForName('João')).toBe('J');
  });

  it('prioriza curso matriculado ao escolher o curso inicial', () => {
    const courses = [
      { id: 'course-a', title: 'Curso A' },
      { id: 'course-b', title: 'Curso B' },
    ];

    expect(chooseInitialCourseId(courses, ['course-b'])).toBe('course-b');
    expect(chooseInitialCourseId(courses, [])).toBe('course-a');
    expect(chooseInitialCourseId([], ['course-b'])).toBe('');
  });
});

describe('leaderboard — faixas de XP', () => {
  it('usa os limites reais de exibição do bandForXp', () => {
    expect(bandForXp(0).band).toBe('bronze');
    expect(bandForXp(1500).band).toBe('silver');
    expect(bandForXp(3500).band).toBe('gold');
    expect(bandForXp(20000).band).toBe('challenger');
  });
});
