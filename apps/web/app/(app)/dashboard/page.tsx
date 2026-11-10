'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { StudentDashboardData } from './types';

// Central 219 (D2) — dashboard na estrutura do protótipo Stitch v2
// (dashboard-aluno.html): header com nav + streak/XP reais, hero
// "FASE ATUAL" (nº da fase ativa real — sem mundo/capítulo, que a
// API não devolve), "Trilha Ativa" com fases 01–04 (ativa com
// destaque de chefe, bloqueada opaca), módulos de apoio ("Revisões
// da IA Salvas" via AiReviewsCard + "Simulador de Entrevista"),
// coluna direita com "Sua Liga" (tiers reais bronze/prata/ouro, via
// LeagueCard), "Missões de Hoje" (reais, via DailyMissions) e
// ranking real do curso. Grid 8/4 como o protótipo.
// Regra D7: seção sem dado real é omitida — fases sem curso ativo
// mostram estado vazio honesto; XP por fase e estrelas não têm fonte
// real e não aparecem; nenhum número do molde ("Liga Diamante",
// Kafka, 88.4, 348 submissões) existe nesta tela.

interface CourseActivity {
  id: string;
  title: string;
}

interface CourseSummary {
  id: string;
  title: string;
  activities?: CourseActivity[];
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
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
      <div className="dashboard-root min-h-screen flex flex-col items-center justify-center antialiased bg-background text-ink-heading p-6">
        <p role="status" className="text-sm font-medium text-ink-body">
          Carregando seu painel…
        </p>
      </div>
    );
  }

  if (loadFailed || !data) {
    return (
      <div className="dashboard-root min-h-screen flex flex-col items-center justify-center antialiased bg-background text-ink-heading p-6">
        <div className="max-w-md w-full rounded-2xl border border-border-2 bg-surface-1 p-6 text-center">
          <h1 className="text-lg font-heading font-bold mb-2">
            Não foi possível carregar seu painel
          </h1>
          <p className="text-sm text-ink-body leading-relaxed mb-5">
            A API não respondeu — por isso nenhum dado está sendo exibido.
            Verifique sua conexão e tente novamente.
          </p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-sm font-heading font-bold transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const mission = data.activeMission;
  const primaryCourse =
    courses.find((c) => c.id === mission?.courseId) ?? courses[0] ?? null;
  // Fases: as 4 primeiras atividades do curso, em ordem. O status é
  // derivado da contagem REAL de atividades concluídas do progresso:
  // as N primeiras são concluídas, a seguinte é a ativa, o resto
  // bloqueado. Sem progresso, nenhuma fase é marcada como concluída.
  const completed = mission?.completedLabs ?? 0;
  const phases = (primaryCourse?.activities ?? []).slice(0, 4).map((act, idx) => ({
    id: act.id,
    title: act.title,
    status: idx < completed ? 'concluída' : idx === completed ? 'ativa' : 'bloqueada',
  }));
  // Central 219 (D2) — nº da fase ativa real (1-based) para o eyebrow
  // "FASE ATUAL" do hero; null sem fase ativa determinável.
  const activePhaseIdx = phases.findIndex((p) => p.status === 'ativa');
  const heroEyebrow = deriveHeroEyebrow({
    trackTitle: mission ? mission.trackTitle : null,
    activePhaseNumber: activePhaseIdx >= 0 ? activePhaseIdx + 1 : null,
  });

  return (
    <div className="dashboard-root min-h-screen flex flex-col antialiased selection:bg-[#8257E5] selection:text-white bg-background text-ink-heading">
      {/* Header do protótipo: nav de seções + streak/XP reais + avatar. */}
      <header className="h-16 bg-dark-surface-container-low border-b border-border-subtle px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6 min-w-0">
          <Logo size="md" href="/" />
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-ink-body">
            <Link href="/dashboard" className="text-ink-heading">
              Trilha do Jogo
            </Link>
            <Link href="/entrevista" className="hover:text-ink-heading transition-colors">
              Simulador de Entrevista
            </Link>
            <Link href="/leaderboard" className="hover:text-ink-heading transition-colors">
              Ligas &amp; Ranking
            </Link>
            <Link href="/certificacoes" className="hover:text-ink-heading transition-colors">
              Certificados
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-surface-container border border-border-subtle text-xs font-bold text-brand-amber">
            <MaterialIcon name="local_fire_department" className="text-[16px]" />
            {data.user.streakDays} dias
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-surface-container border border-border-subtle text-xs font-bold text-ink-heading">
            <MaterialIcon name="bolt" className="text-[16px] text-secondary" />
            {data.user.xp} XP
          </span>
          <span className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-purple text-white text-xs font-bold">
              {data.user.avatarInitials}
            </span>
            <span className="hidden md:block text-sm font-semibold truncate max-w-[140px]">
              {data.user.name}
            </span>
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
        <PwaInstallBanner />

        {/* Trilha dinâmica (209): sugestão real ou estado de espera. */}
        <DynamicTrackCard />

        {/* Hero — fase atual: trilha ativa real ou estado vazio. */}
        <section className="rounded-xl bg-gradient-to-r from-dark-surface-container-high via-dark-surface-container to-dark-surface-container-low border border-border-strong p-6 md:p-8">
          <p className="font-code text-xs text-secondary font-bold uppercase tracking-wider">
            {heroEyebrow}
          </p>
          <h1 className="font-headline text-headline-lg-mobile md:text-headline-lg text-white font-bold mt-2">
            {mission ? mission.title : 'Comece sua jornada'}
          </h1>
          {mission ? (
            <>
              <p className="text-sm text-dark-on-surface-variant mt-2">
                Progresso em andamento
                {mission.totalLabs > 0 &&
                  ` · ${mission.completedLabs} de ${mission.totalLabs} atividades`}
              </p>
              <div className="mt-4 h-2 rounded-full bg-dark-surface-container-high overflow-hidden max-w-xl">
                <div
                  className="h-full bg-secondary rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, mission.progressPercent))}%` }}
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/ide"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded bg-primary hover:bg-dark-primary text-white text-sm font-bold transition-colors"
                >
                  <MaterialIcon name="play_arrow" className="text-[18px]" />
                  Continuar desafio
                </Link>
                <Link
                  href="/entrevista"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded bg-dark-surface-container border border-border-strong text-dark-on-surface hover:text-white text-sm font-semibold transition-colors"
                >
                  <MaterialIcon name="record_voice_over" className="text-[18px]" />
                  Treinar entrevista
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-dark-on-surface-variant mt-2 max-w-xl leading-relaxed">
                Você ainda não começou uma trilha. Peça uma sugestão à IA com
                base no seu perfil e nas suas metas, ou comece direto pelos
                desafios.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/trilha/sugerida"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded bg-primary hover:bg-dark-primary text-white text-sm font-bold transition-colors"
                >
                  Sugerir minha trilha
                </Link>
                <Link
                  href="/desafios"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded bg-dark-surface-container border border-border-strong text-dark-on-surface hover:text-white text-sm font-semibold transition-colors"
                >
                  Ver desafios
                </Link>
              </div>
            </>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Trilha Ativa — fases reais do curso primário. */}
            <section
              aria-label="Trilha ativa"
              className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-5"
            >
              <h2 className="font-headline text-lg font-bold text-white">Trilha Ativa</h2>
              {primaryCourse && (
                <p className="text-sm text-dark-on-surface-variant mt-1">
                  {primaryCourse.title}
                  {mission && mission.totalLabs > 0 && (
                    <> · em andamento ({mission.completedLabs}/{mission.totalLabs})</>
                  )}
                </p>
              )}
              {phases.length > 0 ? (
                <ol className="mt-4 space-y-2">
                  {phases.map((phase, idx) => (
                    <li
                      key={phase.id}
                      // Central 219 (D2) — fase ativa com o destaque de
                      // chefe do protótipo (borda roxa + sombra) e selo
                      // "DESAFIO ATIVO"; bloqueada opaca, como no molde.
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        phase.status === 'ativa'
                          ? 'border-2 border-primary bg-primary/10 shadow-lg shadow-primary/10'
                          : phase.status === 'concluída'
                            ? 'border-border-subtle bg-dark-surface-container'
                            : 'border-border-subtle bg-dark-surface-container opacity-60'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          phase.status === 'concluída'
                            ? 'bg-secondary/15 text-secondary'
                            : phase.status === 'ativa'
                              ? 'bg-primary/15 text-dark-primary'
                              : 'bg-dark-surface-container-high text-dark-on-surface-variant'
                        }`}
                      >
                        {phase.status === 'concluída' ? (
                          <MaterialIcon name="check" className="text-[18px]" />
                        ) : phase.status === 'ativa' ? (
                          <MaterialIcon name="swords" className="text-[18px]" />
                        ) : (
                          <MaterialIcon name="lock" className="text-[18px]" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="block text-xs font-code text-dark-on-surface-variant uppercase tracking-wider">
                            Fase 0{idx + 1} · {phase.status}
                          </span>
                          {phase.status === 'ativa' && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-white font-code text-[10px] font-bold">
                              DESAFIO ATIVO
                            </span>
                          )}
                        </span>
                        <span className="block text-sm font-semibold text-white truncate">
                          {phase.title}
                        </span>
                      </span>
                      {phase.status === 'ativa' && (
                        <Link
                          href="/ide"
                          className="shrink-0 inline-flex items-center gap-1 text-sm font-bold text-dark-primary hover:underline"
                        >
                          Jogar agora
                          <MaterialIcon name="arrow_forward" className="text-[16px]" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-dark-on-surface-variant mt-3 leading-relaxed">
                  {primaryCourse
                    ? 'Este curso ainda não tem fases listadas.'
                    : 'Nenhuma trilha ativa no momento — comece pela trilha sugerida ou pelos desafios.'}
                </p>
              )}
            </section>

            {/* Módulos de apoio — os 2 cards do protótipo, lado a lado:
                "Revisões da IA Salvas" (dados reais ou omitido) e
                "Simulador de Entrevista". */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AiReviewsCard />
              <section
                aria-label="Simulador de entrevista"
                className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-5 flex items-start gap-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary/15 text-tertiary">
                  <MaterialIcon name="record_voice_over" className="text-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-headline text-sm font-bold text-white">
                    Simulador de Entrevista
                  </h2>
                  <p className="text-xs text-dark-on-surface-variant mt-0.5 mb-3">
                    Treine para entrevistas técnicas com perguntas e live coding.
                  </p>
                  <Link
                    href="/entrevista"
                    className="inline-flex items-center gap-1 text-xs font-code font-bold text-tertiary hover:underline"
                  >
                    Nova simulação
                    <MaterialIcon name="arrow_forward" className="text-[14px]" />
                  </Link>
                </div>
              </section>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Sua Liga — tiers reais (LeagueCard some sem liga/acesso). */}
            <LeagueCard />
            {/* Missões de Hoje — só com dados reais (DailyMissions some sem). */}
            <DailyMissions />
            {/* Ranking do curso primário — só entradas reais. */}
            {data.leaderboard.length > 0 && (
              <section
                aria-label="Ranking do curso"
                className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-5"
              >
                <h2 className="font-headline text-base font-bold text-white">Ranking do curso</h2>
                <ol className="mt-3 space-y-2">
                  {data.leaderboard.map((entry) => (
                    <li
                      key={entry.rank}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-dark-on-surface truncate">
                        {entry.rank}º {entry.name}
                        {entry.isCurrentUser ? ' (Você)' : ''}
                      </span>
                      <span className="font-bold text-white shrink-0">{entry.xp} XP</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {data.heatmap.totalSubmissions > 0 && (
              <p className="text-xs text-dark-on-surface-variant px-1">
                {data.heatmap.totalSubmissions} submissões registradas.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
