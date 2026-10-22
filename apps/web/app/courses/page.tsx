'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CourseListItem } from './types';
import {
  extractCoursesProgress,
  extractMyStats,
  initialsOf,
  mapApiCourses,
  pickActiveProgress,
  progressByCourseId,
} from './utils';
import Logo from '../components/Logo';
import { ActiveMissionBanner } from './components/ActiveMissionBanner';
import { CourseFilters } from './components/CourseFilters';
import { CourseCard } from './components/CourseCard';
import { CourseModal } from './components/CourseModal';
import { useCoursesQuery, useMyProgressQuery } from '../hooks/useCoursesQuery';
import { useAuth } from '../context/AuthContext';

// B41 (Sprint 14) — a listagem pública de cursos exibia um catálogo
// estático inventado (COURSES_DATA) justamente para quem não estava
// logado, "enriquecia" cursos reais com defaults fabricados ('40h',
// '3.000 XP', descrição pronta) e mostrava progresso pessoal falso
// (68%) e estatísticas fixas no cabeçalho. Agora:
// - deslogado: estado honesto — nenhum curso, número ou avatar é
//   exibido, porque GET /courses exige sessão;
// - logado: catálogo somente da API, progresso somente de
//   GET /users/me/progress e cabeçalho somente do usuário real.
export default function CoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseListItem | null>(null);

  const {
    data: apiCoursesRaw,
    isLoading: coursesLoading,
    isError: coursesError,
    refetch: refetchCourses,
  } = useCoursesQuery();
  const { data: progressRaw } = useMyProgressQuery(Boolean(user));

  const allCourses = useMemo(() => mapApiCourses(apiCoursesRaw), [apiCoursesRaw]);

  const progressEntries = useMemo(
    () => extractCoursesProgress(progressRaw),
    [progressRaw],
  );
  const progressMap = useMemo(
    () => progressByCourseId(progressEntries),
    [progressEntries],
  );
  const activeProgress = useMemo(
    () => pickActiveProgress(progressEntries),
    [progressEntries],
  );

  // Stats do cabeçalho: somente do progresso real do usuário logado.
  const myStats = useMemo(() => extractMyStats(progressRaw), [progressRaw]);
  const headerXp = myStats?.xp ?? null;
  const headerStreak = myStats?.streakDays ?? null;

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allCourses;
    return allCourses.filter(
      (course) =>
        course.title.toLowerCase().includes(query) ||
        (course.description ?? '').toLowerCase().includes(query) ||
        (course.instructorName ?? '').toLowerCase().includes(query),
    );
  }, [allCourses, searchQuery]);

  const isLoading = authLoading || (Boolean(user) && coursesLoading);

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black">
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#08080B]/85 backdrop-blur-md border-b border-[#27272A] h-16">
        <div className="max-w-[1200px] mx-auto px-5 h-full flex items-center justify-between">
          {/* Brand Logo */}
          <Logo size="md" href="/" />

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/courses"
              className="text-white border-b-2 border-[#04D361] pb-1 font-semibold"
            >
              Cursos &amp; Trilhas
            </Link>
            <Link
              href="/dashboard"
              className="text-zinc-400 hover:text-white transition-colors pb-1"
            >
              Dashboard
            </Link>
            <Link
              href="/ide"
              className="text-zinc-400 hover:text-white transition-colors pb-1"
            >
              IDE de Exercícios
            </Link>
          </nav>

          {/* User Stats & Avatar — somente do usuário real logado */}
          {user ? (
            <div className="flex items-center gap-3">
              {headerStreak !== null ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#F59E0B] text-xs font-mono font-bold">
                  <span>🔥</span>
                  <span>
                    {headerStreak} {headerStreak === 1 ? 'Dia' : 'Dias'}
                  </span>
                </div>
              ) : null}
              {headerXp !== null ? (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold">
                  <span>⚡</span>
                  <span>{headerXp.toLocaleString('pt-BR')} XP</span>
                </div>
              ) : null}
              <div
                className="w-9 h-9 rounded-[10px] bg-[#27272A] border border-zinc-700 flex items-center justify-center text-xs font-bold text-white font-mono shadow-sm"
                title={user.name}
              >
                {initialsOf(user.name)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-bold px-4 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-xs font-bold px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white transition-colors"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION & CONTENT CONTAINER                                       */}
      {/* ========================================================================= */}
      <main className="max-w-[1200px] mx-auto px-5 pb-20">
        <section className="pt-10 pb-6">
          <div className="inline-block px-3 py-1 rounded-full bg-[#04D361]/10 border border-[#04D361]/30 text-[#04D361] text-[11px] font-mono font-bold mb-3">
            🎯 TRILHAS DE FORMAÇÃO DE ELITE
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[38px] font-extrabold font-heading tracking-tight leading-[1.15] mb-2 text-white">
            Aprenda Construindo{' '}
            <span className="bg-gradient-to-r from-[#996DFF] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">
              Projetos Reais
            </span>
          </h1>
          <p className="text-zinc-400 text-[15px] max-w-[650px] leading-relaxed">
            Zero vídeo passivo. Desafios integrados ao Git real, testes automatizados e mentoria socrática por IA linha a linha.
          </p>
        </section>

        {authLoading ? (
          <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-12 text-center my-8 animate-pulse">
            <p className="text-sm font-mono text-zinc-500">Verificando sua sessão…</p>
          </div>
        ) : !user ? (
          /* Estado honesto para o visitante: o catálogo exige sessão. */
          <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-12 text-center my-8">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-white font-heading mb-1">
              Catálogo disponível para alunos conectados
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
              A lista de cursos e trilhas é carregada da plataforma para quem tem
              uma conta e está conectado. Entre ou crie sua conta para ver os
              cursos reais e o seu progresso neles.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Link
                href="/login"
                className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="bg-transparent border border-zinc-700 hover:border-[#8257E5] text-zinc-200 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Criar conta
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ACTIVE MISSION BANNER — só com matrícula real em andamento */}
            {activeProgress ? <ActiveMissionBanner progress={activeProgress} /> : null}

            {/* SEARCH */}
            <CourseFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} />

            {/* ===================================================================== */}
            {/* 3. COURSES GRID & SKELETONS                                           */}
            {/* ===================================================================== */}
            {isLoading ? (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className="bg-[#121217] border border-[#27272A] rounded-[20px] p-6 h-[260px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/60" />
                        <div className="w-20 h-5 rounded-full bg-zinc-800/60" />
                      </div>
                      <div className="w-3/4 h-5 rounded bg-zinc-800/80 mb-2" />
                      <div className="w-full h-3 rounded bg-zinc-800/40 mb-1" />
                      <div className="w-2/3 h-3 rounded bg-zinc-800/40" />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40">
                      <div className="w-16 h-4 rounded bg-zinc-800/50" />
                      <div className="w-24 h-4 rounded bg-zinc-800/50" />
                    </div>
                  </div>
                ))}
              </section>
            ) : coursesError ? (
              <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-12 text-center my-8">
                <div className="text-3xl mb-3">⚠️</div>
                <h3 className="text-lg font-bold text-white font-heading mb-1">
                  Não foi possível carregar os cursos
                </h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
                  A plataforma não respondeu com o catálogo agora. Nenhum curso de
                  exemplo é exibido no lugar — tente novamente.
                </p>
                <button
                  type="button"
                  onClick={() => void refetchCourses()}
                  className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredCourses.length > 0 ? (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={progressMap.get(course.id)}
                    onSelect={(selected) => setSelectedCourse(selected)}
                  />
                ))}
              </section>
            ) : allCourses.length === 0 ? (
              <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-12 text-center my-8">
                <div className="text-3xl mb-3">📚</div>
                <h3 className="text-lg font-bold text-white font-heading mb-1">
                  Nenhum curso publicado no momento
                </h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  O catálogo real da plataforma não retornou nenhum curso agora.
                </p>
              </div>
            ) : (
              <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-12 text-center my-8">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="text-lg font-bold text-white font-heading mb-1">
                  Nenhum curso encontrado
                </h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
                  Não encontramos nenhum curso para &quot;{searchQuery}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Limpar Busca
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. COURSE DETAILS MODAL / DRAWER                                          */}
      {/* ========================================================================= */}
      <CourseModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
