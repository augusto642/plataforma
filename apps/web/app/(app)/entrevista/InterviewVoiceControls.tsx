'use client';

import React from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';

export interface InterviewVoiceControlsProps {
  /** Última fala da entrevistadora (pergunta + feedback) — null sem pergunta ainda. */
  questionText: string | null;
  /** Trecho final transcrito — o chamador anexa ao campo de resposta. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/**
 * Voz no simulador de entrevista (Web Speech API, sem provedor pago):
 * - microfone: transcreve a fala do candidato para o campo de resposta;
 *   ele revisa/edita antes de enviar — nada é enviado sozinho.
 * - ouvir pergunta: lê a última fala da entrevistadora (pergunta +
 *   feedback), com play/stop e escolha de voz (pt-BR preferida).
 * Sem suporte ou sem permissão, mostra o motivo e o fluxo só-texto
 * continua 100% funcional — nada aqui trava a simulação.
 */
export function InterviewVoiceControls({
  questionText,
  onTranscript,
  disabled = false,
}: InterviewVoiceControlsProps) {
  const recognition = useSpeechRecognition({ onFinalTranscript: onTranscript });
  const synthesis = useSpeechSynthesis();

  // Seletor de voz: vozes pt-* quando houver; senão, todas as vozes.
  const portugueseVoices = synthesis.voices.filter((v) =>
    v.lang.replace('_', '-').toLowerCase().startsWith('pt'),
  );
  const voiceOptions = portugueseVoices.length > 0 ? portugueseVoices : synthesis.voices;
  const selectedValue =
    synthesis.selectedVoiceName ?? synthesis.preferredVoice?.name ?? '';

  return (
    <div aria-label="Controles de voz" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={recognition.listening ? recognition.stop : recognition.start}
          disabled={!recognition.supported || disabled}
          aria-pressed={recognition.listening}
          className="border border-[#2A2A33] hover:border-[#8257E5] disabled:opacity-50 text-sm font-bold rounded-lg px-4 py-2"
        >
          {recognition.listening ? '⏹ Parar gravação' : '🎙️ Responder por voz'}
        </button>

        {synthesis.supported && questionText ? (
          <button
            type="button"
            onClick={synthesis.speaking ? synthesis.stop : () => synthesis.speak(questionText)}
            disabled={disabled}
            aria-pressed={synthesis.speaking}
            className="border border-[#2A2A33] hover:border-[#8257E5] disabled:opacity-50 text-sm font-bold rounded-lg px-4 py-2"
          >
            {synthesis.speaking ? '⏹ Parar leitura' : '🔊 Ouvir pergunta'}
          </button>
        ) : null}

        {synthesis.supported && voiceOptions.length > 0 ? (
          <label className="text-sm text-zinc-400">
            Voz
            <select
              value={selectedValue}
              onChange={(e) => synthesis.selectVoice(e.target.value || null)}
              disabled={disabled}
              className="ml-2 bg-[#121218] border border-[#2A2A33] rounded-lg px-2 py-2 text-sm text-[#EDEDED]"
            >
              <option value="">Automática (português brasileiro quando disponível)</option>
              {voiceOptions.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {recognition.listening && (
        <p className="text-sm text-zinc-400" role="status">
          Ouvindo… {recognition.interimTranscript || 'fale sua resposta.'}
        </p>
      )}

      {recognition.error && (
        <p className="text-sm text-amber-300 border border-amber-900 rounded-lg px-3 py-2">
          {recognition.error}
        </p>
      )}

      {!recognition.supported && (
        <p className="text-xs text-zinc-500">
          Reconhecimento de voz não disponível neste navegador (funciona no Chrome e no
          Edge). Você pode digitar a resposta normalmente.
        </p>
      )}

      {!synthesis.supported && (
        <p className="text-xs text-zinc-500">
          Leitura em voz alta não disponível neste navegador. A pergunta continua legível
          na tela.
        </p>
      )}
    </div>
  );
}
