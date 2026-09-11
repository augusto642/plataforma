'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Course, FilterLevel } from './types';
import { COURSES_DATA } from './data';
import Logo from '../components/Logo';
import { ActiveMissionBanner } from './components/ActiveMissionBanner';
import { CourseFilters } from './components/CourseFilters';
import { CourseCard } from './components/CourseCard';
import { CourseModal } from './components/CourseModal';

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<FilterLevel>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Filter courses based on search query, level and selected tag
  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return COURSES_DATA.filter((course) => {
      // 1. Text search match (title, desc, shortDesc, tags, filterTags)
      const matchesSearch =
        !query ||
        course.title.toLowerCase().includes(query) ||
        (course.modalTitle && course.modalTitle.toLowerCase().includes(query)) ||
        course.desc.toLowerCase().includes(query) ||
        (course.shortDesc && course.shortDesc.toLowerCase().includes(query)) ||
        course.tags.some((t) => t.toLowerCase().includes(query)) ||
        course.filterTags.some((ft) => ft.toLowerCase().includes(query));

      // 2. Level filter match
      const matchesLevel =
        selectedLevel === 'all' ||
        course.level === selectedLevel ||
        course.level === 'Todos os Níveis';

      // 3. Tag filter match
      const matchesTag =
        !selectedTag ||
        course.tags.some((t) => t.toLowerCase().includes(selectedTag.toLowerCase())) ||
        course.filterTags.some((ft) => ft.toLowerCase().includes(selectedTag.toLowerCase()));

      return matchesSearch && matchesLevel && matchesTag;
    });
  }, [searchQuery, selectedLevel, selectedTag]);

  const handleTagToggle = (tagValue: string) => {
    setSelectedTag((prev) => (prev === tagValue ? null : tagValue));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLevel('all');
    setSelectedTag(null);
  };

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

          {/* User Stats & Avatar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#F59E0B] text-xs font-mono font-bold">
              <span>🔥</span>
              <span>14 Dias</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold">
              <span>⚡</span>
              <span>3.840 XP</span>
            </div>
            <div className="w-9 h-9 rounded-[10px] bg-[#27272A] border border-zinc-700 flex items-center justify-center text-xs font-bold text-white font-mono shadow-sm">
              AG
            </div>
          </div>
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

          {/* ACTIVE MISSION BANNER */}
          <ActiveMissionBanner
            onContinue={() => {
              const fullstackCourse = COURSES_DATA.find((c) => c.id === 'fullstack') || COURSES_DATA[0];
              setSelectedCourse(fullstackCourse);
            }}
          />

          {/* SEARCH & FILTERS */}
          <CourseFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            selectedTag={selectedTag}
            onTagToggle={handleTagToggle}
          />
        </section>

        {/* ========================================================================= */}
        {/* 3. COURSES GRID                                                           */}
        {/* ========================================================================= */}
        {filteredCourses.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={(selected) => setSelectedCourse(selected)}
              />
            ))}
          </section>
        ) : (
          <div className="bg-[#121217] border border-[#27272A] rounded-[20px] p-12 text-center my-8">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-white font-heading mb-1">
              Nenhum curso encontrado
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5">
              Não encontramos nenhum curso com os filtros selecionados para &quot;{searchQuery || selectedTag || selectedLevel}&quot;.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
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
