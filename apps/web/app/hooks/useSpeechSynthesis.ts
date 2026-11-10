'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSpeechSynthesis,
  isSpeechSynthesisSupported,
  pickBrazilianPortugueseVoice,
} from './voice-support';

export interface UseSpeechSynthesisApi {
  /** Detectado em efeito (SSR/hidratação seguros: começa false). */
  supported: boolean;
  speaking: boolean;
  /** Todas as vozes do navegador (carregam de forma assíncrona). */
  voices: SpeechSynthesisVoice[];
  /** Voz pt-BR preferida quando existe; null = default do navegador. */
  preferredVoice: SpeechSynthesisVoice | null;
  /** Nome da voz escolhida pelo usuário; null = automática (pt-BR quando houver). */
  selectedVoiceName: string | null;
  selectVoice: (name: string | null) => void;
  speak: (text: string) => void;
  stop: () => void;
}

/**
 * Saída por voz (Web Speech API — speechSynthesis): lê a pergunta e o
 * feedback da entrevistadora. Sem suporte, reporta e nada trava — a
 * pergunta continua legível na tela. A voz pt-BR é preferida quando
 * existe; sem ela, usa a default do navegador.
 */
export function useSpeechSynthesis(): UseSpeechSynthesisApi {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return;
    setSupported(true);
    const synth = getSpeechSynthesis();
    if (!synth) return;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    // Chrome carrega as vozes de forma assíncrona e dispara este evento.
    synth.addEventListener('voiceschanged', loadVoices);
    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
      synth.cancel();
    };
  }, []);

  const preferredVoice = useMemo(
    () => pickBrazilianPortugueseVoice(voices),
    [voices],
  );

  const effectiveVoice = useMemo(() => {
    if (selectedVoiceName) {
      return voices.find((v) => v.name === selectedVoiceName) ?? null;
    }
    return preferredVoice;
  }, [selectedVoiceName, voices, preferredVoice]);

  const stop = useCallback(() => {
    getSpeechSynthesis()?.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const synth = getSpeechSynthesis();
      if (!synth || !text.trim()) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      const voice = effectiveVoice;
      if (voice) utterance.voice = voice;
      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeaking(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setSpeaking(false);
      };
      utteranceRef.current = utterance;
      setSpeaking(true);
      synth.speak(utterance);
    },
    [effectiveVoice],
  );

  const selectVoice = useCallback((name: string | null) => {
    setSelectedVoiceName(name);
  }, []);

  return {
    supported,
    speaking,
    voices,
    preferredVoice,
    selectedVoiceName,
    selectVoice,
    speak,
    stop,
  };
}
