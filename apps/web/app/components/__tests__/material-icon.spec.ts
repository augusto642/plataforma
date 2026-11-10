import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MaterialIcon } from '../MaterialIcon';

// Central 216 — o ícone Material Symbols auto-hospedado: o glifo é
// o texto do span (a fonte o transforma em ícone) e a classe vem de
// globals.css.
describe('MaterialIcon', () => {
  it('renderiza o nome do glifo dentro do span', () => {
    const html = renderToString(React.createElement(MaterialIcon, { name: 'terminal' }));
    expect(html).toContain('material-symbols-outlined');
    expect(html).toContain('terminal');
    expect(html).toContain('aria-hidden="true"');
  });

  it('filled aplica a variação FILL 1', () => {
    const html = renderToString(
      React.createElement(MaterialIcon, { name: 'check_circle', filled: true }),
    );
    expect(html).toContain('check_circle');
    expect(html).toContain('FILL');
  });
});
