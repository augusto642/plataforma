'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CatalogCourse } from '../../lib/catalog';
import { courseLanguage, languageLabel, mapCatalogCourse } from '../../lib/catalog';
import {
  extractCoursesProgress,
  pickActiveProgress,
  progressByCourseSlug,
} from './utils';
import { MaterialIcon } from '../../components/MaterialIcon';
import { ActiveMissionBanner } from './components/ActiveMissionBanner';
import { CourseFilters } from './components/CourseFilters';
import { CourseCard } from './components/CourseCard';
import { usePublicCatalogQuery, useMyProgressQuery } from '../../hooks/useCoursesQuery';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';

export default function CoursesPage() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
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
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Sidebar Lateral Oficial com Suporte a Retrair */}
      <StudentSidebar />

      {/* Área de Conteúdo à Direita com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Header Superior */}
        <StudentHeader
          title="Catálogo de Cursos"
          subtitle="Módulos & Trilhas"
        />

        {/* Conteúdo Principal */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-5 lg:px-10 py-8 space-y-8">
          {/* Header & Apresentação */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1C2338]">
            <div>
              <span className="font-mono text-xs text-[#8257E5] font-bold uppercase tracking-wider block mb-1">
                MATRIZ CURRICULAR DE ENGENHARIA
              </span>
              <h1 className="font-brand text-2xl md:text-3xl text-white font-extrabold tracking-tight">
                Especializações Técnicas &amp; Labs Práticos
              </h1>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-2xl leading-relaxed">
                Especializações modulares com baterias de testes unitários em sandbox isolado, design de software e acompanhamento socrático contínuo da Tutora Lumi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/trilha/sugerida"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-[#A379FF] text-xs font-semibold transition-colors"
              >
                <MaterialIcon name="auto_awesome" className="text-[16px]" />
                <span>Trilha Personalizada IA</span>
              </Link>
            </div>
          </div>

          {/* ACTIVE MISSION BANNER — se tiver curso ativo */}
          {activeProgress ? <ActiveMissionBanner progress={activeProgress} /> : null}

          {/* FILTERS & SEARCH */}
          <CourseFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            chips={chips}
            selectedChip={selectedChip}
            onChipChange={setSelectedChip}
          />

          {/* COURSES GRID */}
          {isLoading ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl h-[280px]"
                />
              ))}
            </section>
          ) : catalogError ? (
            <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-12 text-center my-8">
              <div className="w-12 h-12 rounded-xl bg-[#F43F5E]/15 text-[#F43F5E] flex items-center justify-center mx-auto mb-3">
                <MaterialIcon name="error_outline" className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white font-brand mb-1">
                Não foi possível carregar os cursos
              </h3>
              <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-5 leading-relaxed">
                A plataforma não respondeu com o catálogo agora. Verifique a conexão com a API e tente novamente.
              </p>
              <button
                type="button"
                onClick={() => void refetchCatalog()}
                className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
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
            <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-12 text-center my-8">
              <div className="w-12 h-12 rounded-xl bg-[#121624] border border-[#1C2338] text-[#A379FF] flex items-center justify-center mx-auto mb-3">
                <MaterialIcon name="inventory_2" className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white font-brand mb-1">
                Nenhum curso publicado no momento
              </h3>
              <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
                O catálogo real da plataforma não retornou nenhum curso no momento.
              </p>
            </div>
          ) : (
            <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-12 text-center my-8">
              <div className="w-12 h-12 rounded-xl bg-[#121624] border border-[#FFA116]/30 text-[#FFA116] flex items-center justify-center mx-auto mb-3">
                <MaterialIcon name="search_off" className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-white font-brand mb-1">
                Nenhum curso encontrado
              </h3>
              <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-5">
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

        {/* Rodapé Minimalista */}
        <footer className="h-16 border-t border-[#1C2338] bg-[#07090E] px-8 flex items-center justify-between text-xs font-mono text-[#94A3B8]">
          <span>© 2026 Nexus Code • Plataforma de Aprendizado Prático</span>
          <span>Aprenda programando de verdade</span>
        </footer>
      </div>
    </div>
  );
}
