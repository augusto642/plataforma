import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { InterviewVoiceControls } from '../InterviewVoiceControls';

// SSR (padrão landing-render.spec.ts): efeitos não rodam no servidor,
// então o que se prova aqui é o fallback — sem `window`, o componente
// mostra os avisos de indisponibilidade e nenhum botão de voz fica
// habilitado, ou seja, a simulação não trava sem microfone/navegador
// compatível. O caminho com voz é manual no navegador (Chrome/Edge).
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

describe('InterviewVoiceControls — fallback sem navegador com voz', () => {
  it('sem window, mostra os dois avisos e o microfone desabilitado', async () => {
    const html = await renderHtml(
      React.createElement(InterviewVoiceControls, {
        questionText: 'Explique como você resolveria…',
        onTranscript: () => {},
      }),
    );
    expect(html).toContain('Reconhecimento de voz não disponível neste navegador');
    expect(html).toContain('digitar a resposta normalmente');
    expect(html).toContain('Leitura em voz alta não disponível neste navegador');
    expect(html).toContain('Responder por voz');
    // Botão de microfone presente mas desabilitado (fallback, não trava).
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Responder por voz<\/button>/);
  });

  it('sem pergunta, não oferece ouvir pergunta', async () => {
    const html = await renderHtml(
      React.createElement(InterviewVoiceControls, {
        questionText: null,
        onTranscript: () => {},
      }),
    );
    expect(html).not.toContain('Ouvir pergunta');
  });

  it('com pergunta mas sem síntese, também não oferece ouvir pergunta', async () => {
    const html = await renderHtml(
      React.createElement(InterviewVoiceControls, {
        questionText: 'Explique como você resolveria…',
        onTranscript: () => {},
      }),
    );
    expect(html).not.toContain('Ouvir pergunta');
  });
});
