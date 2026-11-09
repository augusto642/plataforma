'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
// Frente 3 — ícones SVG únicos da landing
import { IconChat } from './icons';
// Sprint 7 (D4) — loops da seção só com função/estado e sob
// prefers-reduced-motion: a preferência do sistema desliga a animação
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion';

interface SocraticPrompt {
  tag: string;
  question: string;
  response: string;
  insight: string;
}

const SOCRATIC_ITEMS: SocraticPrompt[] = [
  {
    tag: 'PRIMEIROS PASSOS',
    question: 'O que é uma variável?',
    response: 'Imagine uma caixa com uma etiqueta. Se você guarda o número 7 numa caixa chamada "pontos", o que acontece com a caixa quando o jogo soma +10 — ela muda, ou nasce outra caixa?',
    insight: 'Conceito: Variáveis & Memória',
  },
  {
    tag: 'LAÇOS DE REPETIÇÃO',
    question: 'Por que meu laço não para nunca?',
    response: 'Boa pergunta para investigar: se o laço repete enquanto uma condição é verdadeira, o que precisa mudar dentro dele a cada volta para um dia ela virar falsa? Seu contador está andando em direção ao fim?',
    insight: 'Taxonomia de Bloom: Condição de Parada',
  },
  {
    tag: 'LÓGICA & ERROS',
    question: 'Deu erro e não sei onde. Por onde começo?',
    response: 'Todo erro conta uma história. Qual é a primeira linha da mensagem? Ela mostra onde o programa parou — o que aquela linha estava tentando fazer com os valores que recebeu?',
    insight: 'Habilidade: Leitura de Erros',
  },
];

export const LumiMascotHero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [lumiEmotion, setLumiEmotion] = useState<'thinking' | 'speaking' | 'insight'>('speaking');
  const prefersReducedMotion = usePrefersReducedMotion();

  const currentItem = SOCRATIC_ITEMS[activeIndex];

  useEffect(() => {
    // Movimento reduzido: sem digitação — a resposta aparece inteira e
    // estática, e nenhum loop da seção é ligado (isTyping fica falso).
    if (prefersReducedMotion) {
      setDisplayedText(currentItem.response);
      setIsTyping(false);
      setLumiEmotion('speaking');
      return;
    }

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
  }, [activeIndex, currentItem.response, prefersReducedMotion]);

  // Sprint 7 — a expressão da tutora agora é ARTE (ilustrações próprias
  // em public/landing/tutora), não mais emoji: os emojis focais da
  // seção foram substituídos. Cada estado do diálogo usa a sua expressão.
  const getEmotionImage = () => {
    switch (lumiEmotion) {
      case 'thinking':
        return { src: '/landing/tutora/tutora-pensativa.webp', alt: 'Tutora de IA refletindo sobre a pergunta' };
      case 'speaking':
        return { src: '/landing/tutora/tutora-principal.webp', alt: 'Tutora de IA explicando com uma pergunta' };
      case 'insight':
        return { src: '/landing/tutora/tutora-comemorando.webp', alt: 'Tutora de IA celebrando a descoberta' };
      default:
        return { src: '/landing/tutora/tutora-principal.webp', alt: 'Tutora de IA' };
    }
  };

  const handleSelectQuestion = (idx: number) => {
    if (idx === activeIndex && isTyping) return;
    setActiveIndex(idx);
  };

  return (
    <section className="relative my-20 max-w-5xl mx-auto px-4">
      {/* Sprint 9 — a moldura especular (anel em gradiente roxo→ciano)
          foi aposentada: borda sólida de token + sombra da escala */}
      <div className="relative rounded-[28px] border border-border-2 bg-surface-1 shadow-elev-md">
        <div className="relative rounded-[27px] bg-gradient-to-br from-surface-1/95 via-background/95 to-surface-1/95 p-6 sm:p-9 backdrop-blur-2xl">
          {/* Ambient Top Glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-16 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-7">
            {/* Arte da tutora em ESCALA EDITORIAL — Sprint 9 (item 1 do
                Designer): a ilustração saiu do avatar de 96px e virou
                protagonista da seção, ao lado do diálogo */}
            <div className="relative shrink-0 flex flex-col items-center">
              {/* Sprint 9 (item 5) — o cluster de animação da digitação
                  foi enxutado: aura pulsante + ping + badge pulsante
                  saíram. Durante o isTyping, os únicos elementos
                  animados são o cursor e o equalizador (os dois que
                  comunicam "está falando"); com prefers-reduced-motion,
                  isTyping nunca liga e a seção fica estática */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-gradient-to-tr from-brand-purple via-brand-purple to-brand-cyan-neon p-[2px] shadow-glow-purple">
                <div className="w-full h-full bg-background rounded-[22px] overflow-hidden select-none">
                  <Image
                    src={getEmotionImage().src}
                    alt={getEmotionImage().alt}
                    width={208}
                    height={208}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Badge de Status da tutora — Sprint 7 (honestidade):
                    o rótulo antigo era claim de status ao vivo sem fonte;
                    o badge agora descreve o estado do DIÁLOGO (refletindo /
                    resposta pronta), que é o que ele de fato mostra.
                    Sprint 9: estático também durante a digitação (item 5) */}
                <span className={`absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full text-xs font-mono font-black border border-black shadow ${
                  isTyping
                    ? 'bg-brand-cyan-neon text-black'
                    : 'bg-brand-green-neon text-black'
                }`}>
                  {isTyping ? 'REFLETINDO' : 'PRONTA'}
                </span>
              </div>

              {/* Equalizador de Voz Socrática */}
              <div className="flex items-center gap-1 mt-3.5 h-3">
                <span className={`w-1 bg-brand-cyan-neon rounded-full transition-all duration-150 ${isTyping ? 'h-3 animate-bounce' : 'h-1.5 opacity-40'}`} />
                <span className={`w-1 bg-brand-purple rounded-full transition-all duration-150 delay-75 ${isTyping ? 'h-4 animate-bounce' : 'h-2 opacity-40'}`} />
                <span className={`w-1 bg-brand-green-neon rounded-full transition-all duration-150 delay-150 ${isTyping ? 'h-2.5 animate-bounce' : 'h-1.5 opacity-40'}`} />
                <span className={`w-1 bg-brand-cyan-neon rounded-full transition-all duration-150 delay-100 ${isTyping ? 'h-3.5 animate-bounce' : 'h-2 opacity-40'}`} />
              </div>

              <span className="mt-1 text-xs font-mono font-black text-brand-purple-light">TUTORA DE IA</span>
              <span className="text-body-sm font-mono text-ink-span">Mentora Socrática</span>
            </div>

            {/* Diálogo Socrático & Balão Retrô de Luxo */}
            <div className="flex-1 w-full text-left">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-heading font-black text-ink-heading text-base sm:text-lg tracking-tight">
                    Mentoria Socrática em Tempo Real
                  </span>
                  <span className="text-xs font-mono text-brand-purple-light bg-brand-purple-low px-2.5 py-0.5 rounded-full border border-brand-purple/30">
                    Zero Resposta Pronta • 100% Reflexão
                  </span>
                </div>
                <span className="text-xs font-mono text-brand-cyan-neon font-semibold">{currentItem.insight}</span>
              </div>

              {/* Caixa de Texto com Acabamento de Luxo */}
              <div className="relative min-h-[96px] p-5 rounded-2xl bg-background/90 border border-border-1 text-ink-body text-sm sm:text-base font-sans leading-relaxed shadow-inner">
                <p className="text-ink-heading font-medium">
                  {displayedText}
                  {/* Cursor de digitação: só existe ENQUANTO digita (função/estado) —
                      Sprint 7 (D4): antes ele pulsava para sempre, mesmo com o texto pronto */}
                  {isTyping && (
                    <span className="inline-block w-2 h-4 ml-1 bg-brand-cyan-neon animate-pulse align-middle" />
                  )}
                </p>
              </div>

              {/* Pílulas Interativas de Perguntas */}
              <div className="mt-4 pt-3 border-t border-border-1">
                <span className="text-xs font-mono text-ink-span block mb-2 font-medium">
                  Clique para testar o método socrático:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {SOCRATIC_ITEMS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuestion(idx)}
                      className={`text-body-sm font-mono px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        activeIndex === idx
                          ? 'border-brand-cyan-neon bg-brand-cyan/15 text-brand-cyan-neon shadow-glow-cyan font-bold scale-[1.02]'
                          : 'border-border-1 bg-surface-1 text-ink-span hover:text-ink-heading hover:border-border-2'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2"><IconChat className="w-4 h-4" /> {item.question}</span>
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

