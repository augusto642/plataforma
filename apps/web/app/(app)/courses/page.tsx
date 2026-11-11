'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CatalogCourse } from '../../lib/catalog';
import { courseLanguage, languageLabel, mapCatalogCourse } from '../../lib/catalog';
import {
  extractCoursesProgress,
  extractMyStats,
  initialsOf,
  pickActiveProgress,
  progressByCourseSlug,
} from './utils';
import Logo from '../../components/Logo';
import { MaterialIcon } from '../../components/MaterialIcon';
import { ActiveMissionBanner } from './components/ActiveMissionBanner';
import { CourseFilters } from './components/CourseFilters';
import { CourseCard } from './components/CourseCard';
import { usePublicCatalogQuery, useMyProgressQuery } from '../../hooks/useCoursesQuery';
import { useAuth } from '../../context/AuthContext';

// Central 216 (F2/A5) — catálogo no visual do protótipo Stitch v2
// (catalogo-cursos-mobile.html): "Cursos Avulsos / Aprenda no seu
// ritmo", busca + chips de linguagem, capas locais (F4) e "Acessar
// curso" → rota real /courses/[slug].
// Fonte: GET /courses/public-catalog (público — visitante vê o
// catálogo sem login; o detalhe pede sessão, como já fazia a rota
// [slug]). A busca filtra título/descrição reais e os chips filtram
// a linguagem real das atividades — nada de curso inventado.
// O progresso só aparece para o usuário logado, casado por slug.
export default function CoursesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState('Todos');

  const {
    data: catalogRaw,
    isLoading: catalogLoading,
    isError: catalogError,
    refetch: refetchCatalog,
  } = usePublicCatalogQuery();
  const { data: progressRaw } = useMyProgressQuery(Boolean(user));

  const allCourses = useMemo(() => {
    if (!Array.isArray(catalogRaw)) return [];
    return catalogRaw
      .map((item) => mapCatalogCourse(item))
      .filter((course): course is CatalogCourse => course !== null);
  }, [catalogRaw]);

  const progressEntries = useMemo(
    () => extractCoursesProgress(progressRaw),
    [progressRaw],
  );
  const progressMap = useMemo(
    () => progressByCourseSlug(progressEntries),
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

  // Chips: linguagens reais presentes no catálogo, na ordem em que
  // aparecem — "Todos" primeiro. Sem linguagem presente, sem chip.
  const chips = useMemo(() => {
    const seen = new Set<string>();
    for (const course of allCourses) {
      seen.add(languageLabel(courseLanguage(course)));
    }
    return ['Todos', ...seen];
  }, [allCourses]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allCourses.filter((course) => {
      if (selectedChip !== 'Todos' && languageLabel(courseLanguage(course)) !== selectedChip) {
        return false;
      }
      if (!query) return true;
      return (
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
      );
    });
  }, [allCourses, searchQuery, selectedChip]);

  const isLoading = catalogLoading;

  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface font-body selection:bg-[#04D361] selection:text-black flex flex-col">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-dark-surface/85 backdrop-blur-md border-b border-border-subtle h-16">
        <div className="max-w-[1200px] mx-auto px-5 h-full flex items-center justify-between">
          <Logo size="md" href="/" />
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
                  <MaterialIcon name="local_fire_department" className="text-[14px]" />
                  <span>
                    {headerStreak} {headerStreak === 1 ? 'Dia' : 'Dias'}
                  </span>
                </div>
              ) : null}
              {headerXp !== null ? (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold">
                  <MaterialIcon name="bolt" className="text-[14px]" />
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

      {/* 2. HERO SECTION & CONTENT CONTAINER */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 pb-20">
        <section className="pt-10 pb-2">
          <span className="font-code text-[10px] text-primary font-bold uppercase tracking-wider block mb-1">
            Cursos Avulsos
          </span>
          <h1 className="font-headline text-display-md-mobile text-white font-extrabold tracking-tight">
            Aprenda no seu ritmo
          </h1>
          <p className="text-xs text-dark-on-surface-variant mt-1.5 leading-relaxed">
            Módulos práticos focados em linguagens e ferramentas pontuais com desafios no
            navegador.
          </p>
        </section>

        {/* ACTIVE MISSION BANNER — só com matrícula real em andamento */}
        {activeProgress ? <ActiveMissionBanner progress={activeProgress} /> : null}

        {/* SEARCH + CHIPS — sobre o catálogo público real */}
        <CourseFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          chips={chips}
          selectedChip={selectedChip}
          onChipChange={setSelectedChip}
        />

        {/* 3. COURSES GRID & SKELETONS */}
        {isLoading ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-dark-surface-container-low border border-border-strong rounded-xl h-[260px]"
              />
            ))}
          </section>
        ) : catalogError ? (
          <div className="bg-dark-surface-container-low border border-border-strong rounded-xl p-12 text-center my-8">
            <h3 className="text-lg font-bold text-white font-headline mb-1">
              Não foi possível carregar os cursos
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
              A plataforma não respondeu com o catálogo agora. Nenhum curso de exemplo é
              exibido no lugar — tente novamente.
            </p>
            <button
              type="button"
              onClick={() => void refetchCatalog()}
              className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredCourses.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.slug}
                course={course}
                progress={progressMap.get(course.slug)}
              />
            ))}
          </section>
        ) : allCourses.length === 0 ? (
          <div className="bg-dark-surface-container-low border border-border-strong rounded-xl p-12 text-center my-8">
            <h3 className="text-lg font-bold text-white font-headline mb-1">
              Nenhum curso publicado no momento
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              O catálogo real da plataforma não retornou nenhum curso agora.
            </p>
          </div>
        ) : (
          <div className="bg-dark-surface-container-low border border-border-strong rounded-xl p-12 text-center my-8">
            <h3 className="text-lg font-bold text-white font-headline mb-1">
              Nenhum curso encontrado
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
              Não encontramos nenhum curso para &quot;{searchQuery}
              {selectedChip !== 'Todos' ? `&quot; em ${selectedChip}` : '&quot;'}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedChip('Todos');
              }}
              className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Limpar busca
            </button>
          </div>
        )}
      </main>

      <footer className="h-16 border-t border-border-subtle px-8 flex items-center justify-center text-xs font-code text-dark-on-surface-variant">
        © 2026 Nexus Code • Catálogo de cursos avulsos
      </footer>
    </div>
  );
}
