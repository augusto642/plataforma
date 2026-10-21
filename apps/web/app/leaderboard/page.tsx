'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { API_BASE, apiFetch } from '../lib/apiClient';
import { XP_BANDS, bandForXp } from './data';
import type {
  CourseOption,
  CourseProgressSummary,
  LeaderboardApiEntry,
  LeaderboardDisplayUser,
} from './types';
import { chooseInitialCourseId, mapLeaderboardEntries } from './utils';
import { LeaderboardTable } from './components/LeaderboardTable';
import { PodiumTop3 } from './components/PodiumTop3';
import { RankingControls } from './components/RankingControls';
import { XpBandHeader } from './components/XpBandHeader';

type CoursesState = 'loading' | 'ready' | 'error';
type RankingState = 'idle' | 'loading' | 'ready' | 'forbidden' | 'unauthorized' | 'error';

function StatusPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-8 sm:p-10 text-center shadow-2xl">
      <div className="text-4xl mb-4" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-xl font-black font-heading text-white mb-2">{title}</h2>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto">{description}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-bold transition-colors"
    >
      {children}
    </Link>
  );
}

function SecondaryActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-5 py-2.5 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-white text-sm font-bold transition-colors"
    >
      {children}
    </Link>
  );
}

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [coursesState, setCoursesState] = useState<CoursesState>('loading');
  const [coursesReloadKey, setCoursesReloadKey] = useState(0);

  const [entries, setEntries] = useState<LeaderboardDisplayUser[]>([]);
  const [rankingState, setRankingState] = useState<RankingState>('idle');
  const [rankingReloadKey, setRankingReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCourses([]);
      setEnrolledCourseIds([]);
      setSelectedCourseId('');
      setEntries([]);
      setCoursesState('ready');
      setRankingState('idle');
      return;
    }

    let cancelled = false;
    setCoursesState('loading');

    void (async () => {
      const [coursesResult, progressResult] = await Promise.allSettled([
        apiFetch(`${API_BASE}/courses`),
        apiFetch(`${API_BASE}/users/me/progress`),
      ]);
      if (cancelled) return;

      if (coursesResult.status === 'rejected' || !coursesResult.value.ok) {
        setCoursesState('error');
        return;
      }

      const rawCourses: unknown = await coursesResult.value.json().catch(() => null);
      if (cancelled) return;
      if (!Array.isArray(rawCourses)) {
        setCoursesState('error');
        return;
      }

      const options: CourseOption[] = rawCourses
        .filter(
          (course): course is CourseOption =>
            Boolean(course) &&
            typeof course === 'object' &&
            typeof (course as CourseOption).id === 'string' &&
            typeof (course as CourseOption).title === 'string',
        )
        .map((course) => ({
          id: course.id,
          title: course.title,
          slug: typeof course.slug === 'string' ? course.slug : undefined,
        }));

      let enrolledIds: string[] = [];
      if (progressResult.status === 'fulfilled' && progressResult.value.ok) {
        const progress: unknown = await progressResult.value.json().catch(() => null);
        if (
          !cancelled &&
          progress &&
          typeof progress === 'object' &&
          Array.isArray((progress as { coursesProgress?: unknown }).coursesProgress)
        ) {
          enrolledIds = (
            (progress as { coursesProgress: CourseProgressSummary[] }).coursesProgress ?? []
          )
            .map((course) => course.courseId)
            .filter((courseId): courseId is string => typeof courseId === 'string');
        }
      }
      if (cancelled) return;

      setCourses(options);
      setEnrolledCourseIds(enrolledIds);
      setSelectedCourseId((previous) =>
        options.some((course) => course.id === previous)
          ? previous
          : chooseInitialCourseId(options, enrolledIds),
      );
      setCoursesState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, coursesReloadKey]);

  useEffect(() => {
    if (!user || !selectedCourseId) {
      setEntries([]);
      setRankingState('idle');
      return;
    }

    const controller = new AbortController();
    setRankingState('loading');
    setEntries([]);

    void (async () => {
      try {
        const response = await apiFetch(
          `${API_BASE}/courses/${selectedCourseId}/leaderboard`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setRankingState('unauthorized');
          return;
        }
        if (response.status === 403) {
          setRankingState('forbidden');
          return;
        }
        if (!response.ok) {
          setRankingState('error');
          return;
        }

        const rawEntries: unknown = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!Array.isArray(rawEntries)) {
          setRankingState('error');
          return;
        }

        setEntries(mapLeaderboardEntries(rawEntries as LeaderboardApiEntry[], user.id));
        setRankingState('ready');
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
        setRankingState('error');
      }
    })();

    return () => {
      controller.abort();
    };
  }, [rankingReloadKey, selectedCourseId, user]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const currentEntry = useMemo(
    () => entries.find((entry) => entry.isCurrentUser) ?? null,
    [entries],
  );

  const currentBand = currentEntry ? bandForXp(currentEntry.xp) : null;

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [entries, searchQuery]);

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black pb-24">
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Logo size="md" href="/" />

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/courses" className="text-zinc-400 hover:text-white transition-colors">
                Cursos
              </Link>
              <Link
                href="/leaderboard"
                className="text-white border-b-2 border-[#04D361] pb-1 font-semibold"
              >
                Leaderboard
              </Link>
              <Link href="/ide" className="text-zinc-400 hover:text-white transition-colors">
                IDE Sandbox
              </Link>
              <Link href="/profile" className="text-zinc-400 hover:text-white transition-colors">
                Perfil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8257E5]/15 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold max-w-72">
              {authLoading ? (
                <span>Verificando sessão</span>
              ) : currentBand ? (
                <>
                  <span>{currentBand.icon}</span>
                  <span>{currentBand.name}</span>
                </>
              ) : selectedCourse ? (
                <span className="truncate">{selectedCourse.title}</span>
              ) : (
                <span>Ranking por curso</span>
              )}
            </div>
            <Link
              href="/settings"
              className="w-9 h-9 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-white transition-all text-sm"
              title="Configurações"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-5 pt-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold mb-3">
            <span>🏆</span>
            <span>RANKING REAL POR CURSO</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
            Leaderboard{' '}
            <span className="bg-gradient-to-r from-[#996DFF] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">
              de Engenharia
            </span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl mt-1 leading-relaxed">
            Escolha um curso para ver os alunos matriculados ordenados pelo XP total
            acumulado retornado pela API. As faixas abaixo apenas agrupam a pontuação
            para leitura — não há ligas, rodadas semanais nem rebaixamento.
          </p>
        </div>

        {authLoading ? (
          <StatusPanel
            icon="⏳"
            title="Verificando sua sessão"
            description="O ranking só é solicitado à API depois de confirmar se há um usuário autenticado."
          />
        ) : !user ? (
          <StatusPanel
            icon="🔒"
            title="Ranking disponível para alunos matriculados"
            description="A API da Nexus Code exige sessão autenticada para listar cursos e permite que alunos vejam apenas o ranking dos cursos em que estão matriculados. Entre ou crie sua conta para acessar o ranking real — nenhum dado de demonstração é exibido aqui."
          >
            <ActionLink href="/login">Entrar</ActionLink>
            <SecondaryActionLink href="/register">Criar conta</SecondaryActionLink>
          </StatusPanel>
        ) : coursesState === 'loading' ? (
          <StatusPanel
            icon="⏳"
            title="Carregando cursos"
            description="Buscando na API os cursos disponíveis para montar o seletor do ranking."
          />
        ) : coursesState === 'error' ? (
          <StatusPanel
            icon="⚠️"
            title="Não foi possível carregar os cursos"
            description="A API não retornou a lista de cursos nesta tentativa. Nenhum ranking foi exibido sem essa confirmação."
          >
            <button
              type="button"
              onClick={() => setCoursesReloadKey((value) => value + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-bold transition-colors"
            >
              Tentar novamente
            </button>
          </StatusPanel>
        ) : courses.length === 0 ? (
          <StatusPanel
            icon="📭"
            title="Nenhum curso disponível"
            description="A API não retornou cursos para montar um ranking neste momento."
          >
            <ActionLink href="/courses">Ver cursos</ActionLink>
          </StatusPanel>
        ) : (
          <>
            <RankingControls
              courses={courses}
              selectedCourseId={selectedCourseId}
              onCourseChange={setSelectedCourseId}
              enrolledCourseIds={enrolledCourseIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalParticipants={entries.length}
            />

            {rankingState === 'loading' || rankingState === 'idle' ? (
              <StatusPanel
                icon="⏳"
                title="Carregando ranking do curso"
                description={`Solicitando à API o ranking${selectedCourse ? ` de ${selectedCourse.title}` : ''}.`}
              />
            ) : rankingState === 'forbidden' ? (
              <StatusPanel
                icon="🔒"
                title="Você não está matriculado neste curso"
                description="Para alunos, a API só libera o ranking de cursos com matrícula ativa. Escolha outro curso no seletor ou acesse a área de cursos para se matricular."
              >
                <ActionLink href="/courses">Ver cursos</ActionLink>
              </StatusPanel>
            ) : rankingState === 'unauthorized' ? (
              <StatusPanel
                icon="🔒"
                title="Sua sessão expirou"
                description="A API recusou a sessão ao carregar este ranking. Entre novamente para continuar."
              >
                <ActionLink href="/login">Entrar novamente</ActionLink>
              </StatusPanel>
            ) : rankingState === 'error' ? (
              <StatusPanel
                icon="⚠️"
                title="Não foi possível carregar o ranking"
                description="A API não retornou o ranking deste curso nesta tentativa. Nenhum dado substituto foi exibido."
              >
                <button
                  type="button"
                  onClick={() => setRankingReloadKey((value) => value + 1)}
                  className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-bold transition-colors"
                >
                  Tentar novamente
                </button>
              </StatusPanel>
            ) : entries.length === 0 ? (
              <StatusPanel
                icon="📭"
                title="Nenhum aluno neste ranking"
                description="A API retornou uma lista vazia para o curso selecionado. Quando houver alunos matriculados, eles aparecerão aqui."
              />
            ) : (
              <>
                <XpBandHeader bands={XP_BANDS} currentEntry={currentEntry} />
                {!searchQuery && <PodiumTop3 top3={entries.slice(0, 3)} />}
                <LeaderboardTable users={filteredEntries} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
