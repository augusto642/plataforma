'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  describeRecognitionError,
  extractRecognitionText,
  getSpeechRecognitionConstructor,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from './voice-support';

export interface UseSpeechRecognitionOptions {
  /** Idioma do reconhecimento. Default `pt-BR`. */
  lang?: string;
  /** Chamado com cada trecho FINAL transcrito (o usuário revisa antes de enviar). */
  onFinalTranscript: (text: string) => void;
  onError?: (message: string) => void;
}

export interface UseSpeechRecognitionApi {
  /** Detectado em efeito (SSR/hidratação seguros: começa false). */
  supported: boolean;
  listening: boolean;
  /** Trecho parcial sendo ouvido — só exibição, ainda pode mudar. */
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Entrada por voz (Web Speech API — SpeechRecognition).
 * Só transcreve para o campo de resposta; nada é enviado sozinho e
 * nada muda no fluxo de avaliação (mesmo DTO, mesmo prompt-guard M11,
 * mesma quota M17). Sem suporte ou sem permissão, o hook reporta e o
 * fluxo só-texto continua 100% funcional.
 */
export function useSpeechRecognition({
  lang = 'pt-BR',
  onFinalTranscript,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionApi {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Callbacks em ref: o `onresult` criado no start() sempre vê a versão atual.
  const callbacksRef = useRef({ onFinalTranscript, onError });
  callbacksRef.current = { onFinalTranscript, onError };

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimTranscript('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError(
        'Reconhecimento de voz não suportado neste navegador. ' +
          'Digite a resposta — o texto continua funcionando.',
      );
      return;
    }
    recognitionRef.current?.abort();
    setError(null);
    setInterimTranscript('');
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const { finalText, interimText } = extractRecognitionText(event);
      setInterimTranscript(interimText);
      if (finalText) callbacksRef.current.onFinalTranscript(finalText);
    };
    recognition.onerror = (event) => {
      const message = describeRecognitionError(event.error);
      setError(message);
      callbacksRef.current.onError?.(message);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setInterimTranscript('');
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError('Não foi possível iniciar o microfone. Verifique a permissão do navegador.');
      recognitionRef.current = null;
      setListening(false);
    }
  }, [lang]);

  // Desmontou no meio da gravação: para o reconhecimento.
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  return { supported, listening, interimTranscript, error, start, stop };
}
