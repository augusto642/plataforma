import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { IdeEditorPane } from '../IdeEditorPane';

// Central 219 lote 4 (D14) — a sessão de entrevista já tem a sua
// própria chrome bar ("debounce.js • Live Coding com IA" + "Testar
// implementação"); a barra interna do editor duplicava o chrome.
// Com `hideChromeBar`, o editor renderiza só o Monaco (skeleton no
// SSR) — sem "solution.js" e sem "Executar Código". Sem a prop, a
// barra interna segue presente (IDE e /desafios não mudam).
async function renderHtml(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new PassThrough();
    sink.on('data', (chunk) => {
      html += chunk.toString();
    });
    sink.on('end', () => resolve(html.replace(/<!--[\s\S]*?-->/g, '')));
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

const baseProps = {
  language: 'javascript',
  code: 'function debounce(fn, delay) {}',
  onChange: () => {},
  onRun: () => {},
  isSubmitting: false,
};

describe('IdeEditorPane — hideChromeBar (D14)', () => {
  it('sem a prop, a chrome bar interna está presente', async () => {
    const html = await renderHtml(React.createElement(IdeEditorPane, baseProps));
    expect(html).toContain('solution.js');
    expect(html).toContain('Executar Código');
  });

  it('com hideChromeBar, sem chrome bar interna (só o editor)', async () => {
    const html = await renderHtml(
      React.createElement(IdeEditorPane, { ...baseProps, hideChromeBar: true }),
    );
    expect(html).not.toContain('solution.js');
    expect(html).not.toContain('Executar Código');
    expect(html).not.toContain('Formatar Código');
    // O editor em si segue renderizado (skeleton no SSR).
    expect(html).toContain('Inicializando Monaco Editor Engine...');
  });
});
