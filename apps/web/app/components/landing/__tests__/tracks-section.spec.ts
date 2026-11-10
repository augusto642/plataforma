import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TracksSection } from '../TracksSection';
import { fetchPublicCatalog, type CatalogCourse } from '../../../lib/catalog';

// B76/B74 (Sprint 18 · Volta 3) — a TracksSection é um async server
// component: o teste a resolve com await (o elemento devolvido é
// renderizável) e o catálogo é mockado nas três pontas — sucesso
// (merchandising real vindo da API), vazio real e falha (fallback
// honesto). Os títulos mockados são DELIBERADAMENTE diferentes dos
// do seed: se a vitrine voltasse a um espelho hardcoded, este teste
// quebra.
vi.mock('../../../lib/catalog', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/catalog')>();
  return { ...original, fetchPublicCatalog: vi.fn() };
});

const fetchCatalogMock = vi.mocked(fetchPublicCatalog);

async function renderTracks(): Promise<string> {
  const element = await TracksSection();
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new PassThrough();
    sink.on('data', (chunk) => {
      html += chunk.toString();
    });
    sink.on('end', () => resolve(stripReactComments(html)));
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(sink);
      },
      onShellError(err) {
        reject(err);
      },
    });
  });
}

const MOCK_CATALOG: CatalogCourse[] = [
  {
    slug: 'curso-mock-javascript',
    title: 'Curso Mockado de JavaScript',
    description: 'Descrição vinda da API, não do código.',
    activityCount: 3,
    activities: [
      { title: '1. Soma de Dois Números', language: 'javascript' },
      { title: '2. Verificador de Palíndromo', language: 'javascript' },
      { title: '3. Encontrar o Maior Número', language: 'javascript' },
    ],
  },
  {
    slug: 'curso-mock-python',
    title: 'Curso Mockado de Python',
    description: 'Outra descrição da API.',
    activityCount: 2,
    activities: [
      { title: '1. Dobro de um Número', language: 'python' },
      { title: '2. Contagem de Vogais', language: 'python' },
    ],
  },
];

// O SSR do React separa nós de texto dinâmicos com comentários
// (<!-- -->) e marca fronteiras de Suspense (<!--$-->): sem removê-los,
// asserções de frases que cruzam expressões JSX quebram por formatação,
// não por conteúdo.
function stripReactComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('TracksSection — vitrine via catálogo real (B74/B76)', () => {
  beforeEach(() => {
    fetchCatalogMock.mockReset();
    fetchCatalogMock.mockResolvedValue(MOCK_CATALOG);
  });

  it('merchandising real: título, descrição, contagem e ementa vêm da API', async () => {
    const html = await renderTracks();
    expect(html).toContain('Curso Mockado de JavaScript');
    expect(html).toContain('Descrição vinda da API, não do código.');
    expect(html).toContain('3 atividades práticas');
    expect(html).toContain('2 atividades práticas');
    expect(html).toContain('Você vai praticar:');
    expect(html).toContain('1. Soma de Dois Números');
    expect(html).toContain('2. Contagem de Vogais');
  });

  it('CTA de cada curso aponta para a página do curso', async () => {
    const html = await renderTracks();
    expect(html).toContain('href="/courses/curso-mock-javascript"');
    expect(html).toContain('href="/courses/curso-mock-python"');
    expect(html).toContain('Ver o curso e começar');
    expect(html).toContain('DISPONÍVEL');
  });

  it('o radar segue rotulado e com as listas por trilha', async () => {
    const html = await renderTracks();
    expect(html).toContain('Programação do Zero com Rust');
    expect(html.split('NO RADAR').length - 1).toBeGreaterThanOrEqual(4);
    expect(html).toContain('id="waitlist-email-rust"');
    expect(html).toContain('No radar — trilhas em estudo, sem datas');
  });

  it('sem API: fallback honesto — aviso + caminho, nunca o espelho hardcoded', async () => {
    fetchCatalogMock.mockResolvedValue(null);
    const html = await renderTracks();
    expect(html).toContain('Não foi possível carregar o catálogo de cursos agora');
    expect(html).toContain('Ver os cursos');
    expect(html).not.toContain('Algoritmos e Estruturas em JavaScript');
    expect(html).not.toContain('Curso Mockado');
  });

  it('catálogo vazio real: estado vazio declarado, sem curso inventado', async () => {
    fetchCatalogMock.mockResolvedValue([]);
    const html = await renderTracks();
    expect(html).toContain('Nenhum curso aberto neste momento');
    expect(html).not.toContain('Ver o curso e começar');
  });
});
