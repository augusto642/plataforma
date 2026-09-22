'use client';

/**
 * StarterEvolutionPreview.tsx
 * NEXUS CODE - Vitrine dos 3 Starters Canônicos com Evolução em 3 Estágios
 * 
 * Permite ao aluno inspecionar a árvore de metamorfose antes de escolher seu curso:
 * - 🐍 Pythox (Python): Filhote ➔ Víbora Ágil ➔ Serpente Titânica
 * - ⚡ Scripty (TypeScript/JavaScript): Centelha ➔ Raposa Volt ➔ Cibernético Arcanjo
 * - ☕ Javagon (Java): Draconete ➔ Cavaleiro a Vapor ➔ Colosso de Titânio
 */

import React, { useState } from 'react';
import { StarterCreature, useGameStore } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

export interface StageData {
  stage: 1 | 2 | 3;
  title: string;
  levelReq: number;
  icon: string;
  lore: string;
  signatureSkill: string;
  skillPower: number;
}

export interface CanonicalStarterInfo {
  id: string;
  name: string;
  codeName: string;
  language: string;
  type: 'LOGIC' | 'NETWORK' | 'COMPILER';
  color: string;
  accentColor: string;
  passiveName: string;
  passiveDesc: string;
  stages: [StageData, StageData, StageData];
}

export const CANONICAL_STARTERS: CanonicalStarterInfo[] = [
  {
    id: 'pythox',
    name: 'Pythox',
    codeName: 'PYTHOX.py',
    language: 'Python & Lógica Pura',
    type: 'LOGIC',
    color: '#38BDF8',
    accentColor: '#0284C7',
    passiveName: 'Clean Syntax',
    passiveDesc: '+15% de precisão e bônus de XP em desafios de loops e condicionais.',
    stages: [
      {
        stage: 1,
        title: 'Pythox Filhote',
        levelReq: 1,
        icon: '🐍',
        lore: 'Pequena serpente curiosa nascida nos vales de indentação. Aprende a declarar variáveis e dominar condicionais if/else.',
        signatureSkill: 'Syntax Strike',
        skillPower: 40,
      },
      {
        stage: 2,
        title: 'Víbora Ágil',
        levelReq: 10,
        icon: '🐉',
        lore: 'Desenvolve escamas energéticas ao dominar loops for/while, fatiamento de listas e dicionários otimizados.',
        signatureSkill: 'List Comprehension Burst',
        skillPower: 68,
      },
      {
        stage: 3,
        title: 'Serpente Titânica',
        levelReq: 25,
        icon: '👑',
        lore: 'Colosso lendário envolto em auras de dados algorítmicos. Domina recursão profunda, árvores binárias e complexidade O(n log n).',
        signatureSkill: 'Algorithmic Singularity',
        skillPower: 95,
      },
    ],
  },
  {
    id: 'scripty',
    name: 'Scripty',
    codeName: 'SCRIPTY.ts',
    language: 'TypeScript & Frontend Reativo',
    type: 'NETWORK',
    color: '#FACC15',
    accentColor: '#EAB308',
    passiveName: 'Strict Typing',
    passiveDesc: 'Reduz danos de runtime em 30% e previne falhas de variáveis indefinidas.',
    stages: [
      {
        stage: 1,
        title: 'Centelha Neon',
        levelReq: 1,
        icon: '⚡',
        lore: 'Uma pequena faísca elétrica gerada a partir de funções simples. Reage instantaneamente a cliques e eventos de interface.',
        signatureSkill: 'Reactive Pulse',
        skillPower: 42,
      },
      {
        stage: 2,
        title: 'Raposa Volt',
        levelReq: 10,
        icon: '🦊',
        lore: 'Ágil e veloz, possui cauda de raio que reconcilia árvores do Virtual DOM e manipula arrays de alta ordem com elegância.',
        signatureSkill: 'VDOM Reconciler Burst',
        skillPower: 70,
      },
      {
        stage: 3,
        title: 'Cibernético Arcanjo',
        levelReq: 25,
        icon: '✨',
        lore: 'Domínio absoluto do fluxo assíncrono. Converte Promises concorrentes, WebSockets e micro-frontends em feitiços fulminantes.',
        signatureSkill: 'Async/Await Supernova',
        skillPower: 98,
      },
    ],
  },
  {
    id: 'javagon',
    name: 'Javagon',
    codeName: 'JAVAGON.java',
    language: 'Java & Arquitetura Orientada a Objetos',
    type: 'COMPILER',
    color: '#FB923C',
    accentColor: '#EA580C',
    passiveName: 'Bytecode Armor',
    passiveDesc: 'Neutraliza falhas de tipagem e concede +20% de defesa em desafios estruturais.',
    stages: [
      {
        stage: 1,
        title: 'Draconete a Vapor',
        levelReq: 1,
        icon: '☕',
        lore: 'Filhote de dragão forjado em café recém-passado. Compreende classes, métodos encapsulados e compilação em bytecode.',
        signatureSkill: 'JVM Blast',
        skillPower: 45,
      },
      {
        stage: 2,
        title: 'Cavaleiro a Vapor',
        levelReq: 10,
        icon: '🛡️',
        lore: 'Empunha a couraça de interfaces e polimorfismo. Imune a erros de conversão de tipos e mestre em gerenciamento de coleções.',
        signatureSkill: 'Polymorphic Shield Strike',
        skillPower: 72,
      },
      {
        stage: 3,
        title: 'Colosso de Titânio',
        levelReq: 25,
        icon: '🐲',
        lore: 'Dragão encouraçado colossal. Orquestra dezenas de threads concorrentes na JVM com zero vazamento de memória e alta resiliência corporativa.',
        signatureSkill: 'Garbage Collector Purge',
        skillPower: 100,
      },
    ],
  },
];

interface StarterEvolutionPreviewProps {
  onConfirmStarter: (starter: StarterCreature, petNickname: string) => void;
  onBack?: () => void;
}

export const StarterEvolutionPreview: React.FC<StarterEvolutionPreviewProps> = ({
  onConfirmStarter,
  onBack,
}) => {
  const startersCatalog = useGameStore((s) => s.startersCatalog);
  const setStarter = useGameStore((s) => s.setStarter);

  const [selectedStarterId, setSelectedStarterId] = useState<string>('pythox');
  const [selectedStage, setSelectedStage] = useState<1 | 2 | 3>(1);
  const [customPetName, setCustomPetName] = useState<string>('');

  const audio = AudioSynthesizer.getInstance();

  const activeStarter = CANONICAL_STARTERS.find((s) => s.id === selectedStarterId) || CANONICAL_STARTERS[0];
  const activeStageData = activeStarter.stages[selectedStage - 1];

  const handleSelectStarter = (starterId: string) => {
    setSelectedStarterId(starterId);
    setStarter(starterId);
    void audio.playTone({
      frequency: starterId === 'pythox' ? 580 : starterId === 'scripty' ? 740 : 660,
      duration: 0.1,
      type: 'triangle',
    });
  };

  const handleSelectStage = (stage: 1 | 2 | 3) => {
    setSelectedStage(stage);
    if (stage === 3) {
      void audio.playEvolutionFanfare();
    } else {
      void audio.playTone({ frequency: stage === 1 ? 520 : 780, duration: 0.08, type: 'square' });
    }
  };

  const handleConfirm = () => {
    const storeStarter = startersCatalog.find((s) => s.id === selectedStarterId) || startersCatalog[0];
    const finalName = customPetName.trim() || activeStarter.name;
    void audio.playVictory();
    onConfirmStarter(storeStarter, finalName);
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 animate-fadeIn">
      {/* Botão Voltar */}
      {onBack && (
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]"
          >
            <span>←</span>
            <span>Voltar ao Customizador de Avatar</span>
          </button>
          <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#04D361] animate-ping" />
            <span>METAMORFOSE 3-STAGE ENGINE ACTIVE</span>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 font-mono text-xs text-[#00E5FF] font-bold mb-3 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <span>🐾 SELEÇÃO OFICIAL DE STARTERS // 3 ESTÁGIOS DE EVOLUÇÃO</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-heading font-black text-white tracking-tight mb-2">
          Adote Seu Monstrinho Guardião
        </h2>
        <p className="font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed">
          Cada criatura é o avatar vivo de uma linguagem de programação. Ele te acompanhará nas batalhas de código, 
          ganhará XP com seus acertos e <strong className="text-[#04D361]">sofrerá metamorfose em 3 estágios</strong> conforme você avança na carreira!
        </p>
      </div>

      {/* Grid de Seleção dos 3 Starters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {CANONICAL_STARTERS.map((starter) => {
          const isSelected = starter.id === selectedStarterId;
          return (
            <div
              key={starter.id}
              onClick={() => handleSelectStarter(starter.id)}
              className={`cursor-pointer rounded-2xl border p-5 transition-all duration-300 relative overflow-hidden ${
                isSelected
                  ? 'bg-[#0E172E] border-[#00E5FF] shadow-[0_0_30px_rgba(0,229,255,0.3)] scale-[1.02]'
                  : 'bg-[#070D1E]/80 border-slate-800 hover:border-slate-600 hover:bg-[#0B1224]'
              }`}
            >
              {/* Glow de Fundo */}
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ background: starter.color }}
              />

              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl select-none animate-bounce" style={{ animationDuration: '3s' }}>
                  {starter.stages[0].icon}
                </span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                  style={{
                    backgroundColor: `${starter.color}15`,
                    borderColor: `${starter.color}40`,
                    color: starter.color,
                  }}
                >
                  {starter.type}
                </span>
              </div>

              <h3 className="text-xl font-heading font-black text-white mb-0.5">{starter.name}</h3>
              <div className="text-xs font-mono text-zinc-400 mb-3">{starter.language}</div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-4">{starter.stages[0].lore}</p>

              {/* Passiva */}
              <div className="p-2.5 rounded-xl bg-[#030611] border border-white/5 text-[11px] font-mono">
                <span className="text-amber-300 font-bold">{starter.passiveName}: </span>
                <span className="text-zinc-400">{starter.passiveDesc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Painel Central: Inspecionar os 3 Estágios de Evolução do Starter Ativo */}
      <div className="rounded-3xl border-2 border-cyan-900/60 bg-[#060B1A]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-950 pb-4 mb-6 gap-4">
          <div>
            <div className="text-[10px] font-mono text-[#00E5FF] font-bold uppercase tracking-wider">
              INSPECTOR DE METAMORFOSE // {activeStarter.name.toUpperCase()}
            </div>
            <h4 className="text-2xl font-heading font-black text-white">
              Árvore Evolutiva de {activeStarter.name}
            </h4>
          </div>

          {/* Abas dos 3 Estágios */}
          <div className="flex items-center gap-2 bg-[#030611] p-1.5 rounded-xl border border-cyan-900/40">
            {[1, 2, 3].map((st) => {
              const stageNum = st as 1 | 2 | 3;
              const isStageActive = selectedStage === stageNum;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelectStage(stageNum)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                    isStageActive
                      ? 'bg-gradient-to-r from-[#00E5FF] to-[#04D361] text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Estágio {st} {st === 1 ? '(Nv. 1)' : st === 2 ? '(Nv. 10)' : '(Nv. 25)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalhes do Estágio Selecionado */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Avatar Holográfico do Estágio */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#030611] border border-cyan-500/30 relative shadow-inner">
            <div className="relative my-4">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 blur-xl animate-pulse" />
              <span className="relative text-7xl select-none block animate-bounce" style={{ animationDuration: '2.5s' }}>
                {activeStageData.icon}
              </span>
            </div>
            <div className="text-sm font-heading font-black text-white mt-2">{activeStageData.title}</div>
            <div className="text-[10px] font-mono text-[#00E5FF] mt-1 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-800">
              Desbloqueia no Nível {activeStageData.levelReq}
            </div>
          </div>

          {/* Lore e Habilidade */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-4">
            <div>
              <h5 className="font-mono text-xs text-zinc-400 uppercase tracking-wider mb-1">
                Lore do Estágio {selectedStage}:
              </h5>
              <p className="font-sans text-sm text-zinc-200 leading-relaxed bg-[#0B1021] p-4 rounded-xl border border-white/5">
                {activeStageData.lore}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0B1224] border border-cyan-900/40">
                <div className="text-[10px] font-mono text-zinc-400 mb-1">HABILIDADE ASSINATURA:</div>
                <div className="text-sm font-heading font-black text-[#00E5FF] flex items-center gap-1.5">
                  <span>⚡</span> {activeStageData.signatureSkill}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B1224] border border-emerald-900/40">
                <div className="text-[10px] font-mono text-zinc-400 mb-1">PODER DE IMPACTO:</div>
                <div className="text-sm font-heading font-black text-[#04D361]">
                  PWR {activeStageData.skillPower} / 100
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Confirmação & Nickname do Pet */}
      <div className="rounded-2xl border border-cyan-800 bg-[#070D1E] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="font-mono text-xs text-cyan-400 font-semibold whitespace-nowrap">
            APELIDO DO PET:
          </label>
          <input
            type="text"
            value={customPetName}
            onChange={(e) => setCustomPetName(e.target.value)}
            placeholder={`Apelido (Padrão: ${activeStarter.name})`}
            maxLength={16}
            className="w-full md:w-64 rounded-lg border border-cyan-800 bg-[#030611] px-3.5 py-2 font-mono text-xs text-white focus:border-[#00E5FF] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#04D361] bg-[#04D361] hover:bg-emerald-400 px-8 py-3.5 font-heading font-black text-xs text-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer"
        >
          <span>ADOTAR {activeStarter.name.toUpperCase()} & INICIAR AVENTURA →</span>
        </button>
      </div>
    </div>
  );
};
