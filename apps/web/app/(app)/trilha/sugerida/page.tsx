'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { MaterialIcon } from '../../../components/MaterialIcon';
import {
  fetchMyInvestigation,
  formatTrackDate,
  hasMarketEvidence,
  markInvestigationSeen,
  refreshInvestigation,
  startInvestigation,
  type DynamicTrackView,
} from '../../../lib/dynamic-track';
import {
  CAREER_GOALS,
  PRIMARY_TECHNOLOGIES,
  type CareerGoal,
  type PrimaryTechId,
} from '../../register/data/registrationOptions';
import { TrackFooter, TrackTopbar } from '../components/track-chrome';
import { StudentSidebar } from '../../../components/StudentSidebar';
import { useSidebar } from '../../../context/SidebarContext';

// Central 216 (F1) — rota "Trilha Sugerida" (mobile + desktop num só
// layout responsivo), no visual do protótipo Stitch v2
// (trilha-sugerida-desktop.html / trilha-sugerida-mobile.html).
// Só renderiza com sugestão REAL da API (status ready):
// - investigating → redireciona para /trilha/aguardando;
// - sem investigação/falha → estado honesto com nova tentativa.
// A6 — motivos reais da investigação (rationaleText/reasons) e o
// rodapé "mercado real" só quando marketEvidence.length > 0.
// A10 — o banner "Sua trilha personalizada está pronta" é o toast
// ligado ao estado real (notifiedAt): quando a sugestão ainda não
// foi vista, ele aparece e marca seen.

export default function TrilhaSugeridaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(
    undefined,
  );
  const [bannerVisible, setBannerVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<CareerGoal[]>(['fullstack']);
  const [selectedTech, setSelectedTech] = useState<PrimaryTechId>('javascript');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const seenRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    fetchMyInvestigation().then((inv) => {
      if (!cancelled) setInvestigation(inv);
    });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!investigation?.profilePreferences) return;
    const validGoals = investigation.profilePreferences.careerGoals.filter((g): g is CareerGoal =>
      CAREER_GOALS.some((opt) => opt.id === g),
    );
    if (validGoals.length > 0) {
      setSelectedGoals(validGoals);
    }
    const prefTech = investigation.profilePreferences.primaryTechnology;
    if (prefTech && PRIMARY_TECHNOLOGIES.some((t) => t.id === prefTech)) {
      setSelectedTech(prefTech as PrimaryTechId);
    }
  }, [investigation]);

  useEffect(() => {
    if (investigation?.status === 'investigating') router.replace('/trilha/aguardando');
  }, [investigation, router]);

  // A10 — sugestão pronta e ainda não vista: mostra o banner e marca seen.
  useEffect(() => {
    if (
      investigation &&
      investigation.status === 'ready' &&
      !investigation.notifiedAt &&
      !seenRef.current
    ) {
      seenRef.current = true;
      setBannerVisible(true);
      void markInvestigationSeen();
    }
  }, [investigation]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    const result = await startInvestigation();
    if (!result.ok) {
      setStartError(result.error ?? 'Não foi possível iniciar a investigação agora.');
      setStarting(false);
      return;
    }
    setInvestigation(await fetchMyInvestigation());
    setStarting(false);
  }

  function handleToggleGoal(goalId: CareerGoal) {
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        return prev.length > 1 ? prev.filter((g) => g !== goalId) : prev;
      }
      return [...prev, goalId];
    });
  }

  async function handleRefreshTrack(e: React.FormEvent) {
    e.preventDefault();
    setRefreshing(true);
    setRefreshError(null);
    const result = await refreshInvestigation({
      careerGoals: selectedGoals,
      primaryTechnology: selectedTech,
    });
    if (!result.ok || !result.investigation) {
      setRefreshError(result.error ?? 'Não foi possível recalcular sua trilha agora.');
      setRefreshing(false);
      return;
    }
    setInvestigation(result.investigation);
    setAdjustOpen(false);
    setRefreshing(false);
  }

  async function handleQuickSwitch(trackKey: 'frontend' | 'backend' | 'ai' | 'web3') {
    setRefreshing(true);
    setRefreshError(null);
    const params =
      trackKey === 'backend'
        ? { careerGoals: ['backend', 'architect'], primaryTechnology: 'python' }
        : trackKey === 'ai'
        ? { careerGoals: ['ai', 'data_science'], primaryTechnology: 'python' }
        : trackKey === 'web3'
        ? { careerGoals: ['blockchain', 'startup'], primaryTechnology: 'javascript' }
        : { careerGoals: ['frontend', 'fullstack'], primaryTechnology: 'javascript' };

    const result = await refreshInvestigation(params);
    if (result.ok && result.investigation) {
      setInvestigation(result.investigation);
    } else {
      setRefreshError(result.error ?? 'Não foi possível alternar para esta trilha agora.');
    }
    setRefreshing(false);
  }

  // Central 216 retrabalho (D5) — a ordem anterior (`authLoading ||
  // investigation === undefined` antes de `!user`) travava o visitante
  // deslogado em "Carregando sua trilha…": o efeito retorna sem fetch
  // quando !user, investigation ficava undefined para sempre e o card
  // de login era código morto. Mesma ordem de /trilha/aguardando:
  // authLoading → !user → carregamento da investigação.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <p role="status" className="text-sm text-dark-on-surface-variant">
          Carregando sua trilha…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border-strong bg-dark-surface-container-low p-6 text-center">
          <h1 className="text-lg font-headline font-bold text-white mb-2">
            Faça login para ver sua trilha sugerida
          </h1>
          <p className="text-sm text-dark-on-surface-variant mb-5">
            A sua trilha personalizada fica na sua conta.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary hover:bg-dark-primary text-white text-sm font-bold px-5 py-2.5 rounded transition-colors"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  // Logado, investigação ainda carregando (fetch em curso).
  if (investigation === undefined) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <p role="status" className="text-sm text-dark-on-surface-variant">
          Carregando sua trilha…
        </p>
      </div>
    );
  }

  // Sem sugestão (ainda): estado honesto com o caminho para iniciar.
  if (!investigation || investigation.status === 'failed') {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex flex-col">
        <TrackTopbar
          active="sugerida"
          userName={user.name}
          userSubtitle="Recomendação IA Ativa"
          statusChip={
            <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/15 border border-secondary/30 rounded-full text-xs font-code text-secondary font-bold">
              <MaterialIcon name="bolt" className="text-[16px]" />
              <span>Trilha Pronta</span>
            </div>
          }
        />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          <section className="rounded-xl bg-dark-surface-container-low border border-border-strong p-8 md:p-10">
            <h1 className="font-headline text-display-md-mobile md:text-display-md text-white font-extrabold tracking-tight mb-3">
              {investigation?.status === 'failed'
                ? 'A investigação da sua trilha falhou'
                : 'Você ainda não tem uma trilha sugerida'}
            </h1>
            <p className="font-body text-body-md text-dark-on-surface-variant max-w-2xl leading-relaxed">
              {investigation?.status === 'failed'
                ? (investigation.failureReason ??
                  'Não foi possível concluir a investigação da sua trilha.')
                : 'Analisamos seu perfil e suas metas e sugerimos a melhor trilha em até 2 dias.'}{' '}
              Você pode tentar novamente — 1 tentativa a cada 24 horas.
            </p>
            {startError && (
              <p role="alert" className="text-sm text-red-400 mt-4">
                {startError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                className="bg-primary hover:bg-dark-primary disabled:opacity-60 text-white text-sm font-bold px-6 py-3 rounded transition-colors"
              >
                {starting ? 'Iniciando…' : 'Sugerir minha trilha'}
              </button>
              <Link
                href="/courses"
                className="px-6 py-3 bg-dark-surface-container border border-border-strong text-white text-sm font-semibold rounded transition-colors"
              >
                Ver cursos avulsos
              </Link>
            </div>
          </section>
        </main>
        <TrackFooter>© 2026 Nexus Code • Trilha personalizada ativa</TrackFooter>
      </div>
    );
  }

  // ready — SÓ com sugestão real da API.
  const rationale = investigation.rationaleText ?? investigation.reasons?.[0] ?? null;
  const marketBased = hasMarketEvidence(investigation);
  const startHref = investigation.startCourse
    ? `/courses/${investigation.startCourse.slug}`
    : '/desafios';

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Sidebar Lateral Oficial com Suporte a Retrair */}
      <StudentSidebar />

      {/* Conteúdo com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* A10 — banner da sugestão pronta (toast do estado real) */}
        {bannerVisible && (
          <div className="bg-[#121624] border-b border-[#8257E5] px-6 py-3 flex items-center justify-between z-50">
            <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                <span className="font-headline font-semibold text-xs md:text-sm text-white flex items-center gap-2">
                  <span>Sua trilha personalizada está pronta</span>
                </span>
              </div>
              <span className="flex items-center gap-2">
                <a
                  href="#trilha-sugerida"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8257E5] hover:bg-[#996DFF] text-white font-label text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  <span>Começar agora</span>
                  <MaterialIcon name="arrow_downward" className="text-[14px]" />
                </a>
                <button
                  type="button"
                  onClick={() => setBannerVisible(false)}
                  aria-label="Fechar aviso"
                  className="text-dark-on-surface-variant hover:text-white text-sm px-2 py-1"
                >
                  ✕
                </button>
              </span>
            </div>
          </div>
        )}

        <TrackTopbar
          active="sugerida"
          userName={user.name}
          userSubtitle="Recomendação IA Ativa"
          statusChip={
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#121624] border border-secondary/40 rounded-full text-xs font-code text-secondary font-bold">
              <MaterialIcon name="bolt" className="text-[16px]" />
              <span>Trilha Pronta</span>
            </div>
          }
        />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8" id="trilha-sugerida">
        <div className="rounded-2xl bg-[#0C0F17] border border-[#1C2338] p-8 flex items-center justify-between shadow-xl">
          <div className="space-y-2">
            <span className="font-mono text-xs text-[#00E5FF] font-bold uppercase tracking-wider block">
              ARQUITETURA CURRICULAR GERADA POR IA
            </span>
            <h1 className="font-brand text-2xl md:text-3xl text-white font-black tracking-tight">
              Sua Trilha Inteligente de Engenharia
            </h1>
            <p className="text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
              O algoritmo de diagnóstico balanceia suas lacunas de conhecimento — aplicando a Teoria do Flow de Csikszentmihalyi para evitar sobrecarga cognitiva (Sweller) — e correlaciona sua evolução com demandas reais de contratação e dados de mercado em tempo real.
            </p>
          </div>
          <div className="hidden md:flex w-20 h-20 rounded-2xl bg-[#121624] border border-[#1C2338] items-center justify-center text-[#A379FF] shadow-sm">
            <MaterialIcon name="auto_awesome" className="text-[40px]" />
          </div>
        </div>

        <section className="rounded-2xl bg-[#0C0F17] border-2 border-[#8257E5] p-8 md:p-10 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#1C2338]">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#121624] border border-[#8257E5]/50 text-[#A379FF] font-code text-xs font-bold uppercase tracking-wider">
                Recomendada pela IA
              </span>
              <h2 className="font-headline text-headline-lg font-bold text-white mt-3">
                {investigation.trackName ?? 'Trilha sugerida'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#121624] text-secondary font-code text-xs font-bold border border-secondary/40">
                Pronto para iniciar
              </span>
            </div>
          </div>

          {rationale && (
            <div className="p-5 rounded-xl bg-[#121624] border border-[#1C2338] mb-8 space-y-2">
              <div className="flex items-center gap-2 text-[#A379FF] font-headline font-bold text-sm">
                <MaterialIcon name="psychology" className="text-[20px]" />
                <span>Diagnóstico Pedagógico de Carga Cognitiva & Mercado:</span>
              </div>
              <p className="text-body-md text-white/90 leading-relaxed">
                &ldquo;{rationale}&rdquo;
              </p>
            </div>
          )}

          {/* A6 — evidências de mercado SÓ com evidência real. */}
          {marketBased && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Evidências de mercado
              </h3>
              <ul className="space-y-2">
                {investigation.marketEvidence.map((item) => (
                  <li
                    key={item.sourceUrl}
                    className="text-sm text-zinc-400 border border-zinc-800 rounded-xl p-3"
                  >
                    <span className="block font-semibold text-zinc-200">{item.titulo}</span>
                    {item.evidencia && <span className="block mt-1">{item.evidencia}</span>}
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block mt-1 text-[#996DFF] hover:underline break-all"
                    >
                      {item.sourceName} — {formatTrackDate(item.publishedAt)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {investigation.basis === 'profile-only' && (
            <p className="text-xs text-zinc-500 mb-8">
              Sugestão baseada só no seu perfil — nenhuma fonte de mercado estava
              disponível no momento da investigação.
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href={startHref}
              className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-dark-primary text-white font-label text-sm font-bold rounded flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/30"
            >
              <span>Começar minha trilha</span>
              <MaterialIcon name="rocket_launch" className="text-[20px]" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-4 bg-dark-surface-container border border-border-strong text-dark-on-surface hover:text-white font-label text-sm font-semibold rounded flex items-center justify-center gap-2 transition-colors"
            >
              <span>Ver mapa de fases</span>
              <MaterialIcon name="map" className="text-[18px]" />
            </Link>
            <button
              type="button"
              onClick={() => setAdjustOpen((v) => !v)}
              className="w-full sm:w-auto px-5 py-4 bg-dark-surface border border-border-subtle hover:border-primary/50 text-dark-on-surface-variant hover:text-white font-label text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MaterialIcon name="tune" className="text-[18px]" />
              <span>{adjustOpen ? 'Fechar ajuste' : 'Ajustar objetivos e recalcular'}</span>
            </button>
          </div>

          {adjustOpen && (
            <form
              onSubmit={(e) => void handleRefreshTrack(e)}
              className="mt-8 pt-6 border-t border-border-subtle space-y-5"
            >
              <div>
                <h3 className="font-headline font-bold text-sm text-white">
                  Atualize seus objetivos e tecnologia para recalcular a sugestão
                </h3>
                <p className="text-xs text-dark-on-surface-variant mt-1">
                  A primeira área selecionada tem prioridade e todas combinam com sua tecnologia escolhida.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {CAREER_GOALS.map((goal) => {
                  const active = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleToggleGoal(goal.id)}
                      className={
                        active
                          ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/25 border border-primary text-white cursor-pointer'
                          : 'px-3 py-1.5 rounded-lg text-xs bg-dark-surface border border-border-subtle text-dark-on-surface-variant hover:text-white cursor-pointer'
                      }
                    >
                      {goal.icon} {goal.title}
                    </button>
                  );
                })}
              </div>

              <div>
                <label
                  htmlFor="refresh-tech-select"
                  className="block text-xs font-code text-dark-on-surface-variant uppercase tracking-wider mb-2"
                >
                  Tecnologia principal
                </label>
                <select
                  id="refresh-tech-select"
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value as PrimaryTechId)}
                  className="w-full sm:w-80 px-3 py-2.5 rounded-lg bg-dark-surface border border-border-strong text-sm text-white"
                >
                  {PRIMARY_TECHNOLOGIES.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.title}
                    </option>
                  ))}
                </select>
              </div>

              {refreshError && (
                <p role="alert" className="text-xs text-red-400">
                  {refreshError}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={refreshing}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-dark-primary disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                >
                  {refreshing ? 'Recalculando…' : 'Recalcular trilha'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* VITRINE DAS 4 TRILHAS MESTRAS DO NEXUS CODE */}
        <section className="rounded-2xl bg-[#0C0F17] border border-[#1C2338] p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[#00E5FF] font-bold uppercase tracking-wider block">
                CATÁLOGO DE FORMAÇÕES DISPONÍVEIS
              </span>
              <h3 className="font-headline font-bold text-xl text-white mt-1">
                Todas as 4 Trilhas Mestras de Engenharia
              </h3>
              <p className="text-xs sm:text-sm text-dark-on-surface-variant mt-1">
                A IA recomendou a melhor rota para seu perfil atual, mas você tem autonomia total para alternar de foco ou experimentar outra trilha com 1 clique:
              </p>
            </div>
            {refreshing && (
              <span className="text-xs font-mono text-[#A379FF] animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8257E5] animate-ping" />
                Atualizando recomendação…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: 'frontend',
                title: 'Front-end & Web',
                badge: 'React 19 & Next.js',
                desc: 'Arquitetura de interfaces modernas, SSR, WebAssembly e reatividade.',
                icon: '🌐',
                color: '#8257E5',
              },
              {
                id: 'backend',
                title: 'Back-end & Sistemas',
                badge: 'Python, Rust & Go',
                desc: 'Microsserviços de alta concorrência, concorrência extrema e APIs resilientes.',
                icon: '⚙️',
                color: '#00E5FF',
              },
              {
                id: 'ai',
                title: 'Inteligência Artificial',
                badge: 'IA & MLOps',
                desc: 'Agentes autônomos com protocolo MCP, RAG vetorial e automações.',
                icon: '🤖',
                color: '#04D361',
              },
              {
                id: 'web3',
                title: 'Fullstack Web3',
                badge: 'Smart Contracts',
                desc: 'Arquitetura descentralizada, criptografia e aplicações Web3.',
                icon: '⛓️',
                color: '#FFA116',
              },
            ].map((trackItem) => {
              const isCurrent = investigation.suggestedTrack === trackItem.id;
              return (
                <div
                  key={trackItem.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'bg-[#121624] border-2 border-[#8257E5] shadow-sm'
                      : 'bg-[#0C0F17] border border-[#1C2338] hover:border-[#8257E5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{trackItem.icon}</span>
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded bg-[#04D361]/20 border border-[#04D361]/40 text-[#04D361] text-[10px] font-mono font-bold">
                          ✓ ATIVA
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#64748B]">{trackItem.badge}</span>
                      )}
                    </div>
                    <h4 className="font-headline font-bold text-base text-white mb-1">
                      {trackItem.title}
                    </h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                      {trackItem.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickSwitch(trackItem.id as any)}
                    disabled={isCurrent || refreshing}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#8257E5] text-white font-bold opacity-90 cursor-default'
                        : 'bg-[#121624] hover:bg-[#1C2338] text-[#A379FF] border border-[#1C2338] hover:border-[#8257E5]'
                    }`}
                  >
                    {isCurrent ? 'Trilha Ativa no Momento' : 'Alternar para esta Trilha →'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-headline font-bold text-lg text-white">
              Prefere escolher? Veja os cursos avulsos
            </h3>
            <p className="text-body-sm text-dark-on-surface-variant max-w-xl">
              Se quiser estudar tópicos específicos ou explorar outras linguagens além da
              sugestão da IA, acesse nosso catálogo modular.
            </p>
          </div>
          <Link
            href="/courses"
            className="w-full md:w-auto px-6 py-3 bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-white font-label text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors flex-shrink-0"
          >
            <span>Ver cursos avulsos</span>
            <MaterialIcon name="menu_book" className="text-[16px]" />
          </Link>
        </section>
      </main>

      <TrackFooter>
        {marketBased
          ? '© 2026 Nexus Code • Sua trilha personalizada foi gerada com base no mercado real.'
          : '© 2026 Nexus Code • Trilha personalizada ativa'}
      </TrackFooter>
      </div>
    </div>
  );
}
