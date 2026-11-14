'use client';

import React, { useMemo } from 'react';
import {
  AssessedLevel,
  CAREER_GOAL_MAP,
  CareerGoal,
  CareerGoalOption,
  LevelEvaluationResult,
  PRIMARY_TECH_MAP,
  PrimaryTechId,
  PrimaryTechOption,
  TIME_COMMITMENT_MAP,
  TimeCommitment,
} from '../data/registrationOptions';

interface StepTrackSuggestionProps {
  evaluation: LevelEvaluationResult | null;
  careerGoals: CareerGoal[];
  timeCommitment: TimeCommitment;
  primaryTechnology: PrimaryTechId;
  onPrev: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

interface PersonalizedTrackSummary {
  stackTitle: string;
  stackSummary: string;
  marketFocus: string;
  practicalModules: string;
  challengeCalibration: string;
}

function buildPersonalizedTrack(params: {
  techInfo: PrimaryTechOption;
  primaryGoal: CareerGoalOption;
  secondaryGoals: CareerGoalOption[];
  assessedLevel: AssessedLevel;
  timeCommitment: TimeCommitment;
}): PersonalizedTrackSummary {
  const { techInfo, primaryGoal, secondaryGoals, assessedLevel, timeCommitment } = params;
  const hasGlobal =
    primaryGoal.id === 'global' || secondaryGoals.some((goal) => goal.id === 'global');
  const hasAi =
    primaryGoal.id === 'ai' ||
    primaryGoal.id === 'mlops' ||
    secondaryGoals.some((goal) => goal.id === 'ai' || goal.id === 'mlops');

  if (techInfo.id === 'undecided') {
    return {
      stackTitle: 'Tutora de IA selecionando a stack',
      stackSummary: hasAi
        ? 'Stack mista com TypeScript, React, Node.js e Python para automações com IA, APIs e mercado global.'
        : 'Stack progressiva com JavaScript, TypeScript, Node.js e Python calibrada para o seu objetivo.',
      marketFocus: hasGlobal
        ? 'Competências em alta demanda no Brasil e em vagas remotas em USD/EUR.'
        : 'Competências em alta demanda real no mercado técnico atual.',
      practicalModules: 'Módulos guiados com sandbox Docker dedicado e projetos progressivos.',
      challengeCalibration: `Missões calibradas para seu nível ${assessedLevel} (${timeCommitment === '20h' ? 'ritmo intensivo' : timeCommitment === '10h' ? 'ritmo acelerado' : 'ritmo gradual'}).`,
    };
  }

  return {
    stackTitle: techInfo.title,
    stackSummary: `${techInfo.desc} Integrada a projetos práticos alinhados a ${primaryGoal.title}.`,
    marketFocus: hasGlobal
      ? `Habilidades de ${techInfo.title} exigidas em entrevistas técnicas e times remotos globais.`
      : `Competências de ${techInfo.title} mais pedidas em vagas de ${primaryGoal.title}.`,
    practicalModules: `Módulos práticos em ${techInfo.title} com sandbox Docker dedicado e testes reais.`,
    challengeCalibration: `Desafios calibrados para o nível ${assessedLevel} no ritmo ${TIME_COMMITMENT_MAP[timeCommitment].title}.`,
  };
}

export const StepTrackSuggestion: React.FC<StepTrackSuggestionProps> = ({
  evaluation,
  careerGoals,
  timeCommitment,
  primaryTechnology,
  onPrev,
  onNext,
  isSubmitting = false,
}) => {
  const effectiveGoals: CareerGoal[] = careerGoals.length > 0 ? careerGoals : ['fullstack'];
  const selectedGoals = effectiveGoals
    .map((id) => CAREER_GOAL_MAP[id])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const primaryGoal = selectedGoals[0] ?? CAREER_GOAL_MAP.fullstack;
  const secondaryGoals = selectedGoals.slice(1);
  const timeInfo = TIME_COMMITMENT_MAP[timeCommitment];
  const techInfo = PRIMARY_TECH_MAP[primaryTechnology];
  const assessedLevel: AssessedLevel = evaluation?.level ?? 'Iniciante';

  const track = useMemo(
    () =>
      buildPersonalizedTrack({
        techInfo,
        primaryGoal,
        secondaryGoals,
        assessedLevel,
        timeCommitment,
      }),
    [assessedLevel, primaryGoal, secondaryGoals, techInfo, timeCommitment],
  );

  const feedbackText =
    evaluation?.feedback ??
    'Você interpretou com clareza o fluxo lógico inicial. Vamos estruturar sua base com prática guiada no navegador.';

  const goalsAlignmentText =
    secondaryGoals.length > 0
      ? `Alinhado a ${primaryGoal.title} e ${secondaryGoals.map((g) => g.title).join(', ')}`
      : `Alinhado a ${primaryGoal.title}`;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Stitch */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          ✨ Diagnóstico Concluído com Sucesso
        </div>
        <h1 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
          Sua trilha personalizada está pronta para ser gerada
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
          Combinamos seu desempenho no desafio com seus objetivos e tecnologias. Veja o resumo antes
          de liberar seu ambiente:
        </p>
      </div>

      {/* 3 Cards de Resumo Consolidado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Nível identificado pela IA */}
        <div className="p-5 rounded-2xl bg-[#0C0E15] border border-[#1C2133] space-y-3">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block">
            Nível Identificado pela IA
          </span>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF] font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" aria-hidden="true" />
            {assessedLevel}
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-4">{feedbackText}</p>
        </div>

        {/* Card 2: Objetivos escolhidos */}
        <div className="p-5 rounded-2xl bg-[#0C0E15] border border-[#1C2133] space-y-3 flex flex-col">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block">
            {selectedGoals.length > 1 ? 'Objetivos Escolhidos' : 'Objetivo Escolhido'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded bg-[#8257E5]/20 border border-[#8257E5]/40 text-[#A379FF] text-xs font-bold">
              ★ {primaryGoal.title}
            </span>
            {secondaryGoals.map((goal) => (
              <span
                key={goal.id}
                className="px-2 py-0.5 rounded bg-[#181C2C] border border-[#1C2133] text-[#94A3B8] text-xs"
              >
                {goal.title}
              </span>
            ))}
          </div>
          <div className="text-xs font-mono text-[#94A3B8] pt-1 mt-auto">
            Ritmo: <strong className="text-white">{timeInfo.title}</strong>
          </div>
        </div>

        {/* Card 3: Linguagem / Tecnologia */}
        <div className="p-5 rounded-2xl bg-[#0C0E15] border border-[#1C2133] space-y-3">
          <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block">
            Linguagem / Tecnologia
          </span>
          <div className="flex items-center gap-2">
            <img
              src="/images/onboarding/lumi-tutor.png"
              alt="Tutora IA"
              className="w-6 h-6 rounded border border-[#8257E5] object-cover shrink-0"
            />
            {primaryTechnology !== 'undecided' && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#8257E5]/20 border border-[#8257E5]/40 text-[#A379FF] shrink-0">
                {techInfo.badge}
              </span>
            )}
            <span className="text-xs font-bold text-white truncate">{track.stackTitle}</span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">{track.stackSummary}</p>
        </div>
      </div>

      {/* Box Processamento de Trilha Dinâmica */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#181C2C] via-[#111420] to-[#0C0E15] border border-[#8257E5]/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#A379FF] font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#8257E5]" aria-hidden="true" />
          Processamento de Trilha Dinâmica
        </div>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Assim que sua conta for confirmada, nossa Tutora de IA finaliza a montagem da sua trilha
          completa em até 2 dias e avisa no seu dashboard. A análise cruza:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#F1F5F9]">
          <div className="p-2.5 rounded-lg bg-[#07080C]/60 border border-[#1C2133]">
            <span className="text-[#00E5FF]">01 • Motivo &amp; Objetivo:</span> {goalsAlignmentText}
          </div>
          <div className="p-2.5 rounded-lg bg-[#07080C]/60 border border-[#1C2133]">
            <span className="text-[#00E676]">02 • Mercado &amp; Vagas:</span> {track.marketFocus}
          </div>
          <div className="p-2.5 rounded-lg bg-[#07080C]/60 border border-[#1C2133]">
            <span className="text-[#8257E5]">03 • Stack Prática:</span> {track.practicalModules}
          </div>
          <div className="p-2.5 rounded-lg bg-[#07080C]/60 border border-[#1C2133]">
            <span className="text-[#FFB800]">04 • Desafios:</span> {track.challengeCalibration}
          </div>
        </div>
      </div>

      {/* Rodapé de Ações */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[#1C2133]">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="text-xs font-mono text-[#94A3B8] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer py-2.5 px-3 rounded-xl bg-transparent border-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          ← Voltar para Escolha de Stack
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#8257E5] via-[#7146D1] to-[#00E5FF] hover:brightness-110 text-white font-bold text-sm shadow-[0_0_30px_rgba(130,87,229,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>
            {isSubmitting
              ? '⏳ Criando conta e provisionando…'
              : '⚡ Avançar para Inicialização do Workspace →'}
          </span>
        </button>
      </div>
    </div>
  );
};
