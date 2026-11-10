'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';
import { Topbar } from './components/Topbar';
import { HeroActiveMission } from './components/HeroActiveMission';
import { SkillRoadmapTree } from './components/SkillRoadmapTree';
import { SkillsRadarChart } from './components/SkillsRadarChart';
import { AnnualHeatmap } from './components/AnnualHeatmap';
import { CourseRankingTable } from './components/CourseRankingTable';
import { SocraticCopilotBox } from './components/SocraticCopilotBox';
import { ConceptsToReinforce } from './components/ConceptsToReinforce';
import { CelebrationModal } from './components/CelebrationModal';
import { TutorModal } from './components/TutorModal';
import { CareerPetBanner } from './components/CareerPetBanner';
import { DynamicTrackCard } from './components/DynamicTrackCard';
import { DailyMissions } from './components/DailyMissions';
import { LeagueCard } from './components/LeagueCard';
import PwaInstallBanner from './components/PwaInstallBanner';
import { PetEvolutionModal } from '../game/components/PetEvolutionModal';
import { fetchDashboardData } from './utils/api';
import { fireConfetti } from './utils/confetti';
import { StudentDashboardData } from './types';

export default function StudentDashboardPage() {
  const router = useRouter();
  // Retrabalho Central 213 (D5) — o estado inicial é VAZIO: antes, o
  // dashboard nascia com DEFAULT_DASHBOARD_DATA e exibia "Augusto
  // Silva / 4.850 XP / nível 25" e leaderboard fictício mesmo com a API
  // fora do ar. Agora só há dados na tela quando a API respondeu.
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [userXp, setUserXp] = useState<number | null>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let isMounted = true;
    fetchDashboardData().then((fetched) => {
      if (!isMounted) return;
      if (fetched) {
        setData(fetched);
        setUserXp(fetched.user.xp);
        setUserLevel(fetched.user.level);
      } else {
        setLoadFailed(true);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetryLoad = () => {
    setIsLoading(true);
    setLoadFailed(false);
    fetchDashboardData().then((fetched) => {
      if (fetched) {
        setData(fetched);
        setUserXp(fetched.user.xp);
        setUserLevel(fetched.user.level);
      } else {
        setLoadFailed(true);
      }
      setIsLoading(false);
    });
  };

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
    if (userXp === null || userLevel === null) return;
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

  // D5 — estados honestos: carregando não mostra número nenhum e a
  // falha da API não mostra dado inventado, só o erro e a nova tentativa.
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

  const currentUserData = {
    ...data.user,
    xp: userXp ?? data.user.xp,
    level: userLevel ?? data.user.level,
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

        {/* SECTION 0.5: TRILHA DINÂMICA (Redesign v2 + 209) — preparando /
            sugerida / toast. A sugestão só renderiza com dado real da API
            (GET /dynamic-track/me) — nunca uma sugestão inventada. */}
        <DynamicTrackCard />

        {/* SECTION 1: HERO ACTIVE MISSION — Central 216 (auditoria do
            Designer, item 4): a meta semanal (8,5/10h, 85%) era dado
            do molde sem endpoint e foi removida do modelo; o Hero
            ocupa a largura cheia e, sem curso iniciado, mostra o
            estado vazio honesto. */}
        <section>
          <HeroActiveMission
            mission={data.activeMission}
            onOpenTutor={() => setTutorOpen(true)}
          />
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

        {/* SECTION 3.6: MISSÕES DE HOJE (Central 216 · F3) — só com
            dados reais (submissões e simulações de hoje); o componente
            some sozinho quando a API não responde. */}
        <DailyMissions />

        {/* SECTION 3.7: SUA LIGA (Central 216 · auditoria §5) — tiers
            reais bronze/prata/ouro (A4); o componente some sozinho sem
            liga ativa ou sem acesso (free). */}
        <LeagueCard />

        {/* SECTION 4: RANKING DO CURSO + TUTOR SOCRÁTICO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 flex flex-col">
            <CourseRankingTable
              leaderboard={data.leaderboard}
              userXp={currentUserData.xp}
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
        newLevel={currentUserData.level}
        onContinue={() => {
          setCelebrationOpen(false);
          router.push('/ide');
        }}
      />

      {/* 4. TUTOR SOCRÁTICO MODAL */}
      <TutorModal
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
        activityTitle={data.activeMission?.title ?? ''}
      />

      {/* 5. PET EVOLUTION / METAMORFOSE CELEBRATION MODAL */}
      <PetEvolutionModal />
    </div>
  );
}
