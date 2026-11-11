'use client';

/**
 * PetCompanionHud.tsx
 * NEXUS CODE - Pet Companion Status & Progression Widget
 * 
 * Widget reativo exibindo o companheiro adotado pelo aluno, sua barra de XP,
 * nível, estágio evolutivo atual e gatilho de simulação de tarefas de código.
 */

import React from 'react';
import { useGameStore } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface PetCompanionHudProps {
  compact?: boolean;
}

export const PetCompanionHud: React.FC<PetCompanionHudProps> = ({ compact = false }) => {
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const petLevel = useGameStore((s) => s.petLevel);
  const petXp = useGameStore((s) => s.petXp);
  const petMaxXp = useGameStore((s) => s.petMaxXp);
  const petStage = useGameStore((s) => s.petStage);
  const petStageTitle = useGameStore((s) => s.petStageTitle);
  const addPetXp = useGameStore((s) => s.addPetXp);

  const audio = AudioSynthesizer.getInstance();

  const xpPercentage = Math.min(100, Math.round((petXp / petMaxXp) * 100));

  const handleTrainPet = () => {
    void audio.playTone({ frequency: 520, pitchBendTo: 780, duration: 0.1, type: 'triangle' });
    addPetXp(150);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#090D1C] border border-cyan-500/30 shadow-lg">
        <span className="text-xl select-none animate-bounce" style={{ animationDuration: '3s' }}>
          {selectedStarter.icon}
        </span>
        <div className="font-mono text-left">
          <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
            <span>{selectedStarter.name}</span>
            <span className="text-[#00E5FF]">Lv.{petLevel}</span>
          </div>
          <div className="w-16 bg-zinc-800 rounded-full h-1 overflow-hidden mt-0.5">
            <div className="bg-[#04D361] h-full rounded-full transition-all duration-300" style={{ width: `${xpPercentage}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-[#090D1C]/90 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: selectedStarter.color }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#04060E] border border-white/10 flex items-center justify-center text-3xl shadow-inner relative">
            <span className="animate-bounce" style={{ animationDuration: '3s' }}>
              {selectedStarter.icon}
            </span>
            <span className="absolute -bottom-1 -right-1 text-[9px] font-mono font-bold bg-purple-950 px-1.5 py-0.2 rounded-full border border-purple-500/40 text-purple-300">
              E{petStage}
            </span>
          </div>
          <div>
            <div className="text-xs font-mono text-[#00E5FF] font-bold uppercase tracking-wider">
              PET COMPANION ATIVO
            </div>
            <div className="text-base font-heading font-black text-white">
              {selectedStarter.name}
            </div>
            <div className="text-[10px] font-mono text-zinc-400">
              {petStageTitle} • {selectedStarter.languageTrack || 'Trilha de Código'}
            </div>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-xs font-bold text-emerald-400">
            NÍVEL {petLevel}
          </div>
          <div className="text-[10px] text-zinc-400">
            {petXp} / {petMaxXp} XP
          </div>
        </div>
      </div>

      {/* Barra de XP com Gradiente */}
      <div className="mb-3">
        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-white/[0.05]">
          <div
            className="bg-gradient-to-r from-[#00E5FF] to-[#04D361] h-full rounded-full transition-all duration-500"
            style={{ width: `${xpPercentage}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>{xpPercentage}% para o próximo nível</span>
          {petStage === 1 ? (
            <span className="text-amber-400 font-semibold">Evolui no Nível 10 ➔ Júnior</span>
          ) : petStage === 2 ? (
            <span className="text-purple-400 font-semibold">Evolui no Nível 25 ➔ Supremo</span>
          ) : (
            <span className="text-[#04D361] font-semibold">Forma Máxima Atingida</span>
          )}
        </div>
      </div>

      {/* Passiva & Ação de Teste */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="text-[10px] font-sans text-zinc-400 truncate max-w-[200px]">
          <strong className="text-zinc-200">{selectedStarter.passiveName || 'Passiva'}:</strong>{' '}
          {selectedStarter.passiveDescription || 'Bônus de XP'}
        </div>
        <button
          type="button"
          onClick={handleTrainPet}
          className="cursor-pointer shrink-0 px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold active:scale-95 transition-all"
        >
          ⚡ +150 XP Teste
        </button>
      </div>
    </div>
  );
};
