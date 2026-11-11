import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformStatsSection } from '../PlatformStatsSection';
import { fetchPublicStats, type PublicStats } from '../../../lib/stats';

// B78/B77 (Sprint 19 · destravamento B3) — a faixa de números reais
// é um async server component: o teste a resolve com await e o
// fetch é mockado nas três pontas — sucesso, zero real e falha.
// A invariante travada é "número exibido = número da fonte": as
// contagens mockadas são DELIBERADAMENTE diferentes de qualquer
// valor do seed ou da página — se um espelho hardcoded voltar para
// a seção, estes testes quebram.
vi.mock('../../../lib/stats', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/stats')>();
  return { ...original, fetchPublicStats: vi.fn() };
});

const fetchStatsMock = vi.mocked(fetchPublicStats);

async function renderStats(): Promise<string> {
  const element = await PlatformStatsSection();
  if (!element) return '';
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

// O SSR do React separa nós de texto dinâmicos com comentários
// (<!-- -->): sem removê-los, asserções de frases que cruzam
// expressões JSX quebram por formatação, não por conteúdo.
function stripReactComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

const MOCK_STATS: PublicStats = {
  publishedCourses: 2,
  publishedActivities: 5,
  registeredStudents: 42,
  planInterestTotal: 7,
};

describe('PlatformStatsSection — números reais com fonte viva (B78/B77)', () => {
  beforeEach(() => {
    fetchStatsMock.mockReset();
    fetchStatsMock.mockResolvedValue(MOCK_STATS);
  });

  it('exibe exatamente as contagens da API, com os rótulos da fonte', async () => {
    const html = await renderStats();
    expect(html).toContain('>2</dd>');
    expect(html).toContain('cursos publicados');
    expect(html).toContain('>5</dd>');
    expect(html).toContain('atividades práticas publicadas');
    expect(html).toContain('>42</dd>');
    expect(html).toContain('alunos cadastrados');
    expect(html).toContain('>7</dd>');
    expect(html).toContain('interessados nos planos pagos');
    expect(html).toContain('Contagem dos registros reais da plataforma');
  });

  it('singular só para 1, em cada um dos quatro contadores', async () => {
    fetchStatsMock.mockResolvedValue({
      publishedCourses: 1,
      publishedActivities: 1,
      registeredStudents: 1,
      planInterestTotal: 1,
    });
    const html = await renderStats();
    expect(html).toContain('curso publicado');
    expect(html).toContain('atividade prática publicada');
    expect(html).toContain('aluno cadastrado');
    expect(html).toContain('interessado nos planos pagos');
    expect(html).not.toContain('cursos publicados');
    expect(html).not.toContain('alunos cadastrados');
  });

  it('zero real é exibido como zero (não some, não estima)', async () => {
    fetchStatsMock.mockResolvedValue({
      publishedCourses: 0,
      publishedActivities: 0,
      registeredStudents: 0,
      planInterestTotal: 0,
    });
    const html = await renderStats();
    expect(html.split('>0</dd>').length - 1).toBe(4);
    expect(html).toContain('cursos publicados');
  });

  it('sem API: a seção não renderiza — nenhum número aparece', async () => {
    fetchStatsMock.mockResolvedValue(null);
    await expect(PlatformStatsSection()).resolves.toBeNull();
    const html = await renderStats();
    expect(html).toBe('');
    expect(html).not.toContain('alunos cadastrados');
  });
});
