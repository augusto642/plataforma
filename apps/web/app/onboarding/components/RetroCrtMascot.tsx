'use client';

/**
 * RetroCrtMascot.tsx
 * NEXUS CODE - Retro CRT PC Mascot Component
 * 
 * Monitor CRT vintage com tela de fósforo âmbar/ciano, scanlines CRT,
 * mascote PC Pixel Art animado (Nexi) com olhos piscantes e efeito de fala typewriter.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface RetroCrtMascotProps {
  onDialogueComplete?: () => void;
  dialogueLines?: string[];
}

const DEFAULT_LINES = [
  'INITIALIZING NEXUS NEURAL LINK v1.0.4...',
  'CONEXÃO ESTABELECIDA COM A REDE SECRETA DE DESENVOLVEDORES.',
  'BEM-VINDO, OPERADOR! EU SOU O NEXI, SEU COMPUTADOR RETRÔ & TUTOR DE SISTEMA.',
  'OS SERVIDORES DO NEXUS VALLEY FORAM CORROMPIDOS POR BUGS E MEMORY LEAKS.',
  'ANTES DE ENTRAR NA ARENA, PRECISAMOS CONFIGURAR SEU AVATAR HACKER E ESCOLHER SEU COMPANHEIRO STARTER!',
];

export const RetroCrtMascot: React.FC<RetroCrtMascotProps> = ({
  onDialogueComplete,
  dialogueLines = DEFAULT_LINES,
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [mascotMood, setMascotMood] = useState<'happy' | 'blink' | 'talking'>('happy');
  const [isBooted, setIsBooted] = useState<boolean>(false);

  const audio = AudioSynthesizer.getInstance();
  const textEndRef = useRef<HTMLDivElement>(null);

  // Efeito de Boot do CRT
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooted(true);
      void audio.playTone({ frequency: 440, duration: 0.1, type: 'square' });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Animação de piscar os olhos do mascote
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTyping) {
        setMascotMood('blink');
        setTimeout(() => setMascotMood('happy'), 220);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [isTyping]);

  // Efeito máquina de escrever (Typewriter)
  useEffect(() => {
    if (!isBooted) return;

    const line = dialogueLines[currentLineIndex];
    if (!line) {
      if (onDialogueComplete) onDialogueComplete();
      return;
    }

    let charIdx = 0;
    setDisplayedText('');
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (charIdx < line.length) {
        setDisplayedText((prev) => prev + line.charAt(charIdx));
        charIdx++;

        // Sons de bipe sutis a cada 2 caracteres
        if (charIdx % 2 === 0) {
          setMascotMood((m) => (m === 'talking' ? 'happy' : 'talking'));
          void audio.playTone({
            frequency: 720 + (charIdx % 4) * 40,
            duration: 0.03,
            type: 'sine',
          });
        }
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setMascotMood('happy');
      }
    }, 28);

    return () => clearInterval(typeInterval);
  }, [currentLineIndex, isBooted]);

  const handleNext = () => {
    if (isTyping) {
      // Pula digitação imediata
      setDisplayedText(dialogueLines[currentLineIndex] || '');
      setIsTyping(false);
      setMascotMood('happy');
    } else {
      if (currentLineIndex < dialogueLines.length - 1) {
        setCurrentLineIndex((i) => i + 1);
        void audio.playTone({ frequency: 880, duration: 0.08, type: 'square' });
      } else {
        if (onDialogueComplete) onDialogueComplete();
      }
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl p-4">
      {/* Moldura Bege Vintage de PC dos Anos 90 */}
      <div className="relative rounded-3xl border-4 border-[#3D3A37] bg-gradient-to-b from-[#2A2724] to-[#1C1A18] p-6 shadow-2xl shadow-cyan-950/40">
        {/* Relevo e Logo Vintage */}
        <div className="mb-3 flex items-center justify-between border-b border-[#443F3B] pb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-600 animate-pulse shadow-sm shadow-red-500" />
            <span className="inline-block h-3 w-3 rounded-full bg-amber-500 shadow-sm shadow-amber-400" />
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400" />
            <span className="ml-2 font-mono text-xs tracking-widest text-[#9A938C]">
              NEXUS-8086 // BIOS REV 1.4
            </span>
          </div>
          <div className="font-mono text-xs font-bold text-[#00E5FF] tracking-wider">
            [ CRT PHOSPHOR DISPLAY ]
          </div>
        </div>

        {/* Chassis do Tubo de Imagem CRT */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-[#080D1A] bg-[#02050D] p-5 shadow-inner">
          {/* Linhas de Varredura Scanlines CRT */}
          <div
            className="pointer-events-none absolute inset-0 z-20 opacity-20"
            style={{
              background:
                'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
              backgroundSize: '100% 4px',
            }}
          />
          {/* Brilho Curvo de Tubo de Vidro */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-cyan-500/5 to-cyan-400/10 rounded-2xl" />

          {/* Conteúdo Interno da Tela */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            {/* Mascote PC Retrô em Pixel Art */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="relative h-32 w-32 rounded-xl border-2 border-[#00E5FF] bg-[#071322] p-2 shadow-lg shadow-cyan-500/30">
                {/* Antena / Top Slot */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-6 rounded-t border border-[#00E5FF] bg-[#0A1D33]" />
                
                {/* Tela do Rosto do Mascote */}
                <div className="h-full w-full rounded bg-[#030914] border border-cyan-800/60 p-2 flex flex-col justify-center items-center">
                  {/* Olhos Pixel Art */}
                  <div className="flex items-center justify-center space-x-6 w-full mb-3">
                    {mascotMood === 'blink' ? (
                      <>
                        <div className="h-1 w-6 bg-[#00E5FF] rounded-sm shadow-sm shadow-cyan-400" />
                        <div className="h-1 w-6 bg-[#00E5FF] rounded-sm shadow-sm shadow-cyan-400" />
                      </>
                    ) : (
                      <>
                        <div className="h-6 w-6 rounded-sm bg-[#00E5FF] shadow-md shadow-cyan-400 flex items-center justify-center">
                          <div className="h-2 w-2 bg-[#030914] rounded-sm translate-x-0.5" />
                        </div>
                        <div className="h-6 w-6 rounded-sm bg-[#00E5FF] shadow-md shadow-cyan-400 flex items-center justify-center">
                          <div className="h-2 w-2 bg-[#030914] rounded-sm translate-x-0.5" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Boca Expressiva */}
                  {mascotMood === 'talking' ? (
                    <div className="h-3 w-8 rounded-sm bg-[#04D361] shadow-sm shadow-emerald-400 animate-pulse" />
                  ) : (
                    <div className="h-1.5 w-6 rounded-full bg-[#00E5FF] shadow-sm shadow-cyan-400" />
                  )}
                </div>

                {/* Drive de Disquete 3.5" no rodapé do PC */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-[#1C1A18] px-2 py-0.5 rounded border border-[#3D3A37]">
                  <div className="h-1 w-6 bg-[#000] rounded-sm" />
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </div>

              {/* Tag de Nome do Mascote */}
              <div className="mt-4 rounded-md bg-[#00E5FF]/10 px-3 py-1 border border-[#00E5FF]/40 text-center">
                <span className="font-mono text-xs font-bold text-[#00E5FF] tracking-wider">
                  NEXI // AI GUIDE
                </span>
              </div>
            </div>

            {/* Terminal de Diálogo Verde Phosphor / Cyan */}
            <div className="flex-1 w-full">
              <div className="min-h-[140px] rounded-lg border border-cyan-900/50 bg-[#040C1A]/90 p-4 font-mono text-sm leading-relaxed text-[#00E5FF] shadow-inner">
                <div className="mb-2 text-xs text-[#04D361] font-semibold tracking-wide">
                  &gt; TERMINAL BROADCAST [STEP {currentLineIndex + 1}/{dialogueLines.length}]
                </div>
                <p className="whitespace-pre-wrap font-mono text-sm md:text-base text-cyan-200">
                  {displayedText}
                  {isTyping && (
                    <span className="inline-block h-4 w-2 bg-[#04D361] ml-1 animate-pulse align-middle" />
                  )}
                </p>
                <div ref={textEndRef} />
              </div>

              {/* Botões de Ação do Diálogo */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex space-x-1.5">
                  {dialogueLines.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentLineIndex
                          ? 'w-6 bg-[#00E5FF]'
                          : idx < currentLineIndex
                          ? 'w-2 bg-[#04D361]'
                          : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex space-x-3">
                  {isTyping ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-lg border border-cyan-700/50 bg-cyan-950/40 px-4 py-2 font-mono text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/60"
                    >
                      PULAR [ESC]
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center space-x-2 rounded-lg border border-[#04D361] bg-[#04D361]/20 px-5 py-2 font-mono text-xs font-bold text-[#04D361] shadow-lg shadow-emerald-950/50 transition hover:bg-[#04D361] hover:text-black active:scale-95"
                  >
                    <span>
                      {currentLineIndex < dialogueLines.length - 1
                        ? 'CONTINUAR [ENTER]'
                        : 'CONFIGURAR AVATAR →'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do PC Vintage com Botão de Power e Ventilação */}
        <div className="mt-3 flex items-center justify-between px-2 pt-1 text-[11px] font-mono text-[#7A746D]">
          <div className="flex space-x-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-3 w-1 bg-[#151311] rounded-sm" />
            ))}
          </div>
          <div>POWER: ACTIVE (5V 2.5A)</div>
        </div>
      </div>
    </div>
  );
};
