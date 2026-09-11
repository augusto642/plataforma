'use client';

import React, { useState, useEffect, useRef } from 'react';
import './dashboard.css';
import { Topbar } from './components/Topbar';
import { HeroActiveMission } from './components/HeroActiveMission';
import { WeeklyGoalRing } from './components/WeeklyGoalRing';
import { SkillRoadmapTree } from './components/SkillRoadmapTree';
import { SkillsRadarChart } from './components/SkillsRadarChart';
import { AnnualHeatmap } from './components/AnnualHeatmap';
import { WeeklyLeagueTable } from './components/WeeklyLeagueTable';
import { SocraticCopilotBox } from './components/SocraticCopilotBox';
import { CelebrationModal } from './components/CelebrationModal';
import { TutorModal } from './components/TutorModal';
import { DEFAULT_DASHBOARD_DATA, fetchDashboardData } from './utils/api';
import { fireConfetti } from './utils/confetti';
import { StudentDashboardData } from './types';

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardData>(DEFAULT_DASHBOARD_DATA);
  const [userXp, setUserXp] = useState<number>(DEFAULT_DASHBOARD_DATA.user.xp);
  const [userLevel, setUserLevel] = useState<number>(DEFAULT_DASHBOARD_DATA.user.level);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
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

  const handleSearch = (query: string) => {
    if (query.trim()) {
      alert(`Buscando por: "${query}" na base de conhecimento e desafios...`);
    }
  };

  const currentUserData = {
    ...data.user,
    xp: userXp,
    level: userLevel,
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="dashboard-root min-h-screen flex flex-col antialiased selection:bg-[#8257E5] selection:text-white bg-[#09090A] text-[#EDEDED]"
    >
      {/* 1. TOPBAR */}
      <Topbar
        user={currentUserData}
        onSimulateChallenge={handleSimulateChallenge}
        onSearch={handleSearch}
      />

      {/* 2. MAIN BENTO GRID */}
      <main ref={mainRef} className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-8 space-y-6">
        
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
        <SkillRoadmapTree
          nodes={data.skillRoadmap}
          onSelectActiveNode={() => {
            window.location.href = '/';
          }}
        />

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

        {/* SECTION 4: LIGA SEMANAL + TUTOR SOCRÁTICO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 flex flex-col">
            <WeeklyLeagueTable
              leagueName={data.user.league.name}
              timeRemaining={data.user.league.timeRemaining}
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
        leaguePosition={`#${data.user.league.rank} na ${data.user.league.name}`}
        onContinue={() => {
          setCelebrationOpen(false);
          window.location.href = '/';
        }}
      />

      {/* 4. TUTOR SOCRÁTICO MODAL */}
      <TutorModal
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
        activityTitle={data.activeMission.title}
      />
    </div>
  );
}
