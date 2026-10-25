'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';
import { Topbar } from './components/Topbar';
import { HeroActiveMission } from './components/HeroActiveMission';
import { WeeklyGoalRing } from './components/WeeklyGoalRing';
import { SkillRoadmapTree } from './components/SkillRoadmapTree';
import { SkillsRadarChart } from './components/SkillsRadarChart';
import { AnnualHeatmap } from './components/AnnualHeatmap';
import { CourseRankingTable } from './components/CourseRankingTable';
import { SocraticCopilotBox } from './components/SocraticCopilotBox';
import { ConceptsToReinforce } from './components/ConceptsToReinforce';
import { CelebrationModal } from './components/CelebrationModal';
import { TutorModal } from './components/TutorModal';
import { CareerPetBanner } from './components/CareerPetBanner';
import PwaInstallBanner from './components/PwaInstallBanner';
import { PetEvolutionModal } from '../game/components/PetEvolutionModal';
import { DEFAULT_DASHBOARD_DATA, fetchDashboardData } from './utils/api';
import { fireConfetti } from './utils/confetti';
import { StudentDashboardData } from './types';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData>(DEFAULT_DASHBOARD_DATA);
  const [userXp, setUserXp] = useState<number>(DEFAULT_DASHBOARD_DATA.user.xp);
  const [userLevel, setUserLevel] = useState<number>(DEFAULT_DASHBOARD_DATA.user.level);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;
    fetchDashboardData().then((fetched) => {
      if (isMounted) {
        setData(fetched);
        setUserXp(fetched.user.xp);
        setUserLevel(fetched.user.level);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Spotlight mouse tracking effect for bento cards (throttled with rAF)
  const rafRef = useRef<number | null>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafRef.current = requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.spotlight-card');
      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
      });
      rafRef.current = null;
    });
  };

  const handleSimulateChallenge = async () => {
    const newXp = userXp + 250;
    const newLvl = Math.floor(newXp / 200) + 1;
    setUserXp(newXp);
    setUserLevel(newLvl);

    // Fire Confetti explosion
    await fireConfetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#00B37E', '#8257E5', '#0070F3', '#FFA116', '#04D361'],
    });

    // Open celebration modal
    setCelebrationOpen(true);
  };

  // B05: busca sem alert() — aviso temporário não-bloqueante + leva o aluno
  // até a árvore de habilidades, onde estão os desafios.
  const handleSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setSearchNotice(`Busca por "${q}" — explore os desafios na árvore de habilidades abaixo.`);
    document.getElementById('skill-roadmap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchNotice(null), 4000);
  };

  const currentUserData = {
    ...data.user,
    xp: userXp,
    level: userLevel,
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="dashboard-root min-h-screen flex flex-col antialiased selection:bg-[#8257E5] selection:text-white bg-background text-ink-heading"
    >
      {/* Aviso temporário da busca (não-bloqueante) */}
      {searchNotice && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-surface-3 border border-border-2 text-ink-body text-xs font-medium shadow-2xl"
        >
          {searchNotice}
        </div>
      )}
      {/* 1. TOPBAR */}
      <Topbar
        user={currentUserData}
        onSimulateChallenge={handleSimulateChallenge}
        onSearch={handleSearch}
      />

      {/* 2. MAIN BENTO GRID */}
      <main ref={mainRef} className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Fase 5 premium (§6.2) — banner de instalação do PWA. */}
        <PwaInstallBanner />

        {/* SECTION 0: CARREIRA & PET COMPANION STATUS BANNER */}
        <CareerPetBanner />

        {/* SECTION 1: HERO ACTIVE MISSION & WEEKLY GOAL */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col">
            <HeroActiveMission
              mission={data.activeMission}
              onOpenTutor={() => setTutorOpen(true)}
            />
          </div>
          <div className="lg:col-span-4 flex flex-col">
            <WeeklyGoalRing goal={data.weeklyGoal} />
          </div>
        </section>

        {/* SECTION 2: SKILL TREE / ROADMAP DE NÓS */}
        <div id="skill-roadmap">
          <SkillRoadmapTree
            nodes={data.skillRoadmap}
            onSelectActiveNode={() => {
              router.push('/ide');
            }}
          />
        </div>

        {/* SECTION 2.5: CONCEITOS PARA REFORÇAR (Sprint 21 — só aparece
            quando há conceito frágil derivado das submissões reais) */}
        <ConceptsToReinforce />

        {/* SECTION 3: RADAR DE HABILIDADES + HEATMAP ANUAL */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col">
            <SkillsRadarChart
              overallIndex={data.radarSkills.overallIndex}
              skills={data.radarSkills.skills}
            />
          </div>
          <div className="lg:col-span-7 flex flex-col">
            <AnnualHeatmap heatmap={data.heatmap} />
          </div>
        </section>

        {/* SECTION 3.5: DESAFIO DA SEMANA + COMUNIDADE (Fase 3 premium) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 flex flex-col">
            <a
              href="/desafios"
              className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5 hover:border-[#8257E5]/60 transition-colors"
            >
              <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
                Desafio da semana
              </span>
              <span className="block font-bold text-white mt-2">
                Participe, suba na liga e ganhe pontos
              </span>
              <span className="block text-sm text-zinc-400 mt-1">
                Um problema curto por semana, com ranking por nível — iniciante compete com
                iniciante. Participar já rende pontos.
              </span>
            </a>
          </div>
          <div className="lg:col-span-6 flex flex-col">
            <a
              href="/comunidade"
              className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5 hover:border-[#8257E5]/60 transition-colors"
            >
              <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
                Comunidade
              </span>
              <span className="block font-bold text-white mt-2">
                Fórum, galeria de soluções e revisão por pares
              </span>
              <span className="block text-sm text-zinc-400 mt-1">
                Discuta o desafio da semana, compartilhe sua solução aprovada e revise o
                código de colegas.
              </span>
            </a>
          </div>
        </section>

        {/* SECTION 4: RANKING DO CURSO + TUTOR SOCRÁTICO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 flex flex-col">
            <CourseRankingTable
              leaderboard={data.leaderboard}
              userXp={userXp}
            />
          </div>
          <div className="lg:col-span-6 flex flex-col">
            <SocraticCopilotBox
              socraticAi={data.socraticAi}
              onOpenChat={() => setTutorOpen(true)}
            />
          </div>
        </section>

      </main>

      {/* 3. CELEBRATION MODAL */}
      <CelebrationModal
        isOpen={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        xpGained={250}
        newLevel={userLevel}
        onContinue={() => {
          setCelebrationOpen(false);
          router.push('/ide');
        }}
      />

      {/* 4. TUTOR SOCRÁTICO MODAL */}
      <TutorModal
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
        activityTitle={data.activeMission.title}
      />

      {/* 5. PET EVOLUTION / METAMORFOSE CELEBRATION MODAL */}
      <PetEvolutionModal />
    </div>
  );
}
