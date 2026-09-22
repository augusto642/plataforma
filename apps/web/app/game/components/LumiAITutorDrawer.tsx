'use client';

/**
 * LumiAITutorDrawer.tsx
 * NEXUS CODE - Socratic AI Mascot & Quota Controller (PR #04)
 * 
 * Tutor com IA Socrática e cota diária de 5 prompts:
 * - Mascote Lumi animado com feedback visual de emoção
 * - Barra de bateria de 5 cargas diárias com persistência no Zustand
 * - Respostas socráticas (Taxonomia de Bloom: nunca dá a resposta direta, orienta por perguntas)
 * - Integração contextual com o desafio ativo e o companion starter
 */

import React, { useState } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';
import { apiFetch } from '../../lib/apiClient';

interface ChatMessage {
  id: string;
  sender: 'lumi' | 'player';
  text: string;
  timestamp: string;
}

export const LumiAITutorDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const player = useGameStore((s) => s.player);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const currentBattle = useGameStore((s) => s.currentBattle);
  const lumiQuota = useGameStore((s) => s.lumiQuota);
  const consumeLumiPrompt = useGameStore((s) => s.useLumiPrompt);
  const rechargeLumiQuota = useGameStore((s) => s.rechargeLumiQuota);

  const audio = AudioSynthesizer.getInstance();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'lumi',
      text: `Olá, ${player.name}! Eu sou a Lumi ✨, sua mentora socrática no NEXUS. Quando encontrar uma falha em seu código ou precisar entender um algoritmo, me consulte! Você possui ${lumiQuota.remaining}/${lumiQuota.maxDaily} perguntas hoje.`,
      timestamp: 'Agora',
    },
  ]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating) return;

    if (lumiQuota.remaining <= 0) {
      void audio.playTone({ frequency: 220, duration: 0.15, type: 'sawtooth' });
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'lumi',
          text: '⚡ Suas 5 consultas diárias gratuitas de IA esgotaram por hoje! Para proteger seus neurônios e incentivar a autonomia, revise a documentação técnica ou descanse até a meia-noite.',
          timestamp: 'Agora',
        },
      ]);
      return;
    }

    const success = consumeLumiPrompt();
    if (!success) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'player',
      text,
      timestamp: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsGenerating(true);
    void audio.playTone({ frequency: 750, duration: 0.05, type: 'sine' });

    void (async () => {
      let socraticAnswer = '';

      // Tenta obter orientação socrática do backend NestJS com cache Redis
      try {
        const res = await apiFetch('/ai/socratic-hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: text,
            starterName: selectedStarter.name,
            challengeId: currentBattle?.enemy.id || 'exploration',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && (data.hint || data.socraticQuestion)) {
            socraticAnswer = `${data.hint} ${data.socraticQuestion}`;
          }
        }
      } catch {
        // Fallback offline transparente
      }

      // Fallback socrático local resiliente se a API estiver indisponível
      if (!socraticAnswer) {
        if (text.toLowerCase().includes('erro') || text.toLowerCase().includes('bug')) {
          socraticAnswer = `Interessante! Bugs são apenas hipóteses não testadas. Se você inspecionar o valor exato que sua função está retornando antes do 'return', qual é a diferença entre o tipo esperado e o tipo que você calculou?`;
        } else if (text.toLowerCase().includes('imposto') || text.toLowerCase().includes('tax')) {
          socraticAnswer = `Lembre-se da ordem de operações matemáticas: somar o preço com (preço * taxa) gera o total. Como o método .toFixed(2) transforma o número em string, qual função do JavaScript você pode usar para convertê-lo de volta em número?`;
        } else if (text.toLowerCase().includes('complexidade') || text.toLowerCase().includes('tempo')) {
          socraticAnswer = `Boa pergunta de arquitetura! Se dividirmos o array ao meio a cada passo em vez de olhar item por item, quantas operações precisamos fazer para um array de tamanho N? Lembra da função matemática logarítmica O(log n)?`;
        } else {
          socraticAnswer = `Para resolver este desafio com o ${selectedStarter.name}, dê um passo atrás: qual é o caso base da sua função quando a entrada for um valor nulo ou vazio? Tente formular o que cada linha deve garantir antes de avançar!`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'lumi',
          text: socraticAnswer,
          timestamp: 'Agora',
        },
      ]);
      setIsGenerating(false);
      void audio.playTone({ frequency: 880, duration: 0.08, type: 'triangle' });
    })();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Botão Flutuante do Mascote Lumi */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            void audio.playTone({ frequency: 840, duration: 0.08, type: 'sine' });
          }}
          className="group flex items-center space-x-3 rounded-2xl border-2 border-[#00E5FF] bg-[#071328]/95 px-4 py-3 shadow-2xl shadow-cyan-950/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF] text-xl">
            ✨
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div className="text-left font-mono">
            <div className="text-xs font-black text-white group-hover:text-[#00E5FF] transition">
              LUMI AI TUTOR
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              {lumiQuota.remaining}/{lumiQuota.maxDaily} CONSULTAS
            </div>
          </div>
        </button>
      )}

      {/* Drawer / Janela de Chat Aberta */}
      {isOpen && (
        <div className="flex h-[520px] w-96 flex-col rounded-3xl border-2 border-[#00E5FF]/60 bg-[#060D1E]/95 shadow-2xl shadow-cyan-950 backdrop-blur-xl animate-fade-in overflow-hidden">
          {/* Header do Drawer */}
          <div className="flex items-center justify-between border-b border-cyan-950 bg-[#0A162C] px-5 py-3.5">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF] text-lg">
                ✨
              </div>
              <div>
                <h3 className="font-mono text-sm font-black text-white">
                  LUMI // SOCRATIC TUTOR
                </h3>
                {/* Bateria de Cotas */}
                <div className="flex items-center space-x-1 mt-0.5">
                  {Array.from({ length: lumiQuota.maxDaily }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-4 rounded-full transition-all ${
                        idx < lumiQuota.remaining
                          ? 'bg-[#04D361] shadow-sm shadow-emerald-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                  <span className="font-mono text-[9px] text-slate-400 ml-1">
                    {lumiQuota.remaining} restantes
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs leading-relaxed">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'player' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                    m.sender === 'player'
                      ? 'bg-[#00E5FF] text-black font-semibold rounded-br-none'
                      : 'border border-cyan-900/60 bg-[#0B172E] text-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">
                  {m.sender === 'player' ? player.name : 'Lumi'} &bull; {m.timestamp}
                </span>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center space-x-2 text-cyan-400 text-xs italic">
                <span className="animate-spin text-sm">✦</span>
                <span>Lumi está formulando uma pergunta reflexiva...</span>
              </div>
            )}
          </div>

          {/* Sugestões Rápidas de Pergunta */}
          <div className="border-t border-cyan-950 bg-[#040916] px-4 py-2 flex space-x-2 overflow-x-auto">
            {[
              '💡 O que este erro significa?',
              '⏱️ Qual a complexidade de tempo?',
              '🔍 Como testar casos de borda?',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap rounded-lg border border-cyan-900/50 bg-[#071326] px-2.5 py-1 font-mono text-[10px] text-cyan-300 hover:border-cyan-500 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Banner de Recarga de Quota com Bits (PR #07) */}
          {lumiQuota.remaining <= 0 && (
            <div className="border-t border-amber-500/30 bg-amber-950/40 p-2.5 flex items-center justify-between font-mono text-xs">
              <div className="text-amber-300 flex items-center gap-1.5">
                <span>⚡ Cota Esgotada!</span>
                <span className="text-[10px] text-slate-400">({player.bits} Bits)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const success = rechargeLumiQuota(100);
                  if (success) {
                    void audio.playTone({ frequency: 880, duration: 0.15, type: 'triangle' });
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        sender: 'lumi',
                        text: '✨ Carga neural restaurada com 100 Bits! Você recebeu +3 consultas adicionais.',
                        timestamp: 'Agora',
                      },
                    ]);
                  } else {
                    void audio.playTone({ frequency: 200, duration: 0.2, type: 'sawtooth' });
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: String(Date.now()),
                        sender: 'lumi',
                        text: `Saldo insuficiente! Você possui ${player.bits} Bits, mas precisa de 100 Bits. Vença batalhas para acumular Bits!`,
                        timestamp: 'Agora',
                      },
                    ]);
                  }
                }}
                className="rounded-lg border border-amber-400 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400 hover:text-black transition active:scale-95"
              >
                RECARREGAR (+3) // 100 BITS
              </button>
            </div>
          )}

          {/* Formulário de Envio */}
          <div className="border-t border-cyan-950 bg-[#071022] p-3 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={lumiQuota.remaining <= 0 || isGenerating}
              placeholder={
                lumiQuota.remaining > 0
                  ? 'Pergunte para a Lumi (método socrático)...'
                  : 'Cota diária de 5 prompts esgotada!'
              }
              className="flex-1 rounded-xl border border-cyan-900/60 bg-[#030713] px-3.5 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-[#00E5FF] focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || lumiQuota.remaining <= 0 || isGenerating}
              className="rounded-xl border border-[#04D361] bg-[#04D361] px-3.5 py-2 font-mono text-xs font-bold text-black transition hover:bg-emerald-400 active:scale-95 disabled:opacity-40"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
