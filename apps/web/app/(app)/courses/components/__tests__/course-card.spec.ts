import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CourseCard } from '../CourseCard';

// Central 216 (F2/F4) — o card do catálogo renderiza de verdade: capa
// local, "Acessar curso" para a rota real e nenhum link externo.
describe('CourseCard — visual Stitch v2', () => {
  it('linka para /courses/[slug] com a capa local da linguagem', () => {
    const html = renderToString(
      React.createElement(CourseCard, {
        course: {
          slug: 'javascript-moderno',
          title: 'JavaScript Moderno, ES6+ e DOM',
          description: 'Manipulação de DOM, Promises, async/await.',
          activityCount: 12,
          activities: [{ title: 'DOM', language: 'javascript' }],
        },
      }),
    );
    expect(html).toContain('href="/courses/javascript-moderno"');
    expect(html).toContain('Acessar curso');
    expect(html).toContain('/cursos/javascript.svg');
    expect(html).toContain('JavaScript');
    expect(html).toContain('No browser');
    expect(html).not.toContain('lh3');
    expect(html).not.toContain('Ver Ementa');
  });

  it('sem capa para a linguagem, não inventa imagem', () => {
    const html = renderToString(
      React.createElement(CourseCard, {
        course: {
          slug: 'rust-na-pratica',
          title: 'Rust na Prática',
          description: 'Ownership e borrow checker.',
          activityCount: 9,
          activities: [{ title: 'Ownership', language: 'rust' }],
        },
      }),
    );
    expect(html).toContain('href="/courses/rust-na-pratica"');
    expect(html).not.toContain('/cursos/');
  });
});
