'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './dashboard.css';
import Logo from '../../components/Logo';
import { MaterialIcon } from '../../components/MaterialIcon';
import { DynamicTrackCard } from './components/DynamicTrackCard';
import { DailyMissions } from './components/DailyMissions';
import { LeagueCard } from './components/LeagueCard';
import { AiReviewsCard } from './components/AiReviewsCard';
import { deriveHeroEyebrow } from './utils/hero';
import PwaInstallBanner from './components/PwaInstallBanner';
import { fetchDashboardData } from './utils/api';
import { apiFetch, API_BASE } from '../../lib/apiClient';
import { type DynamicTrackView } from '../../lib/dynamic-track';
import { StudentDashboardData } from './types';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';
import { useSidebar } from '../../context/SidebarContext';

interface CourseActivity {
  id: string;
  title: string;
}

interface CourseSummary {
  id: string;
  slug?: string;
  title: string;
  activities?: CourseActivity[];
}

export default function StudentDashboardPage() {
  const { isCollapsed, toggleMobileOpen, toggleCollapsed } = useSidebar();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [trackInvestigation, setTrackInvestigation] = useState<DynamicTrackView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchDashboardData().then((fetched) => {
      if (!isMounted) return;
      if (fetched) setData(fetched);
      else setLoadFailed(true);
      setIsLoading(false);
    });
    // Fases da "Trilha Ativa": atividades reais do curso primário
    // (GET /courses). Sem curso, sem fases — estado vazio honesto.
    apiFetch(`${API_BASE}/courses`)
      .then(async (res) => {
        if (!isMounted || !res.ok) return;
        const list = await res.json();
        if (Array.isArray(list)) setCourses(list);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetryLoad = () => {
    setIsLoading(true);
    setLoadFailed(false);
    fetchDashboardData().then((fetched) => {
      if (fetched) setData(fetched);
      else setLoadFailed(true);
      setIsLoading(false);
    });
  };

  if (isLoading) {
    return (
      <div className="dashboard-root min-h-screen flex flex-col items-center justify-center antialiased bg-[#07080C] text-[#F1F5F9] p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8257E5] border-t-transparent rounded-full animate-spin" />
          <p role="status" className="text-sm font-mono text-[#94A3B8]">
            Carregando seu painel…
          </p>
        </div>
      </div>
    );
  }

  if (loadFailed || !data) {
    return (
      <div className="dashboard-root min-h-screen flex flex-col items-center justify-center antialiased bg-[#07080C] text-[#F1F5F9] p-6">
        <div className="max-w-md w-full rounded-2xl border border-[#1C2133] bg-[#111420] p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#F43F5E]/15 text-[#F43F5E] flex items-center justify-center mx-auto">
            <MaterialIcon name="error_outline" className="text-2xl" />
          </div>
          <h1 className="text-lg font-brand font-bold text-white">
            Não foi possível carregar seu painel
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            A API não respondeu com seus dados. Verifique sua conexão e tente novamente.
          </p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const mission = data.activeMission;
  const suggestedCourseSlug =
    trackInvestigation?.status === 'ready'
      ? trackInvestigation.startCourse?.slug ?? null
      : null;
  const primaryCourse =
    courses.find((c) => c.id === mission?.courseId) ??
    (suggestedCourseSlug
      ? courses.find((c) => c.slug === suggestedCourseSlug)
      : undefined) ??
    courses[0] ??
    null;

  // Fases: as 4 primeiras atividades do curso, em ordem.
  // O status é derivado da contagem REAL de atividades concluídas do progresso:
  // as N primeiras são concluídas, a seguinte é a ativa, o resto bloqueado.
  const completed = mission?.completedLabs ?? 0;
  const phases = (primaryCourse?.activities ?? []).slice(0, 4).map((act, idx) => ({
    id: act.id,
    title: act.title,
    status: (idx < completed ? 'concluída' : idx === completed ? 'ativa' : 'bloqueada') as 'concluída' | 'ativa' | 'bloqueada',
  }));

  const activePhaseIdx = phases.findIndex((p) => p.status === 'ativa');
  const heroEyebrow = deriveHeroEyebrow({
    trackTitle: mission ? mission.trackTitle : null,
    activePhaseNumber: activePhaseIdx >= 0 ? activePhaseIdx + 1 : null,
  });

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white overflow-x-hidden relative">
      {/* Sidebar Lateral Retrátil Oficial */}
      <StudentSidebar />

      {/* ======================================================== */}
      {/* CONTEÚDO PRINCIPAL (ÁREA À DIREITA COM LARGURA DINÂMICA) */}
      {/* ======================================================== */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* HEADER GLOBAL STICKY OFICIAL COM PERFIL UNIFICADO */}
        <StudentHeader title="Visão Geral do Aluno" subtitle="Dashboard" />

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          <PwaInstallBanner />

          {/* 2. BANNER DE TRILHA DINÂMICA (LARGURA TOTAL) */}
          <DynamicTrackCard onLoaded={setTrackInvestigation} />

          {/* 3. HERO CARD — FASE ATUAL (LARGURA TOTAL) */}
          <section className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A379FF]">
                  {heroEyebrow}
                </span>
                {primaryCourse && (
                  <>
                    <span className="text-[#1C2338]">•</span>
                    <span className="text-xs font-mono text-[#00E5FF] truncate max-w-xs">
                      {primaryCourse.title}
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-brand font-black text-2xl md:text-3xl text-white tracking-tight">
                {mission
                  ? mission.title
                  : trackInvestigation?.status === 'ready' && trackInvestigation.trackName
                    ? `Trilha recomendada: ${trackInvestigation.trackName}`
                    : 'Comece sua jornada'}
              </h2>

              {mission ? (
                <>
                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                    {mission.description ??
                      'Avance resolvendo desafios no sandbox e passe em todos os testes automatizados.'}
                  </p>
                  <div className="space-y-1.5 pt-1 max-w-md">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#94A3B8]">Progresso dos Laboratórios</span>
                      <span className="text-white font-bold">
                        {mission.completedLabs} / {mission.totalLabs} labs concluídos
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#07090E] border border-[#1C2338] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8257E5] via-[#A379FF] to-[#00E5FF] transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, mission.progressPercent))}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : trackInvestigation?.status === 'ready' && trackInvestigation.startCourse ? (
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  Seu ponto de partida sugerido é{' '}
                  <strong className="text-white">{trackInvestigation.startCourse.title}</strong>.
                  Comece agora ou explore o catálogo de cursos.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  Você ainda não começou uma trilha. Peça uma sugestão à IA com base no seu
                  perfil e nas suas metas, ou comece direto pelos desafios práticos.
                </p>
              )}
            </div>

            {/* Botões de Ação do Hero (Hierarquia Linear: 1 CTA Primário Dominante) */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              {mission ? (
                <>
                  <Link
                    href="/ide"
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7142D6] hover:from-[#996DFF] hover:to-[#8257E5] text-white font-mono font-bold text-sm shadow-[0_0_20px_rgba(130,87,229,0.3)] transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
                  >
                    <MaterialIcon name="play_arrow" className="text-[18px]" />
                    <span>Continuar Missão Técnica</span>
                  </Link>

                  {primaryCourse?.slug && (
                    <Link
                      href={`/courses/${primaryCourse.slug}`}
                      className="px-5 py-3.5 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-[#94A3B8] hover:text-white text-sm font-mono transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <MaterialIcon name="menu_book" className="text-[16px] text-[#00E5FF]" />
                      <span>Ementa da Trilha</span>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href={
                      trackInvestigation?.status === 'ready' && trackInvestigation.startCourse
                        ? `/courses/${trackInvestigation.startCourse.slug}`
                        : '/trilha/sugerida'
                    }
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7142D6] hover:from-[#996DFF] hover:to-[#8257E5] text-white font-mono font-bold text-sm shadow-[0_0_20px_rgba(130,87,229,0.3)] transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
                  >
                    <span>
                      {trackInvestigation?.status === 'ready'
                        ? 'Iniciar Trilha Recomendada'
                        : 'Gerar Trilha com IA'}
                    </span>
                    <MaterialIcon name="arrow_forward" className="text-[16px]" />
                  </Link>
                  <Link
                    href="/courses"
                    className="px-5 py-3.5 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-[#94A3B8] hover:text-white text-sm font-mono transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>Explorar Catálogo</span>
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* 4. BENTO GRID ASSIMÉTRICO (12 COLUNAS: 8 ESQUERDA / 4 DIREITA) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ======================================================== */}
            {/* COLUNA ESQUERDA (8 COLUNAS)                             */}
            {/* ======================================================== */}
            <div className="lg:col-span-8 space-y-6">
              {/* CARD PRINCIPAL: TRILHA ATIVA (4 FASES COM 3 ESTADOS) */}
              <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-6 space-y-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-[#1C2338]">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#A379FF] font-bold block mb-0.5">
                      Trilha Ativa
                    </span>
                    <h3 className="font-brand font-bold text-lg text-white">
                      {primaryCourse ? primaryCourse.title : 'Nenhum curso ativo no momento'}
                    </h3>
                  </div>

                  {primaryCourse?.slug && (
                    <Link
                      href={`/courses/${primaryCourse.slug}`}
                      className="px-3.5 py-1.5 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-xs font-mono text-white transition-colors"
                    >
                      Abrir curso →
                    </Link>
                  )}
                </div>

                {/* Sequência Visual das 4 Fases */}
                {phases.length > 0 ? (
                  <div className="space-y-3.5">
                    {phases.map((phase, idx) => {
                      if (phase.status === 'concluída') {
                        return (
                          <div
                            key={phase.id}
                            className="p-4 rounded-2xl bg-[#121624] border border-[#1C2338] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-[#00B37E]/20 border border-[#00B37E]/50 text-[#04D361] flex items-center justify-center font-bold text-base shrink-0">
                                ✓
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-[#04D361] font-bold uppercase tracking-wider">
                                    Fase 0{idx + 1} • Concluída
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-white mt-0.5">
                                  {phase.title}
                                </h4>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-[#04D361] font-bold">Concluída</span>
                          </div>
                        );
                      }

                      if (phase.status === 'ativa') {
                        return (
                          <div
                            key={phase.id}
                            className="p-4 rounded-2xl bg-[#121624] border-2 border-[#8257E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(130,87,229,0.2)]"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8257E5] to-[#7142D6] text-white flex items-center justify-center font-bold shrink-0 shadow-[0_0_15px_rgba(130,87,229,0.5)]">
                                <MaterialIcon name="terminal" className="text-[20px]" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-[#8257E5]/30 text-[#A379FF] border border-[#8257E5]/60 text-[10px] font-mono font-bold tracking-wider uppercase">
                                    FASE ATIVA • SANDBOX ONLINE
                                  </span>
                                  <span className="text-xs font-mono text-[#94A3B8]">
                                    Fase 0{idx + 1}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white mt-0.5">
                                  {phase.title}
                                </h4>
                              </div>
                            </div>

                            <Link
                              href={!mission && primaryCourse?.slug ? `/courses/${primaryCourse.slug}` : '/ide'}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7142D6] hover:from-[#996DFF] hover:to-[#8257E5] text-white font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(130,87,229,0.3)] flex items-center justify-center gap-1.5 shrink-0"
                            >
                              <span>{!mission ? 'Abrir Módulo' : 'Resolver no Sandbox'}</span>
                              <MaterialIcon name="arrow_forward" className="text-sm" />
                            </Link>
                          </div>
                        );
                      }

                      // Bloqueada
                      return (
                        <div
                          key={phase.id}
                          className="p-4 rounded-2xl bg-[#07090E] border border-[#1C2338] flex items-center justify-between opacity-60"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#121624] border border-[#1C2338] text-[#64748B] flex items-center justify-center shrink-0">
                              <MaterialIcon name="lock" className="text-[18px]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">
                                  Fase 0{idx + 1} • Bloqueada
                                </span>
                              </div>
                              <h4 className="text-sm font-medium text-[#94A3B8] mt-0.5">
                                {phase.title}
                              </h4>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-[#64748B]">Bloqueada</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {primaryCourse
                      ? 'Este curso ainda não tem fases listadas.'
                      : 'Nenhuma trilha ativa no momento — comece pela trilha sugerida acima ou explore o catálogo.'}
                  </p>
                )}
              </div>

              {/* LINHA INFERIOR (2 CARDS LADO A LADO) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <AiReviewsCard />

                {/* Card: Simulador de Entrevista */}
                <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-brand font-bold text-sm text-white">Simulador de Entrevista</h4>
                    <span className="text-[10px] font-mono text-[#A379FF] bg-[#121624] px-2 py-0.5 rounded border border-[#8257E5]/40 font-bold">
                      Voz &amp; IDE
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Treine live coding sob pressão e responda perguntas comportamentais com avaliação em tempo real.
                  </p>

                  <div className="p-3 rounded-xl bg-[#121624] border border-[#1C2338] text-xs font-mono text-[#94A3B8] flex items-center justify-between">
                    <span>Preparação para vagas de tecnologia</span>
                    <span className="text-[#04D361]">Disponível</span>
                  </div>

                  <Link
                    href="/entrevista"
                    className="w-full py-2 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Nova simulação</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* COLUNA DIREITA / SIDEBAR BENTO (4 COLUNAS)               */}
            {/* ======================================================== */}
            <aside className="lg:col-span-4 space-y-6">
              {/* WIDGET: TUTORA DE IA (GATA ESTILIZADA) */}
              <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-5 shadow-xl space-y-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <Image
                      src="/images/stitch/tutor-cat.png"
                      alt="Tutora de IA"
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-[#8257E5]"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00B37E] border-2 border-[#0C0F17]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-brand font-bold text-white text-sm">Tutora de IA</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#00B37E]/15 text-[#04D361] font-mono font-bold border border-[#00B37E]/30">
                        Online
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[#94A3B8]">Pronta para analisar seus testes</p>
                  </div>
                </div>

                {/* Dica Socrática */}
                <div className="p-3 rounded-xl bg-[#121624] border border-[#1C2338] text-xs font-mono text-[#E2E8F0] leading-relaxed">
                  {data.socraticAi?.tip
                    ? `"${data.socraticAi.tip}"`
                    : '"Qual estrutura de dados você utilizaria para encontrar o item em tempo O(1) antes de iterar?"'}
                </div>

                {/* CTA Abrir mentor no sandbox */}
                <Link
                  href="/ide"
                  className="w-full py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Abrir mentor no sandbox</span>
                  <MaterialIcon name="terminal" className="text-[16px]" />
                </Link>
              </div>

              {/* SUA LIGA */}
              <LeagueCard />

              {/* MISSÕES DE HOJE */}
              <DailyMissions />

              {/* RANKING DO CURSO */}
              {data.leaderboard.length > 0 && (
                <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1C2338]">
                    <h4 className="font-brand font-bold text-white text-sm">Ranking do curso</h4>
                    <span className="text-[10px] font-mono text-[#94A3B8] truncate max-w-[140px]">
                      {primaryCourse ? primaryCourse.title : 'Geral'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {data.leaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center justify-between p-2 rounded-xl border ${
                          entry.isCurrentUser
                            ? 'bg-[#121624] border-[#8257E5] text-white'
                            : entry.rank === 1
                              ? 'bg-[#121624] border-[#FFA116]/40 text-white'
                              : 'bg-[#121624] border-[#1C2338] text-[#94A3B8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`font-bold w-5 shrink-0 ${
                              entry.rank === 1
                                ? 'text-[#FFA116]'
                                : entry.isCurrentUser
                                  ? 'text-[#00E5FF]'
                                  : 'text-[#64748B]'
                            }`}
                          >
                            #{entry.rank}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-[#1C2338] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {entry.initials}
                          </div>
                          <span className="truncate font-medium text-white">
                            {entry.name}
                            {entry.isCurrentUser ? ' (Você)' : ''}
                          </span>
                        </div>
                        <span
                          className={`font-bold shrink-0 ${
                            entry.rank === 1
                              ? 'text-[#FFA116]'
                              : entry.isCurrentUser
                                ? 'text-[#00E5FF]'
                                : 'text-[#64748B]'
                          }`}
                        >
                          {entry.xp} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </main>

        {/* Rodapé Minimalista */}
        <footer className="border-t border-[#1C2338] py-4 bg-[#07090E] px-6 text-center text-xs font-mono text-[#64748B] mt-auto">
          Nexus Code © 2026 • Plataforma de Ensino Gamificada com Código Real e Tutoria por IA
        </footer>
      </div>
    </div>
  );
}
