import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  courseLanguage,
  fetchPublicCatalog,
  languageLabel,
  mapCatalogCourse,
} from '../catalog';

// B74 (Sprint 18 · Volta 3 · TL M1) — a vitrine lê o catálogo real:
// o mapeamento é defensivo (item fora do contrato é descartado, não
// exibido errado) e a falha da API vira null — o sinal para a seção
// mostrar a indisponibilidade, nunca um espelho desatualizado.
describe('catalog — vitrine via catálogo real', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mapeia o curso do contrato e deriva a contagem das atividades sem _count', () => {
    const course = mapCatalogCourse({
      slug: 'introducao-python',
      title: 'Introdução à Programação com Python',
      description: 'Domine a sintaxe limpa do Python.',
      activities: [
        { title: '1. Dobro de um Número', language: 'python' },
        { title: '2. Contagem de Vogais', language: 'python' },
      ],
    });
    expect(course?.activityCount).toBe(2);
    expect(courseLanguage(course!)).toBe('python');
  });

  it('activityCount do servidor prevalece sobre a lista', () => {
    const course = mapCatalogCourse({
      slug: 'x',
      title: 'X',
      activityCount: 9,
      activities: [],
    });
    expect(course?.activityCount).toBe(9);
  });

  it('item fora do contrato é descartado (null), não exibido errado', () => {
    expect(mapCatalogCourse(null)).toBeNull();
    expect(mapCatalogCourse({ title: 'sem slug' })).toBeNull();
    expect(mapCatalogCourse('texto')).toBeNull();
  });

  it('rótulos de linguagem: enum conhecido, fallback capitalizado e vazio', () => {
    expect(languageLabel('javascript')).toBe('JavaScript');
    expect(languageLabel('python')).toBe('Python');
    expect(languageLabel('rust')).toBe('Rust');
    expect(languageLabel(null)).toBe('Programação');
  });

  it('fetchPublicCatalog devolve os cursos mapeados da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            slug: 'algoritmos-javascript',
            title: 'Algoritmos e Estruturas em JavaScript',
            description: 'Fundamentos de lógica.',
            activityCount: 3,
            activities: [{ title: '1. Soma de Dois Números', language: 'javascript' }],
          },
          { item: 'inválido' },
        ],
      }),
    );
    const catalog = await fetchPublicCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog?.[0].slug).toBe('algoritmos-javascript');
    expect(courseLanguage(catalog![0])).toBe('javascript');
  });

  it('fetchPublicCatalog devolve null na falha (fallback honesto da seção)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchPublicCatalog()).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchPublicCatalog()).resolves.toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nao: 'lista' }) }),
    );
    await expect(fetchPublicCatalog()).resolves.toBeNull();
  });
});
