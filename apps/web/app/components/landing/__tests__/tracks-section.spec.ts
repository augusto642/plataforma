import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { TracksSection } from '../TracksSection';

// Central 218 (D1) — a TracksSection voltou a ser só os 3 cards
// estruturados do protótipo Stitch v2 (home-desktop.html §3):
// Iniciante (100% Grátis) / Júnior / Pleno, com "O que você
// aprende". O catálogo/radar "Comece hoje. O resto está no radar."
// saiu da home — o catálogo real segue em /courses. A seção é um
// Server Component síncrono: sem fetch de catálogo aqui.

async function renderTracks(): Promise<string> {
  const element = TracksSection() as unknown as React.ReactElement;
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
// (<!-- -->) e marca fronteiras de Suspense (<!--$-->): sem removê-los,
// asserções de frases que cruzam expressões JSX quebram por formatação,
// não por conteúdo.
function stripReactComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('TracksSection — trilhas estruturadas do protótipo (D1)', () => {
  it('os 3 níveis do protótipo com textos literais e "O que você aprende"', async () => {
    const html = await renderTracks();
    expect(html).toContain('Trilhas estruturadas para cada momento');
    expect(html).toContain('Iniciante');
    expect(html).toContain('Júnior');
    expect(html).toContain('Pleno');
    expect(html).toContain('100% Grátis');
    expect(html).toContain('Plano Pro');
    expect(html).toContain('Fundamentos de lógica de programação');
    expect(html).toContain('JavaScript moderno, TypeScript e manipulação do DOM');
    expect(html).toContain('Clean Architecture, SOLID e Design Patterns');
    expect(html).toContain('O que você aprende:');
    expect(html).toContain('Mais procurada');
  });

  it('CTAs: Iniciante ao cadastro; Júnior/Pleno à seção de planos', async () => {
    const html = await renderTracks();
    expect(html).toContain('href="/register"');
    expect(html).toContain('Começar trilha grátis');
    expect(html).toContain('Desbloquear trilha Júnior');
    expect(html).toContain('Explorar trilha Pleno');
    expect(html).toContain('href="#planos"');
    expect(html).not.toContain('href="#precos"');
  });

  it('Q-8: selo sem quebra de linha (whitespace-nowrap)', async () => {
    const html = await renderTracks();
    expect(html).toContain('Todas com projetos práticos inclusos');
    expect(html).toContain('whitespace-nowrap');
  });

  it('sem catálogo nem radar na home', async () => {
    const html = await renderTracks();
    expect(html).not.toContain('Comece hoje. O resto está no radar.');
    expect(html).not.toContain('NO RADAR');
    expect(html).not.toContain('Disponível agora');
    expect(html).not.toContain('waitlist-email');
  });
});
