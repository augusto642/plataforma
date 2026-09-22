'use client';

/**
 * CareerTierSelector.tsx
 * NEXUS CODE - Onboarding Career Tier Matrix Selector
 * 
 * Permite ao desenvolvedor escolher sua patente inicial de entrada:
 * - Iniciante: LIBERADO (Aventura RPG com monstrinhos, lógica do zero e adoção do Pet).
 * - Júnior: BLOQUEADO (Descrição completa: Estruturas de Dados, APIs, Postgres, Testes e Git).
 * - Pleno: BLOQUEADO (Descrição completa: Concorrência, Microsserviços, Redis, Docker e P99).
 * - Sênior: BLOQUEADO (Descrição completa: Sistemas Distribuídos, cgroups-v2 e Liderança).
 */

import React, { useState } from 'react';
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
  isUnlocked: boolean;
  statusBadge: string;
  accentColor: string;
  icon: string;
  activities: string[];
  ctaLabel: string;
}

const CAREER_TIERS: TierConfig[] = [
  {
    id: 'beginner',
    title: 'Iniciante // A Forja do Código',
    subtitle: 'Aprenda a programar do zero em uma jornada RPG tática com monstrinhos colecionáveis.',
    levelRequirement: 'Livre para todos os novos alunos',
    isUnlocked: true,
    statusBadge: '🟢 DISPONÍVEL AGORA • NÍVEL 1 A 14',
    accentColor: '#04D361',
    icon: '🐣',
    activities: [
      'Lógica de programação pura e raciocínio algorítmico do zero',
      'Variáveis, tipos primitivos e operadores matemáticos/lógicos',
      'Estruturas condicionais (if, else if, else) e tomada de decisão',
      'Laços de repetição (for, while) e iteração em coleções',
      'Funções puras, parâmetros, retorno e modularização inicial',
      'Debugging com auxílio socrático da mentora com IA Lumi (sem spoilers)',
      'Adoção do seu primeiro Pet Companion que ganha XP e evolui com seu código',
    ],
    ctaLabel: '⚡ Iniciar Como Iniciante & Adotar Pet →',
  },
  {
    id: 'junior',
    title: 'Júnior // Engenharia Aplicada & APIs',
    subtitle: 'Estruturas de dados, APIs RESTful e persistência em banco de dados relacional.',
    levelRequirement: 'Requer Nível 15 ou Pet Companion no Estágio 2',
    isUnlocked: false,
    statusBadge: '🔒 BLOQUEADO • Requer Trilha Iniciante',
    accentColor: '#00E5FF',
    icon: '🛡️',
    activities: [
      'Estruturas de dados fundamentais: Arrays dinâmicos, Listas encadeadas e HashMaps',
      'Criação de APIs RESTful estruturadas com validação de schemas e DTOs',
      'Modelagem e persistência relacional com PostgreSQL e Prisma ORM',
      'Baterias de testes unitários automatizados com Jest e Vitest',
      'Repositórios Git reais com commits assinados e hash criptográfico SHA-256',
    ],
    ctaLabel: '🔒 Conclua a Trilha Iniciante para Desbloquear',
  },
  {
    id: 'mid',
    title: 'Pleno // Concorrência & Microsserviços',
    subtitle: 'Sistemas concorrentes de baixa latência, mensageria e conteinerização.',
    levelRequirement: 'Requer Nível 30 de Engenharia',
    isUnlocked: false,
    statusBadge: '🔒 BLOQUEADO • Requer Trilha Júnior',
    accentColor: '#8257E5',
    icon: '⚡',
    activities: [
      'Programação concorrente e multithreading: Goroutines, Channels, Mutexes e Lock-free',
      'Arquitetura de microsserviços desacoplados e comunicação assíncrona',
      'Estratégias de cache distribuído de alto desempenho com Redis',
      'Filas de tarefas em background com BullMQ e tratamento de dead-letters',
      'Conteinerização isolada com Docker e mitigação de gargalos de latência P99',
    ],
    ctaLabel: '🔒 Requer Nível 30 de Engenharia',
  },
  {
    id: 'senior',
    title: 'Sênior // Sistemas Distribuídos & Missão Crítica',
    subtitle: 'Arquitetura em escala planetária, resiliência de kernel e liderança técnica.',
    levelRequirement: 'Requer Nível 50 de Engenharia',
    isUnlocked: false,
    statusBadge: '🔒 BLOQUEADO • Requer Trilha Pleno',
    accentColor: '#FFA116',
    icon: '👑',
    activities: [
      'Design de sistemas distribuídos tolerantes a falhas e particionamento de dados',
      'Isolamento de kernels Linux com cgroups-v2, seccomp e namespaces restritos',
      'Engenharia de segurança defensiva e mitigação rigorosa de OWASP Top 10',
      'Observabilidade avançada com OpenTelemetry, tracing distribuído e métricas RED',
      'Liderança técnica de arquitetura e governança de tecnologia em escala',
    ],
    ctaLabel: '🔒 Requer Nível 50 de Engenharia',
  },
];

export const CareerTierSelector: React.FC<CareerTierSelectorProps> = ({ onSelectBeginner }) => {
  const [selectedTier, setSelectedTier] = useState<CareerTier>('beginner');
  const setCareerTier = useGameStore((s) => s.setCareerTier);
  const audio = AudioSynthesizer.getInstance();

  const handleSelectTier = (tier: TierConfig) => {
    if (!tier.isUnlocked) {
      void audio.playTone({ frequency: 220, duration: 0.15, type: 'sawtooth' });
      return;
    }

    setSelectedTier('beginner');
    setCareerTier('beginner');
    void audio.playTone({ frequency: 620, pitchBendTo: 880, duration: 0.12, type: 'triangle' });
    onSelectBeginner();
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 animate-fadeIn">
      {/* Cabeçalho da Seção */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 font-mono text-xs text-[#00E5FF] font-bold mb-4 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
          <span>FASE 1 // MATRIZ DE NÍVEIS DE CARREIRA</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-heading font-black text-white tracking-tight mb-4">
          Escolha Seu Ponto de Partida
        </h2>
        <p className="font-sans text-sm sm:text-base text-zinc-300 leading-relaxed">
          Para garantir uma base sólida de engenharia e evitar o <strong className="text-white">Tutorial Hell</strong>, 
          todos os novos operadores iniciam pela <strong className="text-[#04D361]">Forja do Código</strong>, onde adotam 
          um Pet Companion elemental que ganha XP e evolui conforme você domina algoritmos e sintaxe.
        </p>
      </div>

      {/* Grid com os 4 Níveis de Carreira */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {CAREER_TIERS.map((tier) => {
          const isBeginner = tier.id === 'beginner';

          return (
            <div
              key={tier.id}
              className={`relative rounded-3xl p-[1px] transition-all duration-300 flex flex-col justify-between ${
                isBeginner
                  ? 'bg-gradient-to-b from-[#04D361] via-[#00E5FF]/40 to-transparent shadow-[0_15px_40px_rgba(4,211,97,0.25)] ring-2 ring-[#04D361]/50'
                  : 'bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent opacity-85 hover:opacity-95'
              }`}
            >
              <div className="rounded-[23px] bg-[#0B1021]/95 p-6 h-full flex flex-col justify-between backdrop-blur-xl relative overflow-hidden">
                {/* Glow de fundo */}
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ background: tier.accentColor }}
                />

                <div>
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-3xl p-2.5 rounded-2xl bg-[#060814] border border-white/10 shadow-inner">
                      {tier.icon}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                        isBeginner
                          ? 'bg-emerald-950/70 border-emerald-500/50 text-[#04D361]'
                          : 'bg-zinc-900/90 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {tier.statusBadge}
                    </span>
                  </div>

                  {/* Título & Subtítulo */}
                  <h3 className="text-lg font-heading font-black text-white mb-2 leading-snug">
                    {tier.title}
                  </h3>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-5">
                    {tier.subtitle}
                  </p>

                  {/* Requisito */}
                  <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono flex items-center gap-2">
                    <span className="text-zinc-500">Requisito:</span>
                    <span className={isBeginner ? 'text-[#04D361] font-bold' : 'text-amber-400 font-bold'}>
                      {tier.levelRequirement}
                    </span>
                  </div>

                  {/* Lista Detalhada de Atividades */}
                  <div className="mb-6">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-3 flex items-center gap-1.5">
                      <span>ATIVIDADES TÉCNICAS:</span>
                    </div>
                    <ul className="space-y-2.5">
                      {tier.activities.map((act, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-sans text-zinc-300 leading-relaxed">
                          <span className={`shrink-0 font-bold mt-0.5 ${isBeginner ? 'text-[#04D361]' : 'text-zinc-500'}`}>
                            {isBeginner ? '✔' : '🔒'}
                          </span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="pt-4 border-t border-white/[0.06]">
                  {isBeginner ? (
                    <button
                      type="button"
                      onClick={() => handleSelectTier(tier)}
                      className="w-full cursor-pointer py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#04D361] via-[#00E58F] to-[#04D361] hover:from-[#00E58F] hover:to-[#04D361] text-black font-heading font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-[0_0_25px_rgba(4,211,97,0.4)] flex items-center justify-center gap-2 group"
                    >
                      <span>{tier.ctaLabel}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectTier(tier)}
                      className="w-full cursor-not-allowed py-3 px-4 rounded-xl bg-white/[0.02] border border-white/10 text-zinc-500 font-mono text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <span>{tier.ctaLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
