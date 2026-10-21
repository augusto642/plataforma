'use client';

/**
 * CareerTierSelector.tsx
 * NEXUS CODE - Onboarding Career Tier Matrix Selector
 *
 * Sprint 6 — fim da "etapa-teatro": até a Sprint 5, a grade exibia 4
 * tiers como se fossem escolha, mas o clique gravava SEMPRE 'beginner'
 * (os demais nasciam mortos: "bloqueados" clicáveis que não faziam
 * nada). A regra real do produto — declarada no próprio texto desta
 * etapa — é que todo aluno novo entra pelo Iniciante (é o nível
 * gratuito e a base da progressão). Então a etapa agora diz a verdade:
 * - UM card selecionável de verdade: Iniciante (a entrada real).
 * - Os demais tiers viram ROTEIRO de progressão (não são opções):
 *   Júnior/Pleno/Sênior desbloqueiam jogando, nos níveis 15/30/50.
 * A escolha gravada no store (careerTier='beginner') passa a ser a
 * escolha real feita aqui — e é a que o resumo da conta e as props de
 * analytics do signup exibem.
 */

import React from 'react';
import { useGameStore, CareerTier } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface CareerTierSelectorProps {
  onSelectBeginner: () => void;
}

interface TierConfig {
  id: CareerTier;
  title: string;
  subtitle: string;
  levelRequirement: string;
  statusBadge: string;
  accentColor: string;
  icon: string;
  activities: string[];
  ctaLabel: string;
}

const BEGINNER_TIER: TierConfig = {
  id: 'beginner',
  title: 'Iniciante // A Forja do Código',
  subtitle: 'Aprenda a programar do zero em uma jornada RPG tática com monstrinhos colecionáveis.',
  levelRequirement: 'Livre para todos os novos alunos',
  statusBadge: '🟢 DISPONÍVEL AGORA • NÍVEL 1 A 14',
  accentColor: '#04D361',
  icon: '🐣',
  activities: [
    'Lógica de programação pura e raciocínio algorítmico do zero',
    'Variáveis, tipos primitivos e operadores matemáticos/lógicos',
    'Estruturas condicionais (if, else if, else) e tomada de decisão',
    'Laços de repetição (for, while) e iteração em coleções',
    'Funções puras, parâmetros, retorno e modularização inicial',
    'Debugging com auxílio socrático da tutora de IA (sem spoilers)',
    'Adoção do seu primeiro Pet Companion que ganha XP e evolui com seu código',
  ],
  ctaLabel: '⚡ Iniciar Como Iniciante & Adotar Pet →',
};

// Progressão de carreira: NÃO são opções de entrada — desbloqueiam com
// o avanço do aluno (níveis 15/30/50). Exibidos como roteiro, sem botão.
const PROGRESSION_TIERS: Array<{
  id: CareerTier;
  title: string;
  unlockLabel: string;
  accentColor: string;
  icon: string;
}> = [
  {
    id: 'junior',
    title: 'Júnior // Engenharia Aplicada & APIs',
    unlockLabel: 'Desbloqueia no Nível 15',
    accentColor: '#00E5FF',
    icon: '🛡️',
  },
  {
    id: 'mid',
    title: 'Pleno // Concorrência & Microsserviços',
    unlockLabel: 'Desbloqueia no Nível 30',
    accentColor: '#8257E5',
    icon: '⚡',
  },
  {
    id: 'senior',
    title: 'Sênior // Sistemas Distribuídos & Missão Crítica',
    unlockLabel: 'Desbloqueia no Nível 50',
    accentColor: '#FFA116',
    icon: '👑',
  },
];

export const CareerTierSelector: React.FC<CareerTierSelectorProps> = ({ onSelectBeginner }) => {
  const setCareerTier = useGameStore((s) => s.setCareerTier);
  const audio = AudioSynthesizer.getInstance();

  const handleStartBeginner = () => {
    // A única escolha de entrada que existe — gravada de verdade no
    // store, resumida na etapa de conta e enviada nas props do signup.
    setCareerTier('beginner');
    void audio.playTone({ frequency: 620, pitchBendTo: 880, duration: 0.12, type: 'triangle' });
    onSelectBeginner();
  };

  const tier = BEGINNER_TIER;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 animate-fadeIn">
      {/* Cabeçalho da Seção */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 font-mono text-xs text-[#00E5FF] font-bold mb-4 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
          <span>FASE 1 // SEU PONTO DE PARTIDA</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-heading font-black text-white tracking-tight mb-4">
          Todo mundo começa pela Forja do Código
        </h2>
        <p className="font-sans text-sm sm:text-base text-zinc-300 leading-relaxed">
          Para garantir uma base sólida e evitar o <strong className="text-white">Tutorial Hell</strong>,
          todo aluno novo entra pelo nível <strong className="text-[#04D361]">Iniciante</strong> — é o
          nível gratuito e o começo da jornada. Júnior, Pleno e Sênior não são escolha de entrada:
          você os desbloqueia subindo de nível, como mostra o roteiro abaixo.
        </p>
      </div>

      {/* A entrada real: um único card, selecionável de verdade */}
      <div className="mx-auto max-w-xl">
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#04D361] via-[#00E5FF]/40 to-transparent shadow-[0_15px_40px_rgba(4,211,97,0.25)] ring-2 ring-[#04D361]/50">
          <div className="rounded-[23px] bg-[#0B1021]/95 p-6 backdrop-blur-xl relative overflow-hidden">
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: tier.accentColor }}
            />

            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-3xl p-2.5 rounded-2xl bg-[#060814] border border-white/10 shadow-inner">
                {tier.icon}
              </span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border bg-emerald-950/70 border-emerald-500/50 text-[#04D361]">
                {tier.statusBadge}
              </span>
            </div>

            <h3 className="text-lg font-heading font-black text-white mb-2 leading-snug">
              {tier.title}
            </h3>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-5">
              {tier.subtitle}
            </p>

            <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono flex items-center gap-2">
              <span className="text-zinc-500">Requisito:</span>
              <span className="text-[#04D361] font-bold">{tier.levelRequirement}</span>
            </div>

            <div className="mb-6">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-3">
                ATIVIDADES TÉCNICAS:
              </div>
              <ul className="space-y-2.5">
                {tier.activities.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-sans text-zinc-300 leading-relaxed">
                    <span className="shrink-0 font-bold mt-0.5 text-[#04D361]">✔</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleStartBeginner}
                className="w-full cursor-pointer py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#04D361] via-[#00E58F] to-[#04D361] hover:from-[#00E58F] hover:to-[#04D361] text-black font-heading font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-[0_0_25px_rgba(4,211,97,0.4)] flex items-center justify-center gap-2"
              >
                <span>{tier.ctaLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Roteiro de progressão: informação, não opção (sem botões) */}
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="mb-4 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Sua jornada depois da Forja — desbloqueia jogando
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PROGRESSION_TIERS.map((prog, idx) => (
            <div
              key={prog.id}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <span className="text-2xl">{prog.icon}</span>
              <div>
                <div className="font-heading text-xs font-bold text-zinc-200">{prog.title}</div>
                <div className="mt-0.5 font-mono text-[10px] font-bold" style={{ color: prog.accentColor }}>
                  🔒 {prog.unlockLabel}
                </div>
              </div>
              {idx < PROGRESSION_TIERS.length - 1 && (
                <span className="ml-auto hidden text-zinc-600 sm:block">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
