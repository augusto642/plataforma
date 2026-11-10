import { describe, expect, it } from 'vitest';
import {
  countCreatedToday,
  deriveDailyMissions,
  todayKey,
} from '../daily-missions';

// Central 216 (F3) — "Missões de Hoje" deriva de createdAt REAL
// (submissões e sessões de entrevista); nunca do heatmap/molde.
describe('daily-missions — derivação com dados reais', () => {
  const now = new Date(2026, 10, 10, 15, 0, 0); // 10/11/2026, hora local

  it('todayKey usa a data local, não UTC', () => {
    expect(todayKey(now)).toBe('2026-11-10');
  });

  it('conta só os itens criados hoje (ignora ontem e inválidos)', () => {
    const items = [
      { createdAt: '2026-11-10T10:00:00.000Z' },
      { createdAt: '2026-11-10T23:59:00.000Z' },
      { createdAt: '2026-11-09T10:00:00.000Z' },
      { createdAt: null },
      { createdAt: 'não-é-data' },
    ];
    // 10/11 em UTC é 10/11 no fuso de São Paulo até 21h — os dois
    // primeiros contam; o de 09/11 não.
    expect(countCreatedToday(items, now)).toBe(2);
  });

  it('2 desafios hoje concluem a missão; 1 mantém o streak', () => {
    const missions = deriveDailyMissions({
      submissionsToday: 2,
      interviewDoneToday: false,
      includeInterview: true,
    });
    expect(missions.map((m) => m.id)).toEqual(['challenges', 'streak', 'interview']);
    expect(missions[0].done).toBe(true);
    expect(missions[0].detail).toBe('2/2 hoje');
    expect(missions[1].done).toBe(true);
    expect(missions[2].done).toBe(false);
  });

  it('sem submissão hoje, desafios e streak ficam pendentes', () => {
    const missions = deriveDailyMissions({
      submissionsToday: 0,
      interviewDoneToday: false,
      includeInterview: true,
    });
    expect(missions[0].done).toBe(false);
    expect(missions[0].detail).toBe('0/2 hoje');
    expect(missions[1].done).toBe(false);
  });

  it('sem lista de sessões, a missão de entrevista some (fail-closed)', () => {
    const missions = deriveDailyMissions({
      submissionsToday: 3,
      interviewDoneToday: false,
      includeInterview: false,
    });
    expect(missions.map((m) => m.id)).toEqual(['challenges', 'streak']);
  });
});
