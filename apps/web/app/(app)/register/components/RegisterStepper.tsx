'use client';

import React from 'react';

interface RegisterStepperProps {
  currentStep: number;
  maxStep?: number;
  onSelectStep?: (step: number) => void;
}

const STEPS = [
  { num: 1, tag: 'Etapa 01', title: 'Credenciais' },
  { num: 2, tag: 'Etapa 02', title: 'Experiência' },
  { num: 3, tag: 'Etapa 03', title: 'Objetivo & Ritmo' },
  { num: 4, tag: 'Etapa 04', title: 'Stack & Tech' },
  { num: 5, tag: 'Etapa 05', title: 'Trilha IA' },
  { num: 6, tag: 'Etapa 06', title: 'Workspace' },
] as const;

export const RegisterStepper: React.FC<RegisterStepperProps> = ({
  currentStep,
  maxStep,
  onSelectStep,
}) => {
  const clampedStep = Math.min(Math.max(currentStep, 1), STEPS.length);
  const highestReached = Math.min(Math.max(maxStep ?? clampedStep, clampedStep), STEPS.length);

  return (
    <nav aria-label="Progresso do cadastro" className="w-full">
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 list-none p-0 m-0">
        {STEPS.map((step) => {
          const isActive = clampedStep === step.num;
          const isCompleted = clampedStep > step.num;
          const isFinalStepActive = isActive && step.num === 6;
          const canSelect =
            Boolean(onSelectStep) &&
            clampedStep < 6 &&
            !isActive &&
            step.num <= highestReached;

          const cardClasses = isFinalStepActive
            ? 'bg-[#111420] border-[#00E676] text-white shadow-[0_0_20px_rgba(0,230,116,0.3)] ring-1 ring-[#00E676]'
            : isActive
            ? 'bg-[#111420] border-[#8257E5] text-white shadow-[0_0_20px_rgba(130,87,229,0.3)] ring-1 ring-[#8257E5]'
            : isCompleted
            ? 'bg-[#0C0E15] border-[#00E676]/40 text-[#00E676]'
            : 'bg-[#0C0E15] border-[#1C2133] text-[#64748B]';

          const badgeClasses = isFinalStepActive
            ? 'bg-[#00E676] text-black'
            : isActive
            ? 'bg-[#8257E5] text-white'
            : isCompleted
            ? 'bg-[#00E676]/20 text-[#00E676]'
            : 'bg-[#181C2C] text-[#64748B]';

          const tagColorClass = isFinalStepActive
            ? 'text-[#00E676]'
            : isActive
            ? 'text-[#A379FF]'
            : isCompleted
            ? 'text-[#94A3B8]'
            : 'text-[#64748B]';

          const titleClasses = isActive
            ? 'text-xs font-bold truncate text-white'
            : isCompleted
            ? 'text-xs font-semibold truncate text-white'
            : 'text-xs font-medium truncate text-[#94A3B8]';

          const inner = (
            <>
              <div
                aria-hidden="true"
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${badgeClasses}`}
              >
                {isCompleted ? '✓' : step.num}
              </div>
              <div className="truncate min-w-0">
                <div className={`text-[10px] font-mono uppercase tracking-wider ${tagColorClass}`}>
                  {step.tag}
                </div>
                <div className={titleClasses} title={step.title}>
                  {step.title}
                </div>
              </div>
            </>
          );

          return (
            <li key={step.num} aria-current={isActive ? 'step' : undefined}>
              {canSelect ? (
                <button
                  type="button"
                  onClick={() => onSelectStep?.(step.num)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer hover:border-[#2D3552] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${cardClasses}`}
                  aria-label={`Ir para ${step.tag}: ${step.title}`}
                >
                  {inner}
                </button>
              ) : (
                <div
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${cardClasses}`}
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
