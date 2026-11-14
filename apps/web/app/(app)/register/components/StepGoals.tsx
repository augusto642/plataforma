'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CAREER_GOAL_GROUPS,
  CAREER_GOAL_MAP,
  CAREER_GOALS,
  CareerGoal,
  CareerGoalGroupId,
  TIME_COMMITMENTS,
  TimeCommitment,
} from '../data/registrationOptions';

export type { CareerGoal, TimeCommitment };

interface StepGoalsProps {
  timeCommitment: TimeCommitment;
  setTimeCommitment: (time: TimeCommitment) => void;
  careerGoals: CareerGoal[];
  setCareerGoals: (goals: CareerGoal[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

type FilterValue = 'all' | CareerGoalGroupId;

export const StepGoals: React.FC<StepGoalsProps> = ({
  timeCommitment,
  setTimeCommitment,
  careerGoals,
  setCareerGoals,
  onPrev,
  onNext,
}) => {
  const [activeGroup, setActiveGroup] = useState<FilterValue>('all');
  const [minGoalWarning, setMinGoalWarning] = useState<boolean>(false);

  useEffect(() => {
    if (!minGoalWarning) return;
    const timer = window.setTimeout(() => setMinGoalWarning(false), 4000);
    return () => window.clearTimeout(timer);
  }, [minGoalWarning]);

  const groupCounts = useMemo(() => {
    return CAREER_GOALS.reduce<Record<CareerGoalGroupId, number>>(
      (acc, goal) => {
        acc[goal.group] = (acc[goal.group] ?? 0) + 1;
        return acc;
      },
      {
        dev_web: 0,
        ai_data: 0,
        cloud_infra: 0,
        specialties: 0,
        career_product: 0,
      },
    );
  }, []);

  const visibleGoals = useMemo(() => {
    if (activeGroup === 'all') return CAREER_GOALS;
    return CAREER_GOALS.filter((goal) => goal.group === activeGroup);
  }, [activeGroup]);

  const handleToggleGoal = (goalId: CareerGoal) => {
    const isAlreadySelected = careerGoals.includes(goalId);
    if (isAlreadySelected) {
      if (careerGoals.length <= 1) {
        setMinGoalWarning(true);
        return;
      }
      setMinGoalWarning(false);
      setCareerGoals(careerGoals.filter((id) => id !== goalId));
      return;
    }

    setMinGoalWarning(false);
    setCareerGoals([...careerGoals, goalId]);
  };

  const handlePromotePrimary = (goalId: CareerGoal) => {
    if (careerGoals[0] === goalId) return;
    setMinGoalWarning(false);
    setCareerGoals([goalId, ...careerGoals.filter((id) => id !== goalId)]);
  };

  const selectedCount = careerGoals.length;
  const countLabel = `${selectedCount} ${selectedCount === 1 ? 'selecionado' : 'selecionados'}`;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Stitch */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          🎯 Objetivos &amp; Ritmo de Estudo
        </div>
        <h1 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
          Onde você quer chegar e qual seu ritmo?
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
          Você pode marcar <strong className="text-white">mais de uma opção</strong> abaixo —
          combinaremos seus objetivos na sua trilha personalizada.
        </p>
      </div>

      {/* Seção 1: Objetivos de Carreira (Multi-seleção + Filtro de Grupos) */}
      <fieldset className="border-0 p-0 m-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-2 p-0">
            <span>Áreas de Atuação</span>
            <span className="text-[11px] font-normal normal-case text-[#64748B]">
              ({CAREER_GOALS.length} opções)
            </span>
          </legend>

          <span
            aria-live="polite"
            className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#8257E5]/20 border border-[#8257E5]/40 text-[#A379FF]"
          >
            {countLabel}
          </span>
        </div>

        {/* Barra de resumo rápido dos objetivos marcados */}
        <div className="rounded-xl px-3.5 py-2.5 bg-[#0C0E15] border border-[#1C2133] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-[#94A3B8] mr-1">Escolhidos:</span>
          {careerGoals.map((goalId, index) => {
            const goalInfo = CAREER_GOAL_MAP[goalId];
            if (!goalInfo) return null;
            const isPrimary = index === 0;
            return (
              <div
                key={goalId}
                className={
                  isPrimary
                    ? 'inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/35 text-[#00E5FF]'
                    : 'inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#8257E5]/20 border border-[#8257E5]/40 text-[#A379FF]'
                }
              >
                <button
                  type="button"
                  onClick={() => handlePromotePrimary(goalId)}
                  title={isPrimary ? 'Objetivo principal atual' : 'Definir como objetivo principal'}
                  aria-label={
                    isPrimary
                      ? `${goalInfo.title} (Objetivo principal)`
                      : `Definir ${goalInfo.title} como objetivo principal`
                  }
                  className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer focus-visible:outline-none focus-visible:underline"
                >
                  <span aria-hidden="true">{isPrimary ? '★' : '✓'}</span>
                  <span aria-hidden="true">{goalInfo.icon}</span>
                  <span>{goalInfo.title}</span>
                </button>
                {careerGoals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleToggleGoal(goalId)}
                    aria-label={`Remover objetivo ${goalInfo.title}`}
                    className="bg-transparent border-0 p-0 ml-1 text-inherit opacity-75 hover:opacity-100 cursor-pointer leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <span className="text-[11px] font-mono text-[#64748B] ml-auto hidden sm:inline">
            ★ Clique em um item para definir como foco principal
          </span>
        </div>

        {/* Aviso amigável de mínimo de 1 objetivo */}
        {minGoalWarning && (
          <div
            role="status"
            aria-live="polite"
            className="px-3.5 py-2.5 rounded-xl text-xs bg-[#F59E0B]/10 border border-[#F59E0B]/40 text-[#FDE68A] flex items-center gap-2"
          >
            <span aria-hidden="true">💡</span>
            <span>
              Mantenha pelo menos <strong>1 objetivo selecionado</strong> para personalizarmos sua
              trilha. Marque outra área antes de desmarcar esta.
            </span>
          </div>
        )}

        {/* Pílulas de filtro por categoria */}
        <div
          role="group"
          aria-label="Filtrar áreas por categoria"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            aria-pressed={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
            className={
              activeGroup === 'all'
                ? 'px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-[#8257E5]/25 border border-[#8257E5] text-white cursor-pointer transition-all'
                : 'px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[#0C0E15] border border-[#1C2133] text-[#94A3B8] hover:border-[#8257E5]/50 hover:text-white cursor-pointer transition-all'
            }
          >
            Todas ({CAREER_GOALS.length})
          </button>

          {CAREER_GOAL_GROUPS.map((group) => {
            const isActive = activeGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveGroup(group.id)}
                className={
                  isActive
                    ? 'px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-[#8257E5]/25 border border-[#8257E5] text-white cursor-pointer transition-all'
                    : 'px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[#0C0E15] border border-[#1C2133] text-[#94A3B8] hover:border-[#8257E5]/50 hover:text-white cursor-pointer transition-all'
                }
              >
                {group.label} ({groupCounts[group.id]})
              </button>
            );
          })}
        </div>

        {/* Grid de objetivos no estilo Stitch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
          {visibleGoals.map((item) => {
            const selectedIndex = careerGoals.indexOf(item.id);
            const isSelected = selectedIndex !== -1;
            const isPrimary = selectedIndex === 0;

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleToggleGoal(item.id)}
                className={
                  isSelected
                    ? 'p-4 rounded-2xl bg-[#181C2C] border-2 border-[#8257E5] shadow-[0_0_20px_rgba(130,87,229,0.2)] flex items-start gap-3.5 cursor-pointer text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]'
                    : 'p-4 rounded-2xl bg-[#181C2C]/50 border border-[#1C2133] hover:border-[#8257E5]/50 flex items-start gap-3.5 cursor-pointer text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8257E5]'
                }
              >
                <div
                  aria-hidden="true"
                  className={
                    isSelected
                      ? 'w-10 h-10 rounded-xl bg-[#8257E5]/20 border border-[#8257E5]/40 flex items-center justify-center text-lg shrink-0'
                      : 'w-10 h-10 rounded-xl bg-[#111420] border border-[#1C2133] flex items-center justify-center text-lg shrink-0'
                  }
                >
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white leading-snug">
                      {item.title}
                    </span>

                    {isPrimary ? (
                      <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/30 font-bold shrink-0">
                        ★ Principal
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30 font-semibold shrink-0">
                        ✓ Selecionado
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#94A3B8] bg-[#111420] px-2 py-0.5 rounded border border-[#1C2133] shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Seletor de Ritmo Stitch */}
      <fieldset className="p-4 rounded-2xl bg-[#0C0E15] border border-[#1C2133] space-y-3 m-0">
        <legend className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold block p-0">
          Tempo de Dedicação Semanal
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIME_COMMITMENTS.map((item) => {
            const isSelected = timeCommitment === item.id;
            const isRecommended = item.id === '10h';

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setTimeCommitment(item.id)}
                className={
                  isSelected
                    ? 'p-3 rounded-xl border-2 border-[#8257E5] bg-[#8257E5]/15 text-left cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]'
                    : 'p-3 rounded-xl bg-[#181C2C] border border-[#1C2133] hover:border-[#8257E5]/50 text-left cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8257E5]'
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span aria-hidden="true">{item.icon}</span>
                    {item.title}
                  </span>
                  {isRecommended && (
                    <span className="text-[10px] font-mono text-[#00E5FF] font-bold shrink-0">
                      Recomendado
                    </span>
                  )}
                </div>
                <div
                  className={`text-xs mt-0.5 leading-snug ${
                    isSelected ? 'text-[#A379FF]' : 'text-[#94A3B8]'
                  }`}
                >
                  {item.desc}
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
          ← Voltar para Experiência
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-[#8257E5] hover:bg-[#9366f0] text-white font-semibold text-sm shadow-[0_0_25px_rgba(130,87,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          <span>Escolher Stack &amp; Tech</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
