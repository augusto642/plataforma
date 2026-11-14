'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, apiFetch } from '../../lib/apiClient';
import { XP_BANDS } from './data';
import type {
  CourseOption,
  CourseProgressSummary,
  LeaderboardApiEntry,
  LeaderboardDisplayUser,
} from './types';
import { chooseInitialCourseId, mapLeaderboardEntries } from './utils';
import { LeaderboardTable } from './components/LeaderboardTable';
import { PodiumTop3 } from './components/PodiumTop3';
import { RankingControls, type RankingScope } from './components/RankingControls';
import { XpBandHeader } from './components/XpBandHeader';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';
import { MaterialIcon } from '../../components/MaterialIcon';
import { useSidebar } from '../../context/SidebarContext';

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
    <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-8 sm:p-10 text-center shadow-2xl">
      <div className="text-4xl mb-4" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-xl font-black font-brand text-white mb-2">{title}</h2>
      <p className="text-sm text-[#94A3B8] leading-relaxed max-w-xl mx-auto">{description}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(130,87,229,0.3)] cursor-pointer"
    >
      {children}
    </button>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-bold transition-all shadow-[0_0_15px_rgba(130,87,229,0.3)]"
    >
      {children}
    </Link>
  );
}

function SecondaryActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-5 py-2.5 rounded-xl bg-[#121624] border border-[#1E273D] hover:border-zinc-500 text-white text-sm font-bold transition-colors"
    >
      {children}
    </Link>
  );
}

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isCollapsed } = useSidebar();

  const [rankingMode, setRankingMode] = useState<RankingScope>('global');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [coursesState, setCoursesState] = useState<CoursesState>('loading');
  const [coursesReloadKey, setCoursesReloadKey] = useState(0);

  const [entries, setEntries] = useState<LeaderboardDisplayUser[]>([]);
  const [rankingState, setRankingState] = useState<RankingState>('idle');
  const [rankingReloadKey, setRankingReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Carrega lista de cursos e matrículas do aluno
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
          enrolledIds = (progress as { coursesProgress: CourseProgressSummary[] }).coursesProgress
            .map((entry) => entry.courseId)
            .filter((id): id is string => typeof id === 'string');
        }
      }

      setCourses(options);
      setEnrolledCourseIds(enrolledIds);
      setSelectedCourseId((previous) => previous || chooseInitialCourseId(options, enrolledIds));
      setCoursesState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, coursesReloadKey]);

  // 2. Carrega o ranking conforme o escopo selecionado (Geral ou Por Curso)
  useEffect(() => {
    if (authLoading || !user) return;

    if (rankingMode === 'course' && !selectedCourseId && coursesState === 'ready') {
      setEntries([]);
      setRankingState('idle');
      return;
    }

    let cancelled = false;
    setRankingState('loading');

    void (async () => {
      try {
        const url =
          rankingMode === 'global'
            ? `${API_BASE}/courses/leaderboard/global`
            : `${API_BASE}/courses/${selectedCourseId}/leaderboard`;

        const response = await apiFetch(url);
        if (cancelled) return;

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

        const data: unknown = await response.json().catch(() => null);
        if (cancelled) return;
        if (!Array.isArray(data)) {
          setRankingState('error');
          return;
        }

        const validEntries = data.filter(
          (entry): entry is LeaderboardApiEntry =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as LeaderboardApiEntry).userId === 'string' &&
            typeof (entry as LeaderboardApiEntry).name === 'string' &&
            typeof (entry as LeaderboardApiEntry).xp === 'number',
        );

        setEntries(mapLeaderboardEntries(validEntries, user.id));
        setRankingState('ready');
      } catch {
        if (!cancelled) setRankingState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, rankingMode, selectedCourseId, rankingReloadKey, coursesState]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [entries, searchQuery]);

  const currentEntry = useMemo(
    () => entries.find((entry) => entry.isCurrentUser) || null,
    [entries],
  );

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Ambient Glow Sutil */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] bg-gradient-to-b from-[#8257E5]/10 via-[#00E5FF]/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Sidebar Lateral */}
      <StudentSidebar />

      {/* Área de Conteúdo à Direita */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Header Superior */}
        <StudentHeader
          title="Classificação &amp; Ligas"
          subtitle={
            rankingMode === 'global'
              ? 'Hall da Fama da Comunidade Nexus Code'
              : `Divisão da Turma: ${selectedCourse?.title || 'Curso Selecionado'}`
          }
        />

        {/* Conteúdo Principal */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-5 lg:px-10 py-8 space-y-8">
          {/* Apresentação do Ranking */}
          <div className="pb-6 border-b border-[#1C2338]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#A379FF] text-xs font-mono font-bold mb-3">
              <MaterialIcon name="emoji_events" className="text-sm text-[#FFA116]" />
              <span>
                {rankingMode === 'global' ? 'HALL DA FAMA GLOBAL' : 'RANKING POR TURMA MATRICULADA'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-brand text-white tracking-tight leading-tight">
              Tabela de{' '}
              <span className="bg-gradient-to-r from-[#A379FF] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">
                Classificação &amp; Maestria
              </span>
            </h1>
            <p className="text-[#94A3B8] text-sm max-w-2xl mt-1 leading-relaxed">
              {rankingMode === 'global'
                ? 'Conheça os desenvolvedores com maior pontuação acumulada na plataforma. Ganhe XP resolvendo desafios, batalhas de código e projetos práticos.'
                : 'Acompanhe seu desempenho na turma deste curso. Complete lições e mantenha sua ofensiva ativa para liderar a divisão.'}
            </p>
          </div>

          {authLoading ? (
            <StatusPanel
              icon="⚡"
              title="Sincronizando sua jornada..."
              description="Estamos preparando o quadro de classificação com as pontuações mais recentes da comunidade."
            />
          ) : !user ? (
            <StatusPanel
              icon="🔒"
              title="Acesso exclusivo para alunos da plataforma"
              description="Entre na sua conta ou crie seu perfil gratuito para acumular XP, desbloquear insígnias e disputar posições no ranking da comunidade."
            >
              <ActionLink href="/login">Entrar na Conta</ActionLink>
              <SecondaryActionLink href="/register">Criar Perfil de Aluno</SecondaryActionLink>
            </StatusPanel>
          ) : coursesState === 'loading' ? (
            <StatusPanel
              icon="⏳"
              title="Carregando divisões..."
              description="Organizando os cursos e as turmas disponíveis para a competição."
            />
          ) : coursesState === 'error' ? (
            <StatusPanel
              icon="⚠️"
              title="Não foi possível sincronizar os cursos"
              description="Tivemos uma oscilação temporária de conexão ao carregar a lista de cursos. Que tal tentar novamente?"
            >
              <ActionButton onClick={() => setCoursesReloadKey((v) => v + 1)}>
                Tentar Novamente
              </ActionButton>
            </StatusPanel>
          ) : (
            <>
              {/* CONTROLES: GERAL vs POR CURSO + BUSCA */}
              <RankingControls
                mode={rankingMode}
                onModeChange={setRankingMode}
                courses={courses}
                selectedCourseId={selectedCourseId}
                onCourseChange={setSelectedCourseId}
                enrolledCourseIds={enrolledCourseIds}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                totalParticipants={entries.length}
              />

              {/* ESTADOS DO RANKING */}
              {rankingState === 'loading' || rankingState === 'idle' ? (
                <StatusPanel
                  icon="⚡"
                  title="Atualizando a classificação..."
                  description={`Buscando as pontuações mais recentes ${
                    rankingMode === 'global'
                      ? 'no Hall da Fama Global'
                      : selectedCourse
                        ? `da turma de ${selectedCourse.title}`
                        : ''
                  }.`}
                />
              ) : rankingState === 'forbidden' ? (
                <StatusPanel
                  icon="🎓"
                  title="Você ainda não iniciou este curso"
                  description="A classificação desta turma é exclusiva para os alunos com matrícula ativa no módulo. Comece o curso gratuitamente para participar da disputa e acompanhar seus colegas!"
                >
                  <ActionLink href={`/courses/${selectedCourse?.slug || ''}`}>
                    Começar Este Curso
                  </ActionLink>
                  <ActionButton onClick={() => setRankingMode('global')}>
                    Ver Ranking Geral
                  </ActionButton>
                </StatusPanel>
              ) : rankingState === 'unauthorized' ? (
                <StatusPanel
                  icon="🔒"
                  title="Sessão expirada"
                  description="Sua sessão expirou por segurança. Faça login novamente para continuar acumulando pontos."
                >
                  <ActionLink href="/login">Fazer Login</ActionLink>
                </StatusPanel>
              ) : rankingState === 'error' ? (
                <StatusPanel
                  icon="⚠️"
                  title="Não foi possível carregar a classificação"
                  description="Tivemos uma oscilação na conexão ao buscar os dados deste ranking. Vamos recarregar?"
                >
                  <ActionButton onClick={() => setRankingReloadKey((v) => v + 1)}>
                    Recarregar Classificação
                  </ActionButton>
                </StatusPanel>
              ) : entries.length === 0 ? (
                <StatusPanel
                  icon="🚀"
                  title="Turma recém-inaugurada!"
                  description="Ainda não há alunos com pontuação registrada nesta divisão. Conclua o primeiro desafio de código para inaugurar o pódio e liderar o ranking!"
                >
                  <ActionLink href="/courses">Explorar Desafios</ActionLink>
                </StatusPanel>
              ) : (
                <>
                  {/* Faixas de XP */}
                  <XpBandHeader bands={XP_BANDS} currentEntry={currentEntry} />

                  {/* Pódio dos 3 Primeiros Colocados */}
                  {!searchQuery && <PodiumTop3 top3={entries.slice(0, 3)} />}

                  {/* Tabela Completa de Desenvolvedores */}
                  <LeaderboardTable users={filteredEntries} />
                </>
              )}
            </>
          )}
        </main>

        {/* Rodapé */}
        <footer className="h-16 border-t border-[#1C2338] px-8 flex items-center justify-between text-xs font-mono text-[#64748B]">
          <span>© 2026 Nexus Code • Classificação &amp; Ligas de Maestria</span>
          <span>Atualizado em tempo real por desafios concluídos</span>
        </footer>
      </div>
    </div>
  );
}
