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
});
