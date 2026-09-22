'use client';

/**
 * page.tsx
 * NEXUS CODE - /onboarding Route Page (PR #02)
 * 
 * Jornada de Entrada do Jogador:
 * - Fase 1: Mascote PC Retrô (Nexi) em tela CRT vintage com diálogo interativo
 * - Fase 2: Estúdio de Avatar Pixel Art com Canvas 2D e customizador
 * - Fase 3: Seleção de Starter em Cards TCG Holográficos com efeito 3D Tilt
 * - Fase 4: Inicialização de Operador e Transição Épica para /game
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RetroCrtMascot } from './components/RetroCrtMascot';
import { CareerTierSelector } from './components/CareerTierSelector';
import { StarterEvolutionPreview } from './components/StarterEvolutionPreview';
import { PixelAvatarStudio } from './components/PixelAvatarStudio';
import { useGameStore, StarterCreature } from '../game/stores/useGameStore';
import { AudioSynthesizer } from '../game/engine/AudioSynthesizer';

type OnboardingStep = 'mascot' | 'tier' | 'starter' | 'avatar' | 'complete';

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('mascot');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  const player = useGameStore((s) => s.player);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);

  const audio = AudioSynthesizer.getInstance();

  const handleMascotDone = () => {
    setCurrentStep('tier');
    void audio.playTone({ frequency: 660, duration: 0.1, type: 'square' });
  };

  const handleTierSelected = () => {
    setCurrentStep('starter');
    void audio.playTone({ frequency: 720, duration: 0.1, type: 'square' });
  };

  const handleStarterSelected = (starter: StarterCreature, nickname: string) => {
    setCurrentStep('avatar');
    void audio.playTone({ frequency: 800, duration: 0.1, type: 'square' });
  };

  const handleAvatarDone = () => {
    setIsFinalizing(true);
    void audio.playVictory();

    setTimeout(() => {
      router.push('/game');
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 flex flex-col justify-between selection:bg-[#00E5FF] selection:text-black">
      {/* Top Navbar Minimalista Dark Obsidian */}
      <header className="border-b border-slate-800/80 bg-[#0B1021]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#00E5FF] to-[#04D361] font-mono text-sm font-black text-black">
                N
              </span>
              <span className="font-mono text-base font-black tracking-wider text-white">
                NEXUS<span className="text-[#00E5FF]">CODE</span>
              </span>
            </Link>
            <span className="rounded-full bg-cyan-950/60 px-2.5 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-800">
              PROLOGUE
            </span>
          </div>

          {/* Indicador de Passos */}
          <div className="hidden md:flex items-center space-x-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => setCurrentStep('mascot')}
              className={`flex items-center space-x-1.5 transition ${
                currentStep === 'mascot'
                  ? 'text-[#00E5FF] font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                1
              </span>
              <span>TERMINAL</span>
            </button>
            <span className="text-slate-700">→</span>

            <button
              type="button"
              onClick={() => setCurrentStep('tier')}
              className={`flex items-center space-x-1.5 transition ${
                currentStep === 'tier'
                  ? 'text-[#00E5FF] font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                2
              </span>
              <span>NÍVEL DE CARREIRA</span>
            </button>
            <span className="text-slate-700">→</span>

            <button
              type="button"
              onClick={() => setCurrentStep('starter')}
              className={`flex items-center space-x-1.5 transition ${
                currentStep === 'starter'
                  ? 'text-[#00E5FF] font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                3
              </span>
              <span>PET & CURSO</span>
            </button>
            <span className="text-slate-700">→</span>

            <button
              type="button"
              onClick={() => setCurrentStep('avatar')}
              className={`flex items-center space-x-1.5 transition ${
                currentStep === 'avatar'
                  ? 'text-[#00E5FF] font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                4
              </span>
              <span>AVATAR STUDIO</span>
            </button>
          </div>

          {/* Mute & Link Rápido */}
          <div className="flex items-center space-x-4 font-mono text-xs">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300 hover:border-slate-600 transition"
            >
              {isMuted ? '🔇 ÁUDIO DESATIVADO' : '🔊 ÁUDIO 8-BIT ATIVO'}
            </button>
            <Link
              href="/game"
              className="text-slate-400 hover:text-cyan-400 transition"
            >
              Pular Onboarding →
            </Link>
          </div>
        </div>
      </header>

      {/* Área Central de Conteúdo */}
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        {currentStep === 'mascot' && (
          <RetroCrtMascot onDialogueComplete={handleMascotDone} />
        )}

        {currentStep === 'tier' && (
          <CareerTierSelector onSelectBeginner={handleTierSelected} />
        )}

        {currentStep === 'starter' && (
          <StarterEvolutionPreview
            onConfirmStarter={handleStarterSelected}
            onBack={() => setCurrentStep('tier')}
          />
        )}

        {currentStep === 'avatar' && (
          <PixelAvatarStudio onComplete={handleAvatarDone} submitLabel="FINALIZAR & ENTRAR NO JOGO →" />
        )}
      </main>

      {/* Overlay de Finalização / Teleporte para a Arena */}
      {isFinalizing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in">
          <div className="text-center p-8 max-w-lg">
            <div className="mb-4 inline-block animate-bounce text-6xl">
              🚀
            </div>
            <h2 className="font-mono text-3xl font-black text-[#00E5FF] tracking-tight mb-2">
              NEURAL SYNC COMPLETO!
            </h2>
            <p className="font-mono text-sm text-slate-300 mb-6">
              Operador <span className="text-[#04D361] font-bold">{player.name}</span> e{' '}
              <span className="text-[#FFA116] font-bold">{selectedStarter.name}</span> inicializados no Circuit Valley...
            </p>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00E5FF] via-[#04D361] to-[#8257E5] animate-pulse w-full" />
            </div>
            <div className="mt-4 font-mono text-xs text-slate-500">
              ENTRANDO NA ARENA EM 60 FPS...
            </div>
          </div>
        </div>
      )}

      {/* Footer Minimalista */}
      <footer className="border-t border-slate-900 bg-[#03060F] py-4 text-center font-mono text-xs text-slate-500">
        NEXUS CODE RPG ENGINE // PROLOGUE ONBOARDING // DARK OBSIDIAN ARCHITECTURE
      </footer>
    </div>
  );
}
