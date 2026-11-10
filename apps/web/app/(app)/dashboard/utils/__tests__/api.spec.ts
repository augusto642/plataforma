import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardData } from '../api';

// Retrabalho Central 213 (D5) — quando a API não responde, o
// dashboard não pode exibir dados inventados: fetchDashboardData
// devolve null e a página mostra erro honesto. O caminho feliz (API
// respondendo) continua devolvendo os dados reais mesclados.
describe('fetchDashboardData (D5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubFetch(handler: (url: string) => unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => handler(url)),
    );
  }

  function okResponse(body: unknown) {
    return { ok: true, status: 200, json: async () => body };
  }

  it('API fora do ar (fetch rejeita tudo) → null, nunca o molde fictício', async () => {
    stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    const data = await fetchDashboardData();
    expect(data).toBeNull();
  });

  it('API responde 500 em tudo → null', async () => {
    stubFetch(() => ({ ok: false, status: 500, json: async () => ({}) }));
    const data = await fetchDashboardData();
    expect(data).toBeNull();
  });

  it('só /courses responde (sem identidade) → null, nunca o molde fictício', async () => {
    stubFetch((url: string) => {
      if (url.includes('/users/me')) return { ok: false, status: 401, json: async () => ({}) };
      if (url.includes('/courses')) return okResponse([{ id: 'c1', activities: [] }]);
      return { ok: false, status: 500, json: async () => ({}) };
    });
    const data = await fetchDashboardData();
    expect(data).toBeNull();
  });

  it('API respondendo → dados reais do usuário, sem o nome fictício', async () => {
    stubFetch((url: string) => {
      if (url.includes('/users/me/progress')) return okResponse({ xp: 120, level: 2, streakDays: 3 });
      if (url.includes('/users/me')) {
        return okResponse({ name: 'Maria Teste', email: 'maria@teste.local', xp: 120, level: 2, streakDays: 3 });
      }
      if (url.includes('/courses')) return okResponse([]);
      if (url.includes('/submissions')) return okResponse([]);
      return okResponse({});
    });
    const data = await fetchDashboardData();
    expect(data).not.toBeNull();
    expect(data!.user.name).toBe('Maria Teste');
    expect(data!.user.name).not.toBe('Augusto Silva');
    expect(data!.user.xp).toBe(120);
  });

  // Retrabalho 2 Central 213 (D5-P) — FALHA PARCIAL: o retrabalho 1
  // só devolvia null na falha total. Com /users/me, /progress e
  // /courses em 200 e /leaderboard + /submissions em 500, o painel
  // exibia leaderboard, missão, heatmap, meta e dica do MOLDE — e
  // rotulava "Augusto Silva (Você)" com outra pessoa logada. Agora
  // qualquer endpoint central falhando → null (erro honesto na página).
  describe('falha parcial (D5-P)', () => {
    // Reprodução exata do QA (rodada 2): Maria Teste logada, 120 XP,
    // 1 curso, /leaderboard e /submissions em 500.
    function stubQaRepro(overrides: Record<string, unknown> = {}) {
      stubFetch((url: string) => {
        if (url.includes('/users/me/progress'))
          return overrides.progress ?? okResponse({ xp: 120, level: 2, streakDays: 3 });
        if (url.includes('/users/me'))
          return (
            overrides.me ??
            okResponse({ id: 'user-maria', name: 'Maria Teste', email: 'maria@teste.local', xp: 120, level: 2, streakDays: 3 })
          );
        // '/courses/c1/leaderboard' contém '/courses': checar antes.
        if (url.includes('/leaderboard')) return overrides.leaderboard ?? { ok: false, status: 500, json: async () => ({}) };
        if (url.includes('/courses'))
          return overrides.courses ?? okResponse([{ id: 'c1', activities: [] }]);
        if (url.includes('/submissions')) return overrides.submissions ?? { ok: false, status: 500, json: async () => ({}) };
        return okResponse({});
      });
    }

    it('repro do QA: /leaderboard e /submissions em 500, resto 200 → null (zero dado fictício)', async () => {
      stubQaRepro();
      const data = await fetchDashboardData();
      expect(data).toBeNull();
    });

    it('só /leaderboard em 500 → null', async () => {
      stubQaRepro({ leaderboard: { ok: false, status: 500, json: async () => ({}) }, submissions: okResponse([{}, {}]) });
      expect(await fetchDashboardData()).toBeNull();
    });

    it('só /submissions em 500 → null', async () => {
      stubQaRepro({
        leaderboard: okResponse([
          { userId: 'user-b', name: 'Bruno Fernandes', xp: 5420, completedActivitiesCount: 22 },
        ]),
        submissions: { ok: false, status: 500, json: async () => ({}) },
      });
      expect(await fetchDashboardData()).toBeNull();
    });

    it('só /users/me/progress em 500 → null (missão seria do molde)', async () => {
      stubQaRepro({
        progress: { ok: false, status: 500, json: async () => ({}) },
        leaderboard: okResponse([]),
        submissions: okResponse([]),
      });
      expect(await fetchDashboardData()).toBeNull();
    });

    it('só /courses em 500 → null', async () => {
      stubQaRepro({
        courses: { ok: false, status: 500, json: async () => ({}) },
        leaderboard: okResponse([]),
        submissions: okResponse([]),
      });
      expect(await fetchDashboardData()).toBeNull();
    });

    it('caminho feliz com ranking real: "(Você)" só na linha da identidade real de /users/me', async () => {
      stubQaRepro({
        leaderboard: okResponse([
          { userId: 'user-bruno', name: 'Bruno Fernandes', xp: 5420, completedActivitiesCount: 22 },
          { userId: 'user-maria', name: 'Maria Teste', xp: 120, completedActivitiesCount: 3 },
          { userId: 'user-camila', name: 'Camila Pereira', xp: 4310, completedActivitiesCount: 16 },
        ]),
        submissions: okResponse([{}, {}]),
      });
      const data = await fetchDashboardData();
      expect(data).not.toBeNull();
      expect(data!.leaderboard.map((e) => e.name)).toEqual([
        'Bruno Fernandes',
        'Maria Teste',
        'Camila Pereira',
      ]);
      expect(data!.leaderboard.map((e) => e.isCurrentUser)).toEqual([false, true, false]);
      expect(data!.leaderboard.some((e) => e.name.includes('(Você)'))).toBe(false);
      expect(data!.heatmap.totalSubmissions).toBe(2);
    });

    it('ranking real sem a usuária logada → nenhuma linha marcada como atual', async () => {
      stubQaRepro({
        leaderboard: okResponse([
          { userId: 'user-bruno', name: 'Bruno Fernandes', xp: 5420, completedActivitiesCount: 22 },
          { userId: 'user-camila', name: 'Camila Pereira', xp: 4310, completedActivitiesCount: 16 },
        ]),
        submissions: okResponse([{}]),
      });
      const data = await fetchDashboardData();
      expect(data).not.toBeNull();
      expect(data!.leaderboard.every((e) => e.isCurrentUser === false)).toBe(true);
    });

    it('ranking vazio e zero submissões → [] e 0, nunca o molde', async () => {
      stubQaRepro({ leaderboard: okResponse([]), submissions: okResponse([]) });
      const data = await fetchDashboardData();
      expect(data).not.toBeNull();
      expect(data!.leaderboard).toEqual([]);
      expect(data!.heatmap.totalSubmissions).toBe(0);
    });

    it('sem cursos → ranking [] em vez do molde com 3 pessoas inventadas', async () => {
      stubQaRepro({ courses: okResponse([]), leaderboard: okResponse([]), submissions: okResponse([]) });
      const data = await fetchDashboardData();
      expect(data).not.toBeNull();
      expect(data!.leaderboard).toEqual([]);
    });
  });
});
