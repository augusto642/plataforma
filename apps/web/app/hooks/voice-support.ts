/**
 * Voz no simulador de entrevista — Web Speech API do navegador.
 *
 * Decisão (verificada no código): NÃO existe nenhum provedor de STT/TTS
 * integrado ao repo — o `LlmClient` (apps/api/src/ai/llm-client.ts) é
 * só texto (Gemini / OpenAI-compatível / Ollama) e nenhum módulo usa
 * SpeechRecognition, speechSynthesis, Whisper ou similar. Por isso a
 * voz usa a Web Speech API nativa do navegador: sem novo provedor pago,
 * sem segredo novo, sem chamada de rede extra.
 *
 * A transcrição alimenta o MESMO caminho de avaliação do texto digitado:
 * ela só preenche o textarea da resposta; o envio continua passando por
 * `answerInterview` → `AnswerInterviewDto` (máx. 8.000 caracteres) →
 * `buildTurnPrompt` com prompt-guard M11 → quota fail-closed M17.
 * Nenhum caminho paralelo, nenhuma mudança no backend.
 *
 * Compatibilidade: SpeechRecognition é Chromium (Chrome/Edge); Firefox e
 * Safari têm suporte parcial ou ausente — por isso tudo aqui é feature
 * detection (`typeof window` + presença do construtor), nunca sniffing
 * de user-agent. speechSynthesis com voz pt-BR: prefere voz pt-BR
 * quando existe, cai para a default quando não.
 *
 * Este módulo é puro/determinístico (sem React) para ser testável no
 * ambiente node do Vitest; os hooks em `useSpeechRecognition.ts` e
 * `useSpeechSynthesis.ts` são a camada fina sobre ele.
 */

// O lib.dom do TypeScript desta versão só declara
// SpeechRecognitionResult/ResultList/Alternative — o construtor, o
// evento e o erro não existem nele. Tipos mínimos estruturais, só com
// o que os hooks usam (compatíveis com a API real do navegador).
export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence: number };
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

// `webkitSpeechRecognition` (Chrome/Edge) não está no lib.dom.
interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

function getWindow(): (Window & WindowWithSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window as Window & WindowWithSpeechRecognition;
}

/** Construtor de reconhecimento de voz, ou null quando indisponível. */
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const w = getWindow();
  if (!w) return null;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  const w = getWindow();
  return w !== null && 'speechSynthesis' in w && 'SpeechSynthesisUtterance' in w;
}

/** Voz da síntese, ou null quando indisponível (o chamador usa a default). */
export function getSpeechSynthesis(): SpeechSynthesis | null {
  const w = getWindow();
  if (!w || !('speechSynthesis' in w)) return null;
  return w.speechSynthesis;
}

export interface VoiceChoice {
  lang: string;
  name: string;
  default: boolean;
}

/**
 * Prefere voz pt-BR exata (`pt-BR`/`pt_BR`); depois qualquer `pt-*`;
 * senão null (o navegador usa a voz default). Nunca escolhe uma voz de
 * outro idioma por conta própria.
 */
export function pickBrazilianPortugueseVoice<T extends VoiceChoice>(
  voices: ReadonlyArray<T>,
): T | null {
  const normalize = (lang: string) => lang.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => normalize(v.lang) === 'pt-br') ??
    voices.find((v) => normalize(v.lang).startsWith('pt-')) ??
    voices.find((v) => normalize(v.lang) === 'pt') ??
    null
  );
}

/**
 * Extrai o texto de um evento `onresult`: finais (prontos para enviar
 * ao campo de resposta) e parciais (só exibição, ainda podem mudar).
 */
export function extractRecognitionText(event: SpeechRecognitionEventLike): {
  finalText: string;
  interimText: string;
} {
  let finalText = '';
  let interimText = '';
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const transcript = result[0]?.transcript ?? '';
    if (!transcript) continue;
    if (result.isFinal) finalText += transcript;
    else interimText += transcript;
  }
  return { finalText: finalText.trim(), interimText: interimText.trim() };
}

/** Máximo do `AnswerInterviewDto.content` — a transcrição nunca o estoura. */
export const INTERVIEW_ANSWER_MAX_LENGTH = 8000;

/** Anexa a transcrição ao texto já digitado, sem colar palavras. */
export function appendTranscript(
  current: string,
  addition: string,
  maxLength: number = INTERVIEW_ANSWER_MAX_LENGTH,
): string {
  const clean = addition.trim();
  if (!clean) return current.slice(0, maxLength);
  const joined = current.trim() ? `${current.trimEnd()} ${clean}` : clean;
  return joined.slice(0, maxLength);
}

/** Erro do reconhecimento em pt-BR, sempre com a saída (digitar). */
export function describeRecognitionError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return (
        'Permissão de microfone negada. Permita o microfone nas configurações ' +
        'do navegador ou digite a resposta — o texto continua funcionando.'
      );
    case 'no-speech':
      return 'Nenhuma fala detectada. Tente falar mais perto do microfone ou digite a resposta.';
    case 'audio-capture':
      return 'Microfone não encontrado ou em uso por outro aplicativo. Digite a resposta — o texto continua funcionando.';
    case 'network':
      return 'O reconhecimento de voz precisa de internet no momento. Digite a resposta — o texto continua funcionando.';
    case 'aborted':
      return 'Gravação interrompida.';
    default:
      return 'Não foi possível usar o microfone agora. Digite a resposta — o texto continua funcionando.';
  }
}
