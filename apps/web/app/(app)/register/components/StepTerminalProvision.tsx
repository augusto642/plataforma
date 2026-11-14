'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AssessedLevel,
  CAREER_GOAL_MAP,
  CareerGoal,
  PRIMARY_TECH_MAP,
  PrimaryTechId,
  TIME_COMMITMENT_MAP,
  TimeCommitment,
} from '../data/registrationOptions';
import { getWorkspaceStarterTemplate } from '../../../lib/workspacePrefs';
import { useAuth } from '../../../context/AuthContext';
import { GameLoadingTransition } from './GameLoadingTransition';

interface StepTerminalProvisionProps {
  name: string;
  email: string;
  role: string;
  assessedLevel: AssessedLevel;
  timeCommitment: TimeCommitment;
  careerGoals: CareerGoal[];
  primaryTechnology: PrimaryTechId;
  onFinished: () => void;
}

const TIER_LABEL: Record<string, string> = {
  bronze: 'Liga Bronze',
  silver: 'Liga Prata',
  gold: 'Liga Ouro',
};

export const StepTerminalProvision: React.FC<StepTerminalProvisionProps> = ({
  name,
  email,
  assessedLevel,
  timeCommitment,
  careerGoals,
  primaryTechnology,
  onFinished,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [visibleLines, setVisibleLines] = useState<number>(1);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [showGameLoading, setShowGameLoading] = useState<boolean>(false);
  const finishedFiredRef = useRef<boolean>(false);

  const effectiveGoals: CareerGoal[] = careerGoals.length > 0 ? careerGoals : ['fullstack'];
  const selectedGoals = effectiveGoals
    .map((id) => CAREER_GOAL_MAP[id])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const goalsSummary = selectedGoals.map((goal) => goal.title).join(', ');
  const timeInfo = TIME_COMMITMENT_MAP[timeCommitment];
  const techInfo = PRIMARY_TECH_MAP[primaryTechnology];
  const starter = getWorkspaceStarterTemplate(primaryTechnology);

  const displayName = (user?.name || name || 'Dev').trim();
  const firstName = displayName.split(/\s+/)[0] || 'Dev';
  const rawTier = user?.careerTier?.toLowerCase();
  const leagueLabel =
    (rawTier && TIER_LABEL[rawTier]) ||
    (user?.careerTier ? `Liga ${user.careerTier}` : 'Liga Bronze');
  const totalXp = typeof user?.xp === 'number' ? user.xp : 0;

  // IMPORTANTE: este efeito apenas anima os logs de preparação e dispara o confete visual (onFinished).
  // A ida para /dashboard acontece somente quando o aluno clicar no botão.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        if (!cancelled) setVisibleLines(2);
      }, 240),
    );
    timers.push(
      setTimeout(() => {
        if (!cancelled) setVisibleLines(3);
      }, 520),
    );
    timers.push(
      setTimeout(() => {
        if (!cancelled) setVisibleLines(4);
      }, 800),
    );
    timers.push(
      setTimeout(() => {
        if (!cancelled) {
          setVisibleLines(5);
          setIsDone(true);
          if (!finishedFiredRef.current) {
            finishedFiredRef.current = true;
            onFinished();
          }
        }
      }, 1050),
    );

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [onFinished]);

  const handleOpenDashboardDirect = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleStartDashboardTransition = () => {
    setShowGameLoading(true);
  };

  const progressPct = isDone ? 100 : Math.min(95, Math.round((visibleLines / 5) * 100));

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        {/* Header Stitch */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 text-[#00E676] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            🚀 Ambiente Pronto
          </div>
          <h1 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
            Seu Workspace foi inicializado com sucesso!
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
            Sua conta já está ativa com o diagnóstico de nível{' '}
            <strong className="text-white">{assessedLevel}</strong>, foco em{' '}
            <strong className="text-white">{techInfo.title}</strong>, ritmo{' '}
            <strong className="text-white">{timeInfo.title}</strong> e a Tutora de IA conectada.
          </p>
        </div>

        {/* Terminal sandbox-runner.sh animado progressivamente em tempo real */}
        <div className="rounded-2xl bg-[#07080C] border border-[#1C2133] overflow-hidden">
          <div className="px-4 py-2 bg-[#0C0E15] border-b border-[#1C2133] flex items-center justify-between gap-2 text-xs font-mono text-[#64748B]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" aria-hidden="true" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" aria-hidden="true" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" aria-hidden="true" />
              <span className="ml-2 text-white">workspace-setup.sh</span>
            </div>
            <span className="text-[#00E676] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
              {isDone ? 'Ambiente Online' : `Preparando (${progressPct}%)`}
            </span>
          </div>

          <div
            className="p-5 font-mono text-xs sm:text-sm text-[#F1F5F9] leading-relaxed space-y-2"
            aria-live="polite"
          >
            <p className="text-[#64748B] m-0">
              [0.02s] Ativando conta e preparando seu perfil ({starter.runtimeLabel})...
            </p>
            {visibleLines >= 2 && (
              <p className="text-[#00E5FF] m-0">
                [0.18s] Carregando perfil do aluno: {firstName}
                {email ? ` (${email})` : ''} • Nível {assessedLevel}
              </p>
            )}
            {visibleLines >= 3 && (
              <p className="text-[#A379FF] m-0">
                [0.45s] Salvando objetivos e trilha personalizada: {techInfo.title} ({goalsSummary})
              </p>
            )}
            {visibleLines >= 4 && (
              <p className="text-[#00E676] m-0">
                [0.72s] Conexão com Tutora de IA (Lumi Socrática) estabelecida com sucesso!
              </p>
            )}
            {visibleLines >= 5 && (
              <p className="text-white bg-[#111420] p-2.5 rounded-lg border border-[#1C2133] mt-2 mb-0 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Status: <strong>Tudo pronto para acessar seu Dashboard de estudos</strong>
                </span>
                <span className="text-[#00E676] font-bold">100% READY</span>
              </p>
            )}
          </div>
        </div>

        {/* Card Único focado no Dashboard do Aluno */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181C2C]/70 border border-[#1C2133] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-xl shrink-0"
            >
              📊
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-white">Seu Dashboard do Aluno</div>
              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed mb-0">
                No painel você acompanha sua trilha personalizada, metas da semana, progresso e as próximas etapas guiadas pela Tutora de IA.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenDashboardDirect}
            className="shrink-0 text-xs font-mono text-[#00E5FF] hover:underline font-semibold bg-transparent border-0 cursor-pointer text-left sm:text-right p-0"
          >
            Ir direto para o Painel →
          </button>
        </div>

        {/* Rodapé com ação manual para abrir o Dashboard do Aluno */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[#1C2133]">
          <span className="text-xs font-mono text-[#64748B]">
            Etapa 6 de 6: Conta criada e configurada
          </span>

          <button
            type="button"
            onClick={handleStartDashboardTransition}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00E5FF] hover:brightness-110 text-black font-extrabold text-sm shadow-[0_0_30px_rgba(0,230,116,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <span>Abrir Dashboard do Aluno</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Overlay de Transição: aberto SOMENTE ao clicar no botão */}
      <GameLoadingTransition
        isOpen={showGameLoading}
        studentName={displayName}
        leagueLabel={leagueLabel}
        totalXp={totalXp}
        onNavigateDashboard={handleOpenDashboardDirect}
      />
    </>
  );
};
