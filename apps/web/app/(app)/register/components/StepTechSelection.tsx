'use client';

import React, { useMemo } from 'react';
import {
  CAREER_GOAL_MAP,
  CareerGoal,
  isTechRecommendedForGoals,
  PRIMARY_TECHNOLOGIES,
  PrimaryTechId,
} from '../data/registrationOptions';

interface StepTechSelectionProps {
  careerGoals: CareerGoal[];
  primaryTechnology: PrimaryTechId;
  setPrimaryTechnology: (tech: PrimaryTechId) => void;
  onPrev: () => void;
  onNext: () => void;
}

function formatGoalTitles(titles: string[]): string {
  if (titles.length === 0) return 'seus objetivos';
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} e ${titles[1]}`;
  return `${titles.slice(0, -1).join(', ')} e ${titles[titles.length - 1]}`;
}

const TECH_MONOGAM_ACCENT: Record<PrimaryTechId, string> = {
  javascript: 'bg-[#F7DF1E]/15 border-[#F7DF1E]/40 text-[#F7DF1E]',
  typescript: 'bg-[#3178C6]/20 border-[#3178C6]/50 text-[#60A5FA]',
  python: 'bg-[#3776AB]/20 border-[#3776AB]/50 text-[#60A5FA]',
  'react-nextjs': 'bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF]',
  nodejs: 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]',
  java: 'bg-[#F89820]/15 border-[#F89820]/40 text-[#FBBF24]',
  csharp: 'bg-[#A379FF]/15 border-[#A379FF]/40 text-[#A379FF]',
  go: 'bg-[#00ADD8]/15 border-[#00ADD8]/40 text-[#38BDF8]',
  'sql-data': 'bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF]',
  'docker-cloud': 'bg-[#2496ED]/15 border-[#2496ED]/40 text-[#38BDF8]',
  'mobile-rn-flutter': 'bg-[#02569B]/20 border-[#38BDF8]/40 text-[#38BDF8]',
  rust: 'bg-[#F97316]/15 border-[#F97316]/40 text-[#FB923C]',
  php: 'bg-[#777BB4]/20 border-[#777BB4]/50 text-[#A5B4FC]',
  undecided: 'bg-[#8257E5]/20 border-[#8257E5]/50 text-[#A379FF]',
};

export const StepTechSelection: React.FC<StepTechSelectionProps> = ({
  careerGoals,
  primaryTechnology,
  setPrimaryTechnology,
  onPrev,
  onNext,
}) => {
  const effectiveGoals: CareerGoal[] = useMemo(
    () => (careerGoals.length > 0 ? careerGoals : ['fullstack']),
    [careerGoals],
  );

  const selectedGoalTitles = useMemo(
    () =>
      effectiveGoals
        .map((id) => CAREER_GOAL_MAP[id]?.title)
        .filter((title): title is string => Boolean(title)),
    [effectiveGoals],
  );

  const goalsLabel = formatGoalTitles(selectedGoalTitles);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Stitch */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8257E5]/15 border border-[#8257E5]/30 text-[#A379FF] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          💻 Linguagem &amp; Tecnologia Principal
        </div>
        <h1 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
          Qual linguagem ou tecnologia você quer focar?
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
          Destacamos as opções que combinam com seus objetivos (
          <strong className="text-white">{goalsLabel}</strong>), com liberdade de escolha ou decisão
          autônoma da IA.
        </p>
      </div>

      {/* Grid de Tecnologias */}
      <fieldset className="border-0 p-0 m-0">
        <legend className="sr-only">Selecione sua linguagem ou tecnologia principal</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {PRIMARY_TECHNOLOGIES.map((tech) => {
            const isSelected = primaryTechnology === tech.id;
            const isGoalMatch = isTechRecommendedForGoals(tech, effectiveGoals);
            const isAiDecide = tech.id === 'undecided';

            if (isAiDecide) {
              return (
                <button
                  key={tech.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setPrimaryTechnology(tech.id)}
                  className={
                    isSelected
                      ? 'sm:col-span-2 p-5 rounded-2xl bg-gradient-to-r from-[#8257E5]/25 via-[#181C2C] to-[#00E5FF]/20 border-2 border-[#8257E5] shadow-[0_0_30px_rgba(130,87,229,0.3)] flex items-start gap-4 cursor-pointer text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]'
                      : 'sm:col-span-2 p-5 rounded-2xl bg-gradient-to-r from-[#8257E5]/20 via-[#181C2C] to-[#00E5FF]/15 border-2 border-[#8257E5]/60 hover:border-[#8257E5] shadow-[0_0_30px_rgba(130,87,229,0.2)] flex items-start gap-4 cursor-pointer text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8257E5]'
                  }
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8257E5] to-[#00E5FF] p-0.5 shrink-0">
                    <div className="w-full h-full bg-[#07080C] rounded-[10px] flex items-center justify-center overflow-hidden">
                      <img
                        src="/images/onboarding/lumi-tutor.png"
                        alt="Tutora IA"
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-bold text-white">{tech.title}</span>
                      {isSelected ? (
                        <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/15 px-2.5 py-0.5 rounded-full border border-[#00E5FF]/40 font-bold shrink-0">
                          ★ Selecionado
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-0.5 rounded-full border border-[#00E5FF]/30 font-bold shrink-0">
                          ✨ Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{tech.desc}</p>
                  </div>
                </button>
              );
            }

            const monogramClass =
              TECH_MONOGAM_ACCENT[tech.id] ?? 'bg-[#111420] border-[#1C2133] text-[#00E5FF]';

            return (
              <button
                key={tech.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPrimaryTechnology(tech.id)}
                className={
                  isSelected
                    ? 'p-4 rounded-2xl bg-[#181C2C] border-2 border-[#8257E5] shadow-[0_0_20px_rgba(130,87,229,0.2)] flex items-start gap-4 cursor-pointer group text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]'
                    : 'p-4 rounded-2xl bg-[#181C2C]/70 border border-[#1C2133] hover:border-[#8257E5]/60 hover:bg-[#1E2338] transition-all flex items-start gap-4 cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8257E5]'
                }
              >
                <div
                  aria-hidden="true"
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${monogramClass}`}
                >
                  {tech.badge}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span
                      className={`text-sm font-bold leading-snug ${
                        isSelected ? 'text-white' : 'text-white group-hover:text-[#A379FF]'
                      }`}
                    >
                      {tech.title}
                    </span>

                    {isSelected ? (
                      <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded font-bold shrink-0">
                        ★ Selecionado
                      </span>
                    ) : isGoalMatch ? (
                      <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded shrink-0">
                        ✦ Recomendado
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#111420] px-2 py-0.5 rounded border border-[#1C2133] shrink-0">
                        {tech.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{tech.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Rodapé de Ações */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[#1C2133]">
        <button
          type="button"
          onClick={onPrev}
          className="text-xs font-mono text-[#94A3B8] hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer py-2.5 px-3 rounded-xl bg-transparent border-0"
        >
          ← Voltar para Objetivos
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-[#8257E5] hover:bg-[#9366f0] text-white font-semibold text-sm shadow-[0_0_25px_rgba(130,87,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          <span>Ver Trilha Personalizada</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
