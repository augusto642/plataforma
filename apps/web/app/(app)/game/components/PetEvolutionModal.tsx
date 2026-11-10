'use client';

/**
 * PetEvolutionModal.tsx
 * NEXUS CODE - Pet Companion Evolution Celebration Modal
 * 
 * Acionado quando o Pet do aluno atinge os marcos de evolução (Nível 10 ou Nível 25):
 * - Animação de transformação de silhueta (Filhote ➔ Combatente)
 * - Fanfarra de áudio sintético procedural
 * - Notificação de desbloqueio de novo nível de carreira (Tier Júnior)
 * - Exibição da nova habilidade tática desbloqueada
 */

import React, { useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';

export const PetEvolutionModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.evolutionModalOpen);
  const details = useGameStore((s) => s.evolutionDetails);
  const petLevel = useGameStore((s) => s.petLevel);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const closeEvolutionModal = useGameStore((s) => s.closeEvolutionModal);

  const audio = AudioSynthesizer.getInstance();

  useEffect(() => {
    if (isOpen) {
      void audio.playVictory();
    }
  }, [isOpen]);

  if (!isOpen || !details) return null;

  const isStage2 = details.newStage === 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      {/* Moldura com Glow Radial */}
      <div className="relative w-full max-w-lg rounded-3xl p-[2px] bg-gradient-to-b from-[#00E5FF] via-[#04D361] to-[#8257E5] shadow-[0_0_60px_rgba(0,229,255,0.4)]">
        <div className="rounded-[22px] bg-[#070B18] p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Luz Estroboscópica de Fundo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#04D361]/25 blur-3xl animate-pulse pointer-events-none" />

          {/* Tag de Celebração */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold mb-5 shadow-[0_0_20px_rgba(4,211,97,0.3)]">
            <span className="w-2 h-2 rounded-full bg-[#04D361] animate-ping" />
            <span>METAMORFOSE COMPLETA // MARCO DE DOMÍNIO</span>
          </div>

          {/* Pod de Transformação do Sprite */}
          <div className="relative my-4 py-6 px-4 rounded-2xl bg-[#04060E] border border-white/10 flex items-center justify-center gap-6 shadow-inner">
            {/* Estágio Anterior */}
            <div className="flex flex-col items-center opacity-50 scale-90">
              <span className="text-4xl filter grayscale mb-1 select-none">
                {selectedStarter.icon}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Estágio {details.oldStage}
              </span>
            </div>

            {/* Seta de Evolução com Pulso */}
            <div className="flex flex-col items-center">
              <span className="text-xl text-[#00E5FF] font-black animate-pulse">
                ➔ ➔
              </span>
              <span className="text-[9px] font-mono text-[#04D361] font-bold">
                NÍVEL {petLevel}
              </span>
            </div>

            {/* Novo Estágio Evoluído */}
            <div className="flex flex-col items-center scale-110">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 blur-md opacity-60 animate-ping" />
                <span className="relative text-5xl mb-1 select-none block animate-bounce" style={{ animationDuration: '2s' }}>
                  {selectedStarter.icon}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#00E5FF] font-bold bg-cyan-950/70 px-2 py-0.5 rounded-full border border-cyan-500/30 mt-1">
                Estágio {details.newStage}
              </span>
            </div>
          </div>

          {/* Título & Anúncio Épico */}
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight mb-2">
            Seu Pet Companion Evoluiu!
          </h2>
          <p className="text-sm font-sans text-zinc-300 leading-relaxed mb-6">
            <strong className="text-white">{details.petName}</strong> dominou a base algorítmica e atingiu a forma{' '}
            <strong className="text-[#04D361]">{details.title}</strong>!
          </p>

          {/* Notificação Especial: Desbloqueio da Trilha Júnior */}
          {isStage2 && (
            <div className="mb-6 p-4 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 text-left shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">🔓</span>
                <span className="text-xs font-mono font-bold text-[#00E5FF] uppercase">
                  NOVO NÍVEL DE CARREIRA DESBLOQUEADO!
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Você conquistou o direito de avançar para a <strong className="text-white">Trilha Júnior</strong>! 
                Desafios de Estruturas de Dados, APIs RESTful, PostgreSQL e commits assinados no Git agora estão disponíveis.
              </p>
            </div>
          )}

          {/* Nova Habilidade Desbloqueada */}
          <div className="mb-6 p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-left">
            <div className="text-[10px] font-mono text-purple-300 font-bold uppercase mb-0.5">
              NOVA HABILIDADE TÁTICA DESBLOQUEADA:
            </div>
            <div className="text-xs font-mono text-white font-bold flex items-center gap-1.5">
              <span>⚡</span>
              <span>{details.skillUnlocked}</span>
            </div>
          </div>

          {/* Botão de Fechamento */}
          <button
            type="button"
            onClick={closeEvolutionModal}
            className="w-full cursor-pointer py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#04D361] to-[#00E58F] hover:from-[#00E58F] hover:to-[#04D361] text-black font-heading font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-[0_0_25px_rgba(4,211,97,0.45)]"
          >
            Continuar Aventura com {details.petName} →
          </button>
        </div>
      </div>
    </div>
  );
};
