import React from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { getDetailedCourseBySlug } from './courseDetailsData';
import { CourseHeroHeader } from './components/CourseHeroHeader';
import { ModulesAccordion } from './components/ModulesAccordion';
import { PrerequisitesRoadmap } from './components/PrerequisitesRoadmap';
import { SocraticFocusCard } from './components/SocraticFocusCard';
import { ProjectCapstoneCard } from './components/ProjectCapstoneCard';

interface CourseDetailPageProps {
  params: {
    slug: string;
  };
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const course = getDetailedCourseBySlug(params.slug);

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black pb-24">
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link
                href="/courses"
                className="text-white border-b-2 border-[#04D361] pb-1 font-semibold"
              >
                Cursos &amp; Trilhas
              </Link>
              <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                Leaderboard
              </Link>
              <Link href="/ide" className="text-zinc-400 hover:text-white transition-colors">
                IDE Sandbox
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/courses"
              className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181820] border border-[#27272A]"
            >
              ← Voltar aos Cursos
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="max-w-[1240px] mx-auto px-5 pt-8 space-y-8">
        {/* Course Hero with Stats and CTA */}
        <CourseHeroHeader course={course} />

        {/* Prerequisites Roadmap */}
        <PrerequisitesRoadmap nodes={course.prerequisites} />

        {/* Grid: Modules Accordion (Left) + Socratic / Capstone (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <ModulesAccordion modules={course.modules} courseSlug={course.slug} />
          </div>

          <div className="space-y-6">
            <SocraticFocusCard focusAreas={course.socraticFocusAreas} />

            <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white font-heading mb-2 flex items-center gap-2">
                <span>🛡️</span>
                <span>Garantia de Validação Git</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Todas as lições exigem push de commits reais validados pela suíte de testes do Piston Sandbox. Nenhuma aula pode ser concluída passivamente.
              </p>
            </div>
          </div>
        </div>

        {/* Capstone Project Card */}
        <ProjectCapstoneCard capstone={course.capstone} courseSlug={course.slug} />
      </main>
    </div>
  );
}
