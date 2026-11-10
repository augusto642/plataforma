import { afterEach, describe, expect, it } from 'vitest';
import {
  appendTranscript,
  describeRecognitionError,
  extractRecognitionText,
  getSpeechRecognitionConstructor,
  getSpeechSynthesis,
  INTERVIEW_ANSWER_MAX_LENGTH,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  pickBrazilianPortugueseVoice,
  type SpeechRecognitionEventLike,
  type VoiceChoice,
} from '../voice-support';

// Voz no simulador de entrevista (Web Speech API) — lógica pura e
// detecção de suporte, testável no ambiente node do Vitest com
// `window` mockado via globalThis.
describe('voice-support — detecção de suporte', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  it('sem window, nada é suportado', () => {
    expect(isSpeechRecognitionSupported()).toBe(false);
    expect(isSpeechSynthesisSupported()).toBe(false);
    expect(getSpeechRecognitionConstructor()).toBeNull();
    expect(getSpeechSynthesis()).toBeNull();
  });

  it('SpeechRecognition nativo é detectado', () => {
    class FakeRecognition {}
    (globalThis as Record<string, unknown>).window = {
      SpeechRecognition: FakeRecognition,
    };
    expect(isSpeechRecognitionSupported()).toBe(true);
    expect(getSpeechRecognitionConstructor()).toBe(FakeRecognition);
  });

  it('webkitSpeechRecognition (Chrome/Edge) é detectado como fallback', () => {
    class FakeWebkitRecognition {}
    (globalThis as Record<string, unknown>).window = {
      webkitSpeechRecognition: FakeWebkitRecognition,
    };
    expect(isSpeechRecognitionSupported()).toBe(true);
    expect(getSpeechRecognitionConstructor()).toBe(FakeWebkitRecognition);
  });

  it('SpeechRecognition tem precedência sobre webkit', () => {
    class Native {}
    class Webkit {}
    (globalThis as Record<string, unknown>).window = {
      SpeechRecognition: Native,
      webkitSpeechRecognition: Webkit,
    };
    expect(getSpeechRecognitionConstructor()).toBe(Native);
  });

  it('speechSynthesis é detectado só com síntese + construtor de utterance', () => {
    const synth = { getVoices: () => [] };
    (globalThis as Record<string, unknown>).window = { speechSynthesis: synth };
    expect(isSpeechSynthesisSupported()).toBe(false);
    (globalThis as Record<string, unknown>).window = {
      speechSynthesis: synth,
      SpeechSynthesisUtterance: class {},
    };
    expect(isSpeechSynthesisSupported()).toBe(true);
    expect(getSpeechSynthesis()).toBe(synth);
  });
});

describe('pickBrazilianPortugueseVoice — preferência pt-BR', () => {
  const voices: VoiceChoice[] = [
    { lang: 'en-US', name: 'Google US English', default: true },
    { lang: 'pt-PT', name: 'Google português', default: false },
    { lang: 'pt-BR', name: 'Google português do Brasil', default: false },
    { lang: 'es-ES', name: 'Google español', default: false },
  ];

  it('prefere pt-BR exato', () => {
    expect(pickBrazilianPortugueseVoice(voices)?.name).toBe('Google português do Brasil');
  });

  it('sem pt-BR, aceita outro pt (pt-PT)', () => {
    const noBr = voices.filter((v) => v.lang !== 'pt-BR');
    expect(pickBrazilianPortugueseVoice(noBr)?.lang).toBe('pt-PT');
  });

  it('aceita pt-BR escrito com underscore', () => {
    expect(
      pickBrazilianPortugueseVoice([{ lang: 'pt_BR', name: 'PT-BR', default: false }])?.name,
    ).toBe('PT-BR');
  });

  it('sem nenhuma voz pt, retorna null (o navegador usa a default)', () => {
    expect(pickBrazilianPortugueseVoice(voices.slice(0, 1))).toBeNull();
    expect(pickBrazilianPortugueseVoice([])).toBeNull();
  });
});

describe('extractRecognitionText — finais x parciais', () => {
  function event(results: Array<{ isFinal: boolean; transcript: string }>): SpeechRecognitionEventLike {
    return {
      resultIndex: 0,
      results: results.map((r) => ({
        isFinal: r.isFinal,
        length: 1,
        0: { transcript: r.transcript, confidence: 0.9 },
      })),
    };
  }

  it('separa final de parcial', () => {
    const { finalText, interimText } = extractRecognitionText(
      event([
        { isFinal: true, transcript: 'dois números ' },
        { isFinal: false, transcript: 'que somam' },
      ]),
    );
    expect(finalText).toBe('dois números');
    expect(interimText).toBe('que somam');
  });

  it('respeita resultIndex (não reprocessa resultados antigos)', () => {
    const ev = event([
      { isFinal: true, transcript: 'antigo' },
      { isFinal: true, transcript: 'novo' },
    ]);
    ev.resultIndex = 1;
    expect(extractRecognitionText(ev).finalText).toBe('novo');
  });

  it('resultado sem alternativa não quebra', () => {
    const ev: SpeechRecognitionEventLike = {
      resultIndex: 0,
      results: [{ isFinal: true, length: 0 }],
    };
    expect(extractRecognitionText(ev)).toEqual({ finalText: '', interimText: '' });
  });
});

describe('appendTranscript — transcrição alimenta o campo de resposta', () => {
  it('campo vazio recebe a transcrição', () => {
    expect(appendTranscript('', 'dois números')).toBe('dois números');
  });

  it('anexa com espaço, sem colar palavras', () => {
    expect(appendTranscript('a resposta é', 'quarenta e dois')).toBe(
      'a resposta é quarenta e dois',
    );
  });

  it('transcrição vazia não muda o texto digitado', () => {
    expect(appendTranscript('já digitado', '   ')).toBe('já digitado');
  });

  it('nunca estoura o teto do AnswerInterviewDto (8.000)', () => {
    const long = 'x'.repeat(INTERVIEW_ANSWER_MAX_LENGTH);
    expect(appendTranscript(long, 'mais texto').length).toBe(INTERVIEW_ANSWER_MAX_LENGTH);
    expect(INTERVIEW_ANSWER_MAX_LENGTH).toBe(8000);
  });
});

describe('describeRecognitionError — mensagens honestas em pt-BR', () => {
  it('microfone negado explica e aponta o texto', () => {
    const msg = describeRecognitionError('not-allowed');
    expect(msg).toContain('Permissão de microfone negada');
    expect(msg).toContain('digite a resposta');
  });

  it('sem fala detectada sugere falar perto ou digitar', () => {
    expect(describeRecognitionError('no-speech')).toContain('Nenhuma fala detectada');
  });

  it('erro desconhecido não trava: aponta o texto', () => {
    expect(describeRecognitionError('qualquer-coisa')).toContain('Digite a resposta');
  });
});
