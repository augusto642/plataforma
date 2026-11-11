import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from '../useSpeechRecognition';
import { useSpeechSynthesis } from '../useSpeechSynthesis';

// Padrão dos specs de renderização do repo (landing-render.spec.ts):
// SSR via react-dom/server — efeitos NÃO rodam no servidor, então o
// que se prova aqui é (1) os hooks não quebram sem `window` (SSR) e
// (2) o estado inicial é o fallback seguro (não suportado, parado).
// A detecção em si (com `window` mockado) está em voice-support.spec.ts;
// o comportamento interativo (start/stop/fala) é manual no navegador.
async function renderHtml(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new PassThrough();
    sink.on('data', (chunk) => {
      html += chunk.toString();
    });
    sink.on('end', () => resolve(html.replace(/<!--[\s\S]*?-->/g, '').replace(/&quot;/g, '"')));
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

function RecognitionProbe() {
  const r = useSpeechRecognition({ onFinalTranscript: () => {} });
  return React.createElement(
    'div',
    null,
    JSON.stringify({
      supported: r.supported,
      listening: r.listening,
      interimTranscript: r.interimTranscript,
      error: r.error,
    }),
  );
}

function SynthesisProbe() {
  const s = useSpeechSynthesis();
  return React.createElement(
    'div',
    null,
    JSON.stringify({
      supported: s.supported,
      speaking: s.speaking,
      voices: s.voices,
      preferredVoice: s.preferredVoice,
      selectedVoiceName: s.selectedVoiceName,
    }),
  );
}

describe('useSpeechRecognition — SSR seguro, fallback inicial', () => {
  it('renderiza sem window e começa não suportado / parado / sem erro', async () => {
    const html = await renderHtml(React.createElement(RecognitionProbe));
    expect(html).toContain(
      '{"supported":false,"listening":false,"interimTranscript":"","error":null}',
    );
  });
});

describe('useSpeechSynthesis — SSR seguro, fallback inicial', () => {
  it('renderiza sem window e começa não suportado / parado / sem vozes', async () => {
    const html = await renderHtml(React.createElement(SynthesisProbe));
    expect(html).toContain(
      '{"supported":false,"speaking":false,"voices":[],"preferredVoice":null,"selectedVoiceName":null}',
    );
  });
});

// Sanidade: os módulos dos hooks não tocam `window` no import.
describe('hooks de voz — import sem navegador', () => {
  it('importa os hooks sem window global', async () => {
    expect(typeof window).toBe('undefined');
    const mod = await vi.importActual<typeof import('../useSpeechRecognition')>(
      '../useSpeechRecognition',
    );
    expect(typeof mod.useSpeechRecognition).toBe('function');
  });
});
