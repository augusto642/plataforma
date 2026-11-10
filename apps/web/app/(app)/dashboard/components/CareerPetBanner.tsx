'use client';

/**
 * CareerPetBanner.tsx
 * NEXUS CODE - Student Dashboard Career Progression & Pet Companion Banner
 * 
 * Exibe no Dashboard:
 * 1. O Nível de Carreira Ativo (Iniciante liberado, Júnior/Pleno/Sênior bloqueados)
 * 2. O Pet Companion adotado pelo aluno, barra de XP, nível e estágio evolutivo
 * 3. Botão para treinar o Pet com tarefas de código
 * 4. Modal/Gaveta para consultar as atividades detalhadas de cada nível da carreira
 */

import React, { useState } from 'react';
import { useGameStore, StarterCreature } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface ActivityInfo {
  icon: string;
  name: string;
  desc: string;
}

interface TierInfo {
  id: 'beginner' | 'junior' | 'mid' | 'senior';
  title: string;
  tagline: string;
  badge: string;
  unlocked: boolean;
  unlockRequirement: string;
  color: string;
  activities: ActivityInfo[];
}

const CAREER_TIERS_DATA: TierInfo[] = [
  {
    id: 'beginner',
    title: 'Iniciante (Liberado)',
    tagline: 'Fundamentos de Algoritmos e Criaturas de Código',
    badge: 'EM ANDAMENTO',
    unlocked: true,
    unlockRequirement: 'Acesso imediato concedido no onboarding',
    color: '#04D361',
    activities: [
      { icon: '🎮', name: 'Mundo 2D & Exploração', desc: 'Explorar mapas laboratoriais e interagir com nós didáticos interativos.' },
      { icon: '🐾', name: 'Adoção & Treino do Pet', desc: 'Adotar um Starter companion (Pythox, Scripty, Gopherus ou Rustor).' },
      { icon: '⚡', name: 'Batalhas de Bugs', desc: 'Digitar ataques de sintaxe e consertar pequenos erros de tipagem e lógica.' },
      { icon: '🧩', name: 'Algoritmos Essenciais', desc: 'Variáveis, condicionais, loops e coleções básicas de dados.' },
      { icon: '🛡️', name: 'Metamorfose do Pet', desc: 'Evoluir o Pet até o Nível 10 para desbloquear a patente Júnior.' },
      { icon: '🤖', name: 'Consultas ao Mascote Lumi', desc: 'Tirar dúvidas socráticas sem receber respostas prontas.' },
      { icon: '🏆', name: 'Primeira Insígnia', desc: 'Bater o chefe do Setor 1 e provar raciocínio computacional sólido.' },
    ],
  },
  {
    id: 'junior',
    title: 'Desenvolvedor Júnior',
    tagline: 'Estruturas de Dados, APIs e Engenharia Prática',
    badge: 'BLOQUEADO',
    unlocked: false,
    unlockRequirement: 'Requer Pet Companion no Nível 10 (Estágio 2)',
    color: '#00E5FF',
    activities: [
      { icon: '📚', name: 'Estruturas de Dados Avançadas', desc: 'Pilhas, Filas, Hash Maps e Árvores Binárias de Busca.' },
      { icon: '🔌', name: 'APIs RESTful & NestJS', desc: 'Criação de rotas, DTOs com class-validator e controle de status HTTP.' },
      { icon: '🐘', name: 'Bancos de Dados & Prisma', desc: 'Modelagem relacional PostgreSQL, índices e queries eficientes.' },
      { icon: '🧪', name: 'Testes Unitários Automatizados', desc: 'Cobertura de código com Jest/Vitest e testes orientados a bugs.' },
      { icon: '🐙', name: 'Git Flow & Gitea CLI', desc: 'Commits semânticos, branches de feature e abertura de Pull Requests.' },
    ],
  },
  {
    id: 'mid',
    title: 'Desenvolvedor Pleno',
    tagline: 'Concorrência, Filas e Otimização de Performance',
    badge: 'BLOQUEADO',
    unlocked: false,
    unlockRequirement: 'Requer Nível Geral 30 e Certificação Júnior',
    color: '#8257E5',
    activities: [
      { icon: '⚡', name: 'Concorrência & I/O Assíncrono', desc: 'Event Loop, Workers, Goroutines e canais de sincronização.' },
      { icon: '📦', name: 'Filas em Background (BullMQ/Redis)', desc: 'Processamento assíncrono de jobs, retries e Dead Letter Queues.' },
      { icon: '🐳', name: 'Containerização & Docker Compose', desc: 'Multi-stage builds, redes isoladas e orquestração local de serviços.' },
      { icon: '⏱️', name: 'Otimização de Latência P99', desc: 'Cache em dois níveis, profiling de queries e pool de conexões.' },
      { icon: '👥', name: 'Code Review Crítico', desc: 'Revisão técnica de PRs, sugestões de arquitetura e mitigação de débitos.' },
    ],
  },
  {
    id: 'senior',
    title: 'Desenvolvedor Sênior',
    tagline: 'Sistemas Distribuídos, Resiliência e Liderança',
    badge: 'BLOQUEADO',
    unlocked: false,
    unlockRequirement: 'Requer Nível Geral 50 e Mestrado de Batalha',
    color: '#FFA116',
    activities: [
      { icon: '🌐', name: 'Sistemas Distribuídos & Event-Driven', desc: 'Idempotência, saga pattern, outbox pattern e consistência eventual.' },
      { icon: '🛡️', name: 'AppSec & Sandboxing Seguro', desc: 'Isolamento de containers via cgroups-v2, seccomp e defesa OWASP Top 10.' },
      { icon: '📊', name: 'Observabilidade Total', desc: 'Métricas Prometheus, traces distribuídos OpenTelemetry e dashboards Grafana.' },
      { icon: '📐', name: 'Design de Arquitetura & RFCs', desc: 'Elaboração de Architecture Decision Records (ADRs) e tradeoffs técnicos.' },
      { icon: '💎', name: 'Mentoria & Supervisão Técnica', desc: 'Capacitação do time, gestão de incidentes críticos e governança de código.' },
    ],
  },
];

export const CareerPetBanner: React.FC = () => {
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedTierForModal, setSelectedTierForModal] = useState<TierInfo>(CAREER_TIERS_DATA[0]);

  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const petLevel = useGameStore((s) => s.petLevel);
  const petXp = useGameStore((s) => s.petXp);
  const petMaxXp = useGameStore((s) => s.petMaxXp);
  const petStage = useGameStore((s) => s.petStage);
  const petStageTitle = useGameStore((s) => s.petStageTitle);
  const addPetXp = useGameStore((s) => s.addPetXp);

  const audio = AudioSynthesizer.getInstance();

  const handleTrainPet = () => {
    void audio.playTone({ frequency: 540, pitchBendTo: 800, duration: 0.12, type: 'triangle' });
    addPetXp(150);
  };

  const openTierDetails = (tier: TierInfo) => {
    setSelectedTierForModal(tier);
    setShowActivitiesModal(true);
  };

  const xpPercent = Math.min(100, Math.round((petXp / petMaxXp) * 100));

  return (
    <div className="space-y-4">
      {/* CARD PRINCIPAL EM DARK OBSIDIAN */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0C1226]/95 via-[#080B18]/95 to-[#130E29]/95 border border-[#1E2945] p-5 md:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glows Decorativos de Fundo */}
        <div
          className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: selectedStarter.color }}
        />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl bg-[#00E5FF]/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* LADO ESQUERDO: PET COMPANION STATUS */}
          <div className="flex items-center gap-4 sm:gap-5 flex-1">
            {/* Sprite / Avatar do Pet com Efeito Holográfico */}
            <div className="relative group cursor-pointer" onClick={handleTrainPet} title="Clique para treinar o Pet (+150 XP)">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl border-2 transition-transform duration-300 group-hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: `${selectedStarter.color}15`,
                  borderColor: `${selectedStarter.color}60`,
                  boxShadow: `0 0 25px ${selectedStarter.color}30`,
                }}
              >
                <span className="select-none group-hover:animate-bounce" style={{ animationDuration: '1s' }}>
                  {selectedStarter.icon}
                </span>
              </div>
              <span
                className="absolute -bottom-2 -right-1 font-mono text-[10px] font-black px-1.5 py-0.5 rounded-full border shadow-md"
                style={{
                  backgroundColor: '#070B18',
                  borderColor: selectedStarter.color,
                  color: selectedStarter.color,
                }}
              >
                E{petStage}
              </span>
            </div>

            {/* Informações do Pet */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading font-black text-lg sm:text-xl text-white tracking-wide">
                  {selectedStarter.nickname || selectedStarter.name}
                </span>
                <span
                  className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `${selectedStarter.color}20`,
                    borderColor: `${selectedStarter.color}40`,
                    color: selectedStarter.color,
                  }}
                >
                  {selectedStarter.languageTrack} • {petStageTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#00E5FF]/15 text-[#00E5FF] font-mono text-[11px] font-bold border border-[#00E5FF]/30">
                  Nível {petLevel}
                </span>
              </div>

              <p className="text-xs text-zinc-400 font-sans max-w-md hidden sm:block line-clamp-1">
                <span className="text-[#04D361] font-semibold">Passiva:</span> {selectedStarter.passiveName} — {selectedStarter.passiveDescription}
              </p>

              {/* Barra de XP do Pet */}
              <div className="pt-1 w-56 sm:w-72 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-zinc-400">Progresso de Evolução:</span>
                  <span className="text-[#04D361] font-bold">
                    {petXp} / {petMaxXp} XP ({xpPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#050814] overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${xpPercent}%`,
                      background: `linear-gradient(90deg, ${selectedStarter.color}, #04D361)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: TRILHA DE CARREIRA E DESBLOQUEIOS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Indicador do Nível Iniciante Ativo */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#070B18]/80 border border-[#04D361]/30 shadow-[0_0_20px_rgba(4,211,97,0.15)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#04D361] animate-pulse" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-mono">NÍVEL ATIVO: INICIANTE</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30">
                    LIBERADO
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  Meta Júnior: Pet Nível 10 ({petLevel}/10)
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTrainPet}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#04D361] to-[#00B37E] hover:from-[#00E5FF] hover:to-[#04D361] text-zinc-950 font-bold font-mono text-xs transition-all duration-300 shadow-[0_0_15px_rgba(4,211,97,0.3)] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                title="Simular resolução de desafio de código para treinar o Pet"
              >
                <span>⚡</span>
                <span>Treinar Pet (+150 XP)</span>
              </button>

              <button
                type="button"
                onClick={() => openTierDetails(CAREER_TIERS_DATA[0])}
                className="px-3.5 py-2.5 rounded-xl bg-[#141B32] hover:bg-[#1C2646] border border-[#2B3B66] text-white font-mono text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                title="Ver atividades de todos os 4 níveis de carreira"
              >
                <span>📋</span>
                <span className="hidden xs:inline">Atividades da Carreira</span>
              </button>
            </div>

          </div>

        </div>

        {/* MINI STEPPER DOS 4 NÍVEIS DE CARREIRA */}
        <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {CAREER_TIERS_DATA.map((tier) => {
            const isBeginner = tier.id === 'beginner';
            return (
              <div
                key={tier.id}
                onClick={() => openTierDetails(tier)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left flex items-center justify-between ${
                  isBeginner
                    ? 'bg-[#04D361]/10 border-[#04D361]/40 shadow-[0_0_15px_rgba(4,211,97,0.1)] hover:bg-[#04D361]/15'
                    : 'bg-[#060914]/60 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-200">
                      {tier.title.split(' ')[0]}
                    </span>
                    {isBeginner ? (
                      <span className="text-[9px] font-mono text-[#04D361] font-bold">✓ Ativo</span>
                    ) : (
                      <span className="text-[9px] font-mono text-zinc-500">🔒 Bloq.</span>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400 font-mono mt-0.5 line-clamp-1">
                    {tier.activities.length} Atividades Didáticas
                  </p>
                </div>
                <span className="text-xs text-zinc-500 hover:text-white">➔</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE CONSULTA DE ATIVIDADES DE CARREIRA */}
      {showActivitiesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl rounded-3xl bg-[#090D1C] border border-[#1F2B48] shadow-2xl p-6 md:p-8 relative overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#141B32] border border-[#2B3B66] flex items-center justify-center text-xl">
                  💼
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg sm:text-xl text-white">
                    Plano de Atividades por Nível de Carreira
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Conheça todas as atividades práticas exigidas em cada estágio do NEXUS CODE
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActivitiesModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-mono transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Abas de Navegação entre os 4 Níveis */}
            <div className="grid grid-cols-4 gap-2 pt-4 pb-2">
              {CAREER_TIERS_DATA.map((tier) => {
                const isSelected = selectedTierForModal.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTierForModal(tier)}
                    className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#1C2646] text-white border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                        : 'bg-[#070B18] text-zinc-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <span>{tier.unlocked ? '🔓' : '🔒'}</span>
                    <span className="hidden sm:inline">{tier.title.split(' ')[0]}</span>
                    <span className="sm:hidden">{tier.id.slice(0, 3).toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Conteúdo do Nível Selecionado */}
            <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
              <div
                className="p-4 rounded-2xl border"
                style={{
                  backgroundColor: `${selectedTierForModal.color}0D`,
                  borderColor: `${selectedTierForModal.color}35`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-xs font-black uppercase px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${selectedTierForModal.color}25`,
                      color: selectedTierForModal.color,
                    }}
                  >
                    {selectedTierForModal.badge}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    {selectedTierForModal.unlockRequirement}
                  </span>
                </div>
                <h4 className="font-heading font-black text-base sm:text-lg text-white mt-2">
                  {selectedTierForModal.title}
                </h4>
                <p className="text-xs text-zinc-300 font-sans mt-0.5">
                  {selectedTierForModal.tagline}
                </p>
              </div>

              {/* Lista de Atividades do Nível */}
              <div className="space-y-2.5">
                <h5 className="font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Atividades Práticas a Realizar ({selectedTierForModal.activities.length}):
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedTierForModal.activities.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#070A18] border border-white/5 hover:border-white/15 transition-all flex items-start gap-3"
                    >
                      <span className="text-xl shrink-0 p-1 rounded-lg bg-white/5">{act.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white font-sans">{act.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{act.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs font-mono text-zinc-500">
                {selectedTierForModal.unlocked
                  ? '✨ Nível atual ativo no seu perfil.'
                  : '🔒 Evolua seu Pet e complete missões para desbloquear.'}
              </span>
              <button
                type="button"
                onClick={() => setShowActivitiesModal(false)}
                className="px-5 py-2 rounded-xl bg-[#141B32] hover:bg-[#1C2646] text-white text-xs font-mono font-bold transition-all"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
