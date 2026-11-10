'use client';

/**
 * BlackCatHudWidget.tsx
 * NEXUS CODE - Mascote Gato Preto no HUD (v2.0)
 * 
 * Companheiro felino pixel art em tempo real no canto da interface:
 * - 5 estados de animação: 'idle' | 'paws_clean' | 'sleeping' | 'alert' | 'celebrate'
 * - Síntese procedural de miados e ronrom via AudioSynthesizer (Web Audio API)
 * - Balão de diálogo retrô com efeito typewriter e dicas socráticas de programação
 * - Interações táteis: clique para acariciar (purr), botão "Pedir conselho ao Gato"
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';

export type CatAnimationState = 'idle' | 'paws_clean' | 'sleeping' | 'alert' | 'celebrate';

const SOCRATIC_TIPS = [
  'Miau! Indentação consistente é o feitiço que mantém o Pythox equilibrado. Você revisou seus blocos de código?',
  'Purrr... Variáveis são como caixinhas de papelão: cada uma guarda um valor e tem uma etiqueta única.',
  'Miau! Se o loop parece infinito, qual é a condição de parada que deve se tornar falsa?',
  'Fsssh! Lembre-se: em tipagem estrita, você não pode misturar água com óleo — ou strings com números sem conversão!',
  'Miau! Que tal quebrar esse problema em pequenos passos antes de executar o código todo?',
  'Purrr... O melhor programador não é o que nunca erra, mas o que inspeciona o log de testes com paciência felina.',
];

export const BlackCatHudWidget: React.FC = () => {
  const [animState, setAnimState] = useState<CatAnimationState>('idle');
  const [speechText, setSpeechText] = useState<string>('');
  const [displayedSpeech, setDisplayedSpeech] = useState<string>('');
  const [isSpeechOpen, setIsSpeechOpen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [petCount, setPetCount] = useState<number>(0);
  const [showHeart, setShowHeart] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const inactTimerRef = useRef<NodeJS.Timeout | null>(null);

  const player = useGameStore((s) => s.player);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const gameMode = useGameStore((s) => s.gameMode);
  const catMood = useGameStore((s) => s.catMood);
  const catMessage = useGameStore((s) => s.catMessage);
  const setCatMessage = useGameStore((s) => s.setCatMessage);

  const audio = AudioSynthesizer.getInstance();

  // Sincroniza estado de humor externo do store se alterado
  useEffect(() => {
    if (catMood) {
      setAnimState(catMood);
    }
  }, [catMood]);

  // Sincroniza mensagem externa vinda de batalha ou lição
  useEffect(() => {
    if (catMessage) {
      setSpeechText(catMessage);
      setIsSpeechOpen(true);
    }
  }, [catMessage]);

  // Alerta em batalha
  useEffect(() => {
    if (gameMode === 'battle') {
      setAnimState('alert');
      setSpeechText(`Cuidado, ${player.name}! Uma anomalia de código está na arena! Prepare o ataque do ${selectedStarter.name}!`);
      setIsSpeechOpen(true);
      void audio.playCatMeow('alert');
    } else if (animState === 'alert') {
      setAnimState('idle');
    }
  }, [gameMode, player.name, selectedStarter.name]);

  // Timer de Inatividade (entra em 'sleeping' após 45 segundos sem interação)
  const resetInactivity = useCallback(() => {
    if (animState === 'sleeping') {
      setAnimState('idle');
    }
    if (inactTimerRef.current) {
      clearTimeout(inactTimerRef.current);
    }
    inactTimerRef.current = setTimeout(() => {
      setAnimState('sleeping');
    }, 45000);
  }, [animState]);

  useEffect(() => {
    const handleActivity = () => resetInactivity();
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    resetInactivity();

    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      if (inactTimerRef.current) clearTimeout(inactTimerRef.current);
    };
  }, [resetInactivity]);

  // Efeito Typewriter no Balão de Fala
  useEffect(() => {
    if (!speechText || !isSpeechOpen) {
      setDisplayedSpeech('');
      setIsTyping(false);
      return;
    }

    setDisplayedSpeech('');
    setIsTyping(true);
    let index = 0;

    const interval = setInterval(() => {
      if (index < speechText.length) {
        setDisplayedSpeech(speechText.slice(0, index + 1));
        if (index % 4 === 0) {
          void audio.playLumiChirp();
        }
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [speechText, isSpeechOpen]);

  // Ciclo de Animação do Gato Preto via Canvas 2D
  useEffect(() => {
    let count = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const renderLoop = () => {
      count++;
      animFrameRef.current = count;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pSize = 4; // Escala do pixel art (4x4 por pixel virtual)
      const tick = Math.floor(count / 15);

      // Sombra embaixo do gato
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath();
      ctx.ellipse(36, 60, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Desenho de acordo com o estado de animação
      if (animState === 'sleeping') {
        // Gato Encolhido Dormindo
        ctx.fillStyle = '#0F1320';
        ctx.fillRect(16, 36, 40, 22);
        // Orelhas deitadas
        ctx.fillStyle = '#1A2138';
        ctx.fillRect(14, 34, 8, 8);
        ctx.fillRect(48, 34, 8, 8);
        // Nariz e bigodes
        ctx.fillStyle = '#FFA116';
        ctx.fillRect(34, 44, 4, 3);
        // Olhos fechados (risquinho escuro)
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(26, 42, 6, 2);
        ctx.fillRect(40, 42, 6, 2);
        // Cauda enrolada
        ctx.fillStyle = '#090C16';
        ctx.fillRect(52, 44, 12, 6);

        // Bolhas de Zzz flutuantes
        const zOffset = (count % 60) / 2;
        ctx.fillStyle = '#00E5FF';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('z', 48, 30 - zOffset);
        ctx.fillText('Z', 54, 22 - zOffset);
      } else {
        // Corpo Base do Gato Preto
        const bounce = animState === 'celebrate' ? Math.sin(count * 0.3) * 6 : (tick % 2 === 0 ? 0 : 2);
        const yBase = 24 - bounce;

        // Corpo
        ctx.fillStyle = '#0B0F1D';
        ctx.fillRect(20, yBase + 12, 32, 24);

        // Patas
        ctx.fillStyle = '#182035';
        ctx.fillRect(22, yBase + 34, 8, 6);
        ctx.fillRect(42, yBase + 34, 8, 6);

        // Cabeça
        ctx.fillStyle = '#0D1324';
        ctx.fillRect(20, yBase, 32, 20);

        // Orelhas pontudas
        ctx.fillStyle = '#182035';
        ctx.fillRect(18, yBase - 8, 8, 10);
        ctx.fillRect(46, yBase - 8, 8, 10);
        ctx.fillStyle = '#FFA116'; // Interior rosa/âmbar da orelha
        ctx.fillRect(20, yBase - 6, 4, 6);
        ctx.fillRect(48, yBase - 6, 4, 6);

        // Olhos Amarelos Neon Feline (Piscam a cada ~70 frames)
        const isBlinking = animState !== 'alert' && (tick % 18 === 0 || tick % 19 === 0);
        if (isBlinking) {
          ctx.fillStyle = '#03050B';
          ctx.fillRect(26, yBase + 6, 6, 2);
          ctx.fillRect(40, yBase + 6, 6, 2);
        } else {
          ctx.fillStyle = '#FFA116'; // Amarelo místico
          ctx.fillRect(24, yBase + 4, 8, 6);
          ctx.fillRect(40, yBase + 4, 8, 6);
          // Pupilas verticais pretas
          ctx.fillStyle = '#000000';
          ctx.fillRect(27, yBase + 4, 3, 6);
          ctx.fillRect(43, yBase + 4, 3, 6);
          // Brilho nos olhos
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(25, yBase + 4, 2, 2);
          ctx.fillRect(41, yBase + 4, 2, 2);
        }

        // Focinho e bigodes
        ctx.fillStyle = '#FF84B7';
        ctx.fillRect(34, yBase + 11, 4, 3);
        ctx.fillStyle = '#64748B';
        // Bigodes esquerda
        ctx.fillRect(14, yBase + 11, 8, 1);
        ctx.fillRect(14, yBase + 14, 8, 1);
        // Bigodes direita
        ctx.fillRect(50, yBase + 11, 8, 1);
        ctx.fillRect(50, yBase + 14, 8, 1);

        // Cauda Animada (Sway lateral)
        const tailOffset = Math.sin(count * 0.15) * 4;
        ctx.fillStyle = '#080C17';
        ctx.fillRect(52 + tailOffset, yBase + 18, 6, 16);
        ctx.fillRect(56 + tailOffset * 1.2, yBase + 12, 6, 8);

        // Patinha lambendo no estado 'paws_clean'
        if (animState === 'paws_clean') {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(28, yBase + 8, 6, 6);
        }
      }

      requestAnimationFrame(renderLoop);
    };

    const animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [animState]);

  // Clique no gato: carinho + ronrom
  const handlePetCat = () => {
    resetInactivity();
    setPetCount((prev) => prev + 1);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 900);

    const moods: CatAnimationState[] = ['celebrate', 'paws_clean', 'idle'];
    const nextMood = moods[Math.floor(Math.random() * moods.length)];
    setAnimState(nextMood);

    if (petCount % 2 === 0) {
      void audio.playCatPurr();
      setSpeechText('Purrrr... Ron-ron! Seu carinho recarrega a mana do código!');
    } else {
      void audio.playCatMeow('happy');
      setSpeechText('Miau! Obrigado pelo carinho, Operador! Vamos continuar explorando!');
    }
    setIsSpeechOpen(true);
  };

  // Pedir dica socrática
  const handleAskSocraticAdvice = () => {
    resetInactivity();
    void audio.playCatMeow('curious');
    const randomTip = SOCRATIC_TIPS[Math.floor(Math.random() * SOCRATIC_TIPS.length)];
    setSpeechText(randomTip);
    setIsSpeechOpen(true);
    setAnimState('paws_clean');
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Balão de Diálogo Reativo Retro 16-bit */}
      {isSpeechOpen && (
        <div className="mb-2 max-w-xs sm:max-w-sm rounded-2xl border-2 border-[#00E5FF]/60 bg-[#070D1E]/95 p-4 shadow-[0_0_25px_rgba(0,229,255,0.25)] backdrop-blur-md pointer-events-auto animate-fadeIn relative">
          {/* Header do Balão */}
          <div className="flex items-center justify-between border-b border-cyan-950 pb-1.5 mb-2 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-[#00E5FF] font-bold">
              <span>🐈‍⬛</span>
              <span>MASCOTE // GATO PRETO SOCRÁTICO</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSpeechOpen(false);
                setCatMessage(null);
              }}
              className="text-slate-400 hover:text-white px-1 font-bold"
            >
              ✕
            </button>
          </div>

          {/* Texto com Typewriter */}
          <p className="font-mono text-xs text-slate-200 leading-relaxed min-h-[38px]">
            {displayedSpeech}
            {isTyping && <span className="animate-ping text-[#00E5FF] font-black">▍</span>}
          </p>

          {/* Triângulo indicador do balão */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#070D1E] border-r-2 border-b-2 border-[#00E5FF]/60 rotate-45" />
        </div>
      )}

      {/* Widget Interativo com Canvas Pixel Art */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Botão Dica Socrática */}
        <button
          type="button"
          onClick={handleAskSocraticAdvice}
          className="rounded-xl border border-amber-500/40 bg-[#0B1224]/90 px-3 py-2 text-[11px] font-mono font-bold text-amber-300 hover:border-amber-400 hover:bg-amber-950/40 shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5"
          title="Pedir conselho socrático ao Gato Preto"
        >
          <span>🐾</span>
          <span className="hidden sm:inline">Pedir Conselho</span>
        </button>

        {/* Container do Mascote */}
        <div
          onClick={handlePetCat}
          className="relative group cursor-pointer rounded-2xl border-2 border-cyan-900/60 bg-[#070D1E]/90 p-2 shadow-2xl hover:border-[#00E5FF] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all active:scale-95"
          title="Clique para fazer carinho no Gato Preto!"
        >
          {/* Coração flutuante no carinho */}
          {showHeart && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg animate-bounce select-none">
              💖
            </span>
          )}

          {/* Canvas do Gato Preto */}
          <canvas
            ref={canvasRef}
            width={72}
            height={72}
            className="w-16 h-16 sm:w-18 sm:h-18"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Badge de Status / Humor */}
          <div className="absolute -bottom-1 -right-1 rounded-full bg-cyan-950 px-1.5 py-0.2 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 font-bold">
            {animState === 'sleeping'
              ? 'ZZZ'
              : animState === 'alert'
              ? 'ALERTA'
              : animState === 'celebrate'
              ? 'YAY!'
              : 'IDLE'}
          </div>
        </div>
      </div>
    </div>
  );
};
