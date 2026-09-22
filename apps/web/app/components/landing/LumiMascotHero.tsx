'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface SocraticPrompt {
  tag: string;
  question: string;
  response: string;
  insight: string;
}

const SOCRATIC_ITEMS: SocraticPrompt[] = [
  {
    tag: 'CONCORRÊNCIA & DEADLOCK',
    question: 'Como conserto um Deadlock em concorrência?',
    response: '✨ Observe quem está retendo o lock! Se duas threads disputam recursos em ordens opostas, que tal definir uma ordem global de aquisição ou utilizar um `defer mutex.Unlock()` garantido?',
    insight: 'Taxonomia de Bloom: Análise de Causa Raiz',
  },
  {
    tag: 'RECURSÃO & PILHA',
    question: 'Meu código estourou a pilha (Stack Overflow). E agora?',
    response: '✨ Toda jornada recursiva precisa de um ponto de repouso. Onde está o seu caso base (condição de parada) e você tem certeza de que seus parâmetros caminham em direção a ele a cada chamada?',
    insight: 'Taxonomia de Bloom: Modelo Mental de Pilha',
  },
  {
    tag: 'MEMORY SAFETY',
    question: 'O compilador Rust barrou meu ponteiro mutável!',
    response: '✨ O Borrow Checker está te protegendo de uma corrida de dados! Se você já tem uma referência mutável exclusiva, por que outra parte do código precisaria ler o mesmo endereço ao mesmo tempo?',
    insight: 'Taxonomia de Bloom: Propriedade e Exclusividade',
  },
];

export const LumiMascotHero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [lumiEmotion, setLumiEmotion] = useState<'thinking' | 'speaking' | 'insight'>('speaking');

  const currentItem = SOCRATIC_ITEMS[activeIndex];
  const audioRef = useRef<AudioSynthesizer | null>(null);

  useEffect(() => {
    audioRef.current = AudioSynthesizer.getInstance();
  }, []);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    setLumiEmotion('thinking');

    let charIndex = 0;
    const fullText = currentItem.response;

    // Alterna para speaking após breve reflexão inicial
    const emotionTimeout = setTimeout(() => {
      setLumiEmotion('speaking');
    }, 220);

    const interval = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex + 1));
        
        // Emite chirp sonoro sutil a cada 10 caracteres
        if (charIndex % 10 === 0 && audioRef.current) {
          audioRef.current.playLumiChirp();
        }

        charIndex++;
      } else {
        setIsTyping(false);
        setLumiEmotion('insight');
        clearInterval(interval);
      }
    }, 18);

    return () => {
      clearTimeout(emotionTimeout);
      clearInterval(interval);
    };
  }, [activeIndex, currentItem.response]);

  // Ícone da expressão baseado no estado de reflexão
  const getEmotionIcon = () => {
    switch (lumiEmotion) {
      case 'thinking':
        return '🧐';
      case 'speaking':
        return '🦊';
      case 'insight':
        return '💡';
      default:
        return '🦊';
    }
  };

  const handleSelectQuestion = (idx: number) => {
    if (idx === activeIndex && isTyping) return;
    if (audioRef.current) {
      void audioRef.current.resume();
      audioRef.current.playTone({
        frequency: 620,
        pitchBendTo: 780,
        duration: 0.05,
        type: 'sine',
        volume: 0.2,
      });
    }
    setActiveIndex(idx);
  };

  return (
    <section className="relative my-20 max-w-5xl mx-auto px-4">
      {/* Moldura com 1px Specular Border */}
      <div className="relative rounded-[28px] p-[1px] bg-gradient-to-r from-purple-500/30 via-cyan-500/20 to-purple-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="relative rounded-[27px] bg-gradient-to-br from-[#0C1024]/95 via-[#060815]/95 to-[#120E26]/95 p-6 sm:p-9 backdrop-blur-2xl">
          {/* Ambient Top Glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-16 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-7">
            {/* Avatar Pixel Art Lumi com Aura Mística & Expressões */}
            <div className="relative shrink-0 flex flex-col items-center">
              {/* Aura Radiante Expansiva quando Lumi está Raciocinando/Digitando */}
              {isTyping && (
                <>
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-purple-500/40 via-cyan-500/30 to-emerald-500/40 blur-xl animate-pulse -z-10" />
                  <div className="absolute -inset-1.5 rounded-2xl border border-cyan-400/50 animate-ping opacity-40 pointer-events-none -z-10" />
                </>
              )}

              <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#8257E5] via-[#A855F7] to-[#00E5FF] p-[2px] shadow-[0_0_35px_rgba(130,87,229,0.35)] transition-all duration-300 ${
                isTyping ? 'scale-105 shadow-[0_0_45px_rgba(0,229,255,0.45)]' : 'hover:scale-102'
              }`}>
                <div className="w-full h-full bg-[#050814] rounded-[14px] flex items-center justify-center text-4xl select-none transition-transform">
                  <span className={isTyping ? 'animate-pulse' : ''}>{getEmotionIcon()}</span>
                </div>

                {/* Badge de Status de Lumi */}
                <span className={`absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-black border border-black shadow transition-all ${
                  isTyping
                    ? 'bg-[#00E5FF] text-black animate-pulse'
                    : 'bg-[#04D361] text-black'
                }`}>
                  {isTyping ? 'REFLETINDO' : 'IA ONLINE'}
                </span>
              </div>

              {/* Equalizador de Voz Socrática */}
              <div className="flex items-center gap-1 mt-3.5 h-3">
                <span className={`w-1 bg-[#00E5FF] rounded-full transition-all duration-150 ${isTyping ? 'h-3 animate-bounce' : 'h-1.5 opacity-40'}`} />
                <span className={`w-1 bg-[#A855F7] rounded-full transition-all duration-150 delay-75 ${isTyping ? 'h-4 animate-bounce' : 'h-2 opacity-40'}`} />
                <span className={`w-1 bg-[#04D361] rounded-full transition-all duration-150 delay-150 ${isTyping ? 'h-2.5 animate-bounce' : 'h-1.5 opacity-40'}`} />
                <span className={`w-1 bg-[#00E5FF] rounded-full transition-all duration-150 delay-100 ${isTyping ? 'h-3.5 animate-bounce' : 'h-2 opacity-40'}`} />
              </div>

              <span className="mt-1 text-xs font-mono font-black text-purple-300">LUMI v2.4</span>
              <span className="text-[10px] font-mono text-zinc-500">Mentora Socrática</span>
            </div>

            {/* Diálogo Socrático & Balão Retrô de Luxo */}
            <div className="flex-1 w-full text-left">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-heading font-black text-white text-base sm:text-lg tracking-tight">
                    Mentoria Socrática em Tempo Real
                  </span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    Zero Resposta Pronta • 100% Reflexão
                  </span>
                </div>
                <span className="text-xs font-mono text-[#00E5FF] font-semibold">{currentItem.insight}</span>
              </div>

              {/* Caixa de Texto com Acabamento de Luxo */}
              <div className="relative min-h-[96px] p-5 rounded-2xl bg-[#030612]/90 border border-white/[0.08] text-zinc-200 text-sm sm:text-base font-sans leading-relaxed shadow-inner">
                <p className="text-zinc-100 font-medium">
                  {displayedText}
                  <span className="inline-block w-2 h-4 ml-1 bg-[#00E5FF] animate-pulse align-middle" />
                </p>
              </div>

              {/* Pílulas Interativas de Perguntas */}
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <span className="text-xs font-mono text-zinc-400 block mb-2 font-medium">
                  Clique para testar o método socrático:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {SOCRATIC_ITEMS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuestion(idx)}
                      className={`text-xs font-mono px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        activeIndex === idx
                          ? 'border-[#00E5FF] bg-cyan-950/60 text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.25)] font-bold scale-[1.02]'
                          : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      💬 {item.question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

