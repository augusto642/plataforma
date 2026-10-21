'use client';

/**
 * page.tsx
 * NEXUS CODE - /onboarding Route Page (PR #02)
 * 
 * Jornada de Entrada do Jogador:
 * - Fase 1: Mascote PC Retrô (Nexi) em tela CRT vintage com diálogo interativo
 * - Fase 2: Missão 1 (Sprint 6; promovida na Sprint 7) — a primeira
 *   batalha REAL do jogo, jogada ANTES da conta e ANTES da
 *   personalização: a vitória vem primeiro, o cadastro salva o progresso
 * - Fase 3: Nível de Carreira — entrada real (Iniciante) + roteiro de progressão
 * - Fase 4: Seleção de Starter em Cards TCG Holográficos com efeito 3D Tilt
 * - Fase 5: Estúdio de Avatar Pixel Art
 * - Fase 6: Salvar a Conta (Sprint 5/B11 real) — cadastro via AuthContext
 *   com o contexto do funil, ou "testar sem conta" explicitamente rotulado
 * - Quem salvou a conta segue para a primeira missão na IDE; o convidado
 *   segue para o /game
 * - Sprint 7: a etapa atual persiste junto das escolhas — quem volta
 *   continua da etapa salva, não do mascote
 */

import React, { useState, useEffect, useRef } from 'react';
// B11 — esta porta também captura a atribuição na chegada (a lib é única)
import { captureUtmFromUrl } from '../lib/attribution';
// Sprint 5 — pageview do funil (B08 completo)
// Sprint 8 — + leitura por etapa (onboarding_step_viewed) e retomada
// (onboarding_resumed): o prólogo deixa de ser caixa-preta no funil
import { track, trackPageview } from '../lib/analytics';
// Sprint 6 — escolhas do prólogo persistem entre sessões (D3)
// Sprint 7 — a etapa atual entra no mesmo espelho (retomada)
import {
  readOnboardingChoices,
  saveOnboardingChoices,
  type OnboardingStepName,
} from '../lib/onboardingChoices';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RetroCrtMascot } from './components/RetroCrtMascot';
import { CareerTierSelector } from './components/CareerTierSelector';
import { StarterEvolutionPreview } from './components/StarterEvolutionPreview';
import { PixelAvatarStudio } from './components/PixelAvatarStudio';
import { FirstMissionStep } from './components/FirstMissionStep';
import { SaveAccountStep } from './components/SaveAccountStep';
import { useGameStore, StarterCreature } from '../game/stores/useGameStore';
import { AudioSynthesizer } from '../game/engine/AudioSynthesizer';

// Sprint 5 — o prólogo ganha a etapa 'account' (salvar a conta) antes da
// transição para /game: a porta quente da landing agora termina em
// cadastro, não num beco sem conta.
// Sprint 6 — entra a etapa 'mission': a primeira vitória acontece ANTES
// do formulário (Fase 1 do plano).
// Sprint 7 — corredor curto: a Missão 1 sobe para logo depois do
// mascote (mascot → mission → tier → starter → avatar → account) e a
// etapa atual é persistida/retomada via onboardingChoices.
type OnboardingStep = OnboardingStepName | 'complete';

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();

  // B11 — captura UTMs da URL de chegada (quem cai direto aqui de um anúncio
  // não perde a atribuição; o cadastro lê da sessionStorage via lib)
  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
  }, []);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('mascot');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  // Sprint 6 — o destino da finalização depende de COMO o prólogo
  // terminou: conta salva → primeira missão na IDE; convidado → /game.
  const [finalizeTarget, setFinalizeTarget] = useState<'ide' | 'game'>('game');

  // Sprint 8 — refs da mensuração por etapa: a hidratação marca a
  // etapa restaurada para o efeito de step_viewed não contar a render
  // pré-hidratação ('mascot') como visualização de quem retomou.
  const restoredStepRef = useRef<OnboardingStepName | null>(null);
  const hydratedRef = useRef(false);
  const viewedStepRef = useRef<string | null>(null);

  // Sprint 6 (D3) — hidrata as escolhas persistidas na montagem: quem
  // fechou a aba no meio do prólogo volta com codename, starter, nível
  // e resultado da Missão 1 intactos.
  // Sprint 7 — e volta NA ETAPA SALVA: a retomada restaura também o
  // ponto do corredor onde a pessoa parou.
  // Sprint 8 — retomar uma etapa salva é evento do funil
  // (onboarding_resumed); na primeira visita não há o que retomar.
  useEffect(() => {
    const saved = readOnboardingChoices();
    if (saved) {
      const store = useGameStore.getState();
      if (saved.codename) store.setPlayerName(saved.codename);
      if (saved.starterId) store.setStarter(saved.starterId);
      if (saved.careerTier) store.setCareerTier(saved.careerTier);
      if (saved.firstMission) store.setFirstMission(saved.firstMission);
      if (saved.step) {
        restoredStepRef.current = saved.step;
        setCurrentStep(saved.step);
        track('onboarding_resumed', undefined, { step: saved.step, source: 'onboarding' });
      }
    }
    hydratedRef.current = true;
  }, []);

  // Sprint 8 — visualização por etapa do prólogo: dispara na etapa
  // hidratada e a cada transição (inclusive revisitas pelos indicadores
  // de passo), nunca na render pré-hidratação de uma sessão retomada.
  useEffect(() => {
    if (!hydratedRef.current || currentStep === 'complete') return;
    const restored = restoredStepRef.current;
    if (restored && restored !== currentStep) return;
    if (restored === currentStep) restoredStepRef.current = null;
    if (viewedStepRef.current === currentStep) return;
    viewedStepRef.current = currentStep;
    track('onboarding_step_viewed', undefined, { step: currentStep, source: 'onboarding' });
  }, [currentStep]);

  // Sprint 7 — a etapa vigente acompanha cada gravação do espelho:
  // o subscribe do store lê o step deste ref, e o efeito do step
  // persiste a foto completa a cada avanço de etapa.
  const stepRef = useRef<OnboardingStep>('mascot');

  // Sprint 6 (D3) — espelha as escolhas do store no localStorage a cada
  // mudança: a persistência acompanha o prólogo inteiro sem cada etapa
  // precisar lembrar de salvar.
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state) => {
      saveOnboardingChoices({
        codename: state.player.name,
        starterId: state.selectedStarter.id,
        careerTier: state.careerTier,
        firstMission: state.firstMission,
        step: stepRef.current === 'complete' ? undefined : stepRef.current,
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    stepRef.current = currentStep;
    if (currentStep === 'complete') return;
    const state = useGameStore.getState();
    saveOnboardingChoices({
      codename: state.player.name,
      starterId: state.selectedStarter.id,
      careerTier: state.careerTier,
      firstMission: state.firstMission,
      step: currentStep,
    });
  }, [currentStep]);

  const player = useGameStore((s) => s.player);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);

  const audio = AudioSynthesizer.getInstance();

  // Sprint 7 — corredor curto: do mascote o visitante vai DIRETO para
  // a Missão 1 (com o starter padrão da store); a personalização
  // (nível, starter, avatar) vira pós-vitória e a conta fecha o prólogo.
  const handleMascotDone = () => {
    setCurrentStep('mission');
    void audio.playTone({ frequency: 660, duration: 0.1, type: 'square' });
  };

  const handleMissionComplete = () => {
    setCurrentStep('tier');
    void audio.playTone({ frequency: 920, duration: 0.1, type: 'square' });
  };

  const handleTierSelected = () => {
    setCurrentStep('starter');
    void audio.playTone({ frequency: 720, duration: 0.1, type: 'square' });
  };

  const handleStarterSelected = (starter: StarterCreature, nickname: string) => {
    setCurrentStep('avatar');
    void audio.playTone({ frequency: 800, duration: 0.1, type: 'square' });
  };

  // Avatar é a última personalização: daqui segue para a etapa de
  // conta, que salva TUDO (vitória da Missão 1 + escolhas do prólogo).
  const handleAvatarDone = () => {
    setCurrentStep('account');
    void audio.playTone({ frequency: 880, duration: 0.1, type: 'square' });
  };

  // Sprint 6 — dois destinos, duas promessas distintas:
  // - conta salva: a jornada continua na PRIMEIRA MISSÃO DA IDE (/ide já
  //   abre no primeiro curso/atividade — ver loadCourses em ide/page.tsx);
  // - convidado: segue para o /game, como sempre, sem conta.
  const handleFinalize = (target: 'ide' | 'game') => {
    setFinalizeTarget(target);
    setIsFinalizing(true);
    void audio.playVictory();

    setTimeout(() => {
      router.push(target === 'ide' ? '/ide' : '/game');
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

          {/* Indicador de Passos — Sprint 7: ordem do corredor curto
              (1 Terminal → 2 Missão 1 → 3 Nível → 4 Pet & Curso →
              5 Avatar → 6 Salvar Conta) */}
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

            <span
              className={`flex items-center space-x-1.5 transition ${
                currentStep === 'mission'
                  ? 'text-[#00E5FF] font-bold'
                  : 'text-slate-500'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                2
              </span>
              <span>MISSÃO 1</span>
            </span>
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
                3
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
                4
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
                5
              </span>
              <span>AVATAR STUDIO</span>
            </button>
            <span className="text-slate-700">→</span>

            <span
              className={`flex items-center space-x-1.5 transition ${
                currentStep === 'account'
                  ? 'text-[#00E5FF] font-bold'
                  : 'text-slate-500'
              }`}
            >
              <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                6
              </span>
              <span>SALVAR CONTA</span>
            </span>
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
            {/* Atalho de convidado: rótulo explícito de teste sem conta */}
            <Link
              href="/game"
              className="text-slate-400 hover:text-cyan-400 transition"
            >
              Testar sem conta →
            </Link>
          </div>
        </div>
      </header>

      {/* Área Central de Conteúdo */}
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        {currentStep === 'mascot' && (
          <RetroCrtMascot onDialogueComplete={handleMascotDone} />
        )}

        {currentStep === 'mission' && (
          <FirstMissionStep onComplete={handleMissionComplete} />
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
          <PixelAvatarStudio onComplete={handleAvatarDone} submitLabel="CONTINUAR PARA SALVAR A CONTA →" />
        )}

        {currentStep === 'account' && (
          <SaveAccountStep
            onSaved={() => handleFinalize('ide')}
            onSkip={() => handleFinalize('game')}
          />
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
              {finalizeTarget === 'ide' ? 'CONTA SALVA!' : 'NEURAL SYNC COMPLETO!'}
            </h2>
            <p className="font-mono text-sm text-slate-300 mb-6">
              Operador <span className="text-[#04D361] font-bold">{player.name}</span> e{' '}
              <span className="text-[#FFA116] font-bold">{selectedStarter.name}</span>{' '}
              {finalizeTarget === 'ide'
                ? 'com o progresso salvo. Sua primeira missão na IDE já está aberta.'
                : 'inicializados no Circuit Valley...'}
            </p>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00E5FF] via-[#04D361] to-[#8257E5] animate-pulse w-full" />
            </div>
            <div className="mt-4 font-mono text-xs text-slate-500">
              {finalizeTarget === 'ide'
                ? 'ABRINDO SUA PRIMEIRA MISSÃO NA IDE...'
                : 'ENTRANDO NA ARENA EM 60 FPS...'}
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
