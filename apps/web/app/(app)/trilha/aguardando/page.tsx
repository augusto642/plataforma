'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { MaterialIcon } from '../../../components/MaterialIcon';
import {
  fetchMyInvestigation,
  formatTrackDate,
  startInvestigation,
  type DynamicTrackView,
} from '../../../lib/dynamic-track';
import { TrackFooter, TrackTopbar } from '../components/track-chrome';

// Central 216 (F1) — rota "Aguardando Trilha" (mobile + desktop num só
// layout responsivo), enriquecida com o Módulo de Imersão Visual do Pacote 2.3.
import { API_BASE } from '../../../lib/apiClient';

interface ImmersionData {
  goal: string;
  hoursElapsed: number | null;
  miningStage: string;
  investigationStatus: 'investigating' | 'ready' | 'failed' | 'not_started';
  marketDataAvailable: boolean;
  visualArchitecture: Array<{
    layer: string;
    title: string;
    description: string;
    technologies: string[];
    diagramFlow: string;
    practicalExample: string;
  }>;
  marketXRay: {
    goal: string;
    periodMonths: number;
    totalJobsAnalyzed: number;
    brazil: {
      averageSalaryBrl: { junior: number; mid: number; senior: number };
      topDemandedSkills: Array<{ skill: string; percentage: number }>;
      hiringRegimes: { clt: number; pj: number };
    };
    international: {
      averageSalaryUsdMonthly: { junior: number; mid: number; senior: number };
      topDemandedSkills: Array<{ skill: string; percentage: number }>;
      remoteOpportunitiesPercentage: number;
    };
    recommendedMacroTrack: Array<{
      macroLevel: string;
      microSkills: string[];
      graduationChallenge: string;
    }>;
  } | null;
}

interface ImmediateMiniTrack {
  available: boolean;
  reason: 'investigation_not_active' | 'course_not_found' | 'no_pending_activities' | null;
  track: string | null;
  trackName: string | null;
  course: { id: string; slug: string; title: string } | null;
  activities: Array<{
    id: string;
    title: string;
    description: string;
    order: number;
  }>;
}

const INVESTIGATION_STATUS_LABELS: Record<
  ImmersionData['investigationStatus'],
  string
> = {
  investigating: 'Em andamento',
  ready: 'Concluída',
  failed: 'Falhou',
  not_started: 'Não iniciada',
};

function InvestigationSteps() {
  return (
    <div className="pt-6 border-t border-border-subtle">
      <h2 className="font-headline font-bold text-xs text-white uppercase tracking-wider mb-2 flex items-center gap-2">
        <MaterialIcon name="query_stats" className="text-secondary text-[18px]" />
        <span>Detalhes do processamento</span>
      </h2>
      <p className="text-xs text-dark-on-surface-variant m-0">
        O processamento é assíncrono, mas ainda não há telemetria por etapa.
        Esta tela mostra o estado real da solicitação, sem simular etapas concluídas.
      </p>
    </div>
  );
}

export default function AguardandoTrilhaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(
    undefined,
  );
  const [immersion, setImmersion] = useState<ImmersionData | null>(null);
  const [miniTrack, setMiniTrack] = useState<ImmediateMiniTrack | null>(null);
  const [miniTrackError, setMiniTrackError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    fetchMyInvestigation().then((inv) => {
      if (!cancelled) setInvestigation(inv);
    });
    fetch(`${API_BASE}/dynamic-track/me/immersion`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setImmersion(data);
      })
      .catch(() => null);
    setMiniTrack(null);
    setMiniTrackError(null);
    fetch(`${API_BASE}/dynamic-track/me/mini-track`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ImmediateMiniTrack;
      })
      .then((data) => {
        if (!cancelled) setMiniTrack(data);
      })
      .catch(() => {
        if (!cancelled) {
          setMiniTrackError('Não foi possível carregar sua mini-trilha agora.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (investigation?.status === 'ready') router.replace('/trilha/sugerida');
  }, [investigation, router]);

  const miniTrackCourse = miniTrack?.course ?? null;

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <p role="status" className="text-sm text-dark-on-surface-variant">
          Carregando…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-border-strong bg-dark-surface-container-low p-6 text-center">
          <h1 className="text-lg font-headline font-bold text-white mb-2">
            Faça login para acompanhar sua trilha
          </h1>
          <p className="text-sm text-dark-on-surface-variant mb-5">
            A investigação da sua trilha personalizada fica na sua conta.
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

  if (investigation === undefined) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex items-center justify-center p-6">
        <p role="status" className="text-sm text-dark-on-surface-variant">
          Carregando sua trilha…
        </p>
      </div>
    );
  }

  // Sem investigação: oferece iniciar — nunca um "preparando" falso.
  if (investigation === null) {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex flex-col">
        <TrackTopbar
          active="aguardando"
          userName={user.name}
          userSubtitle="Perfil Cadastrado"
          statusChip={
            <div className="flex items-center gap-1.5 px-3 py-1 bg-dark-surface-container border border-border-subtle rounded-full text-xs font-code text-secondary">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Ambiente Liberado</span>
            </div>
          }
        />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          <section className="rounded-xl bg-dark-surface-container-low border border-border-strong p-8 md:p-10">
            <h1 className="font-headline text-display-md-mobile md:text-display-md text-white font-extrabold tracking-tight mb-3">
              Receba uma trilha sugerida para você
            </h1>
            <p className="font-body text-body-md text-dark-on-surface-variant max-w-2xl leading-relaxed">
              Registramos seu perfil e suas metas para preparar uma sugestão de
              trilha em até 2 dias. Enquanto isso, a trilha inicial e os desafios
              já estão liberados; dados reais de vagas ainda não estão conectados.
            </p>
            {startError && (
              <p role="alert" className="text-sm text-red-400 mt-4">
                {startError}
              </p>
            )}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                className="bg-primary hover:bg-dark-primary disabled:opacity-60 text-white text-sm font-bold px-6 py-3 rounded transition-colors"
              >
                {starting ? 'Iniciando…' : 'Sugerir minha trilha'}
              </button>
            </div>
          </section>
        </main>
        <TrackFooter>
          © 2026 Nexus Code • Análise e preparação de trilha personalizada em andamento.
        </TrackFooter>
      </div>
    );
  }

  if (investigation.status === 'failed') {
    return (
      <div className="min-h-screen bg-dark-surface text-dark-on-surface flex flex-col">
        <TrackTopbar
          active="aguardando"
          userName={user.name}
          userSubtitle="Perfil Cadastrado"
          statusChip={
            <div className="flex items-center gap-1.5 px-3 py-1 bg-dark-surface-container border border-border-subtle rounded-full text-xs font-code text-error">
              <span>Investigação falhou</span>
            </div>
          }
        />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          <section className="rounded-xl bg-dark-surface-container-low border border-border-strong p-8 md:p-10">
            <h1 className="font-headline text-display-md-mobile md:text-display-md text-white font-extrabold tracking-tight mb-3">
              A investigação da sua trilha falhou
            </h1>
            <p className="font-body text-body-md text-dark-on-surface-variant max-w-2xl leading-relaxed">
              {investigation.failureReason
                ? `Motivo: ${investigation.failureReason}`
                : 'Não foi possível concluir a investigação da sua trilha.'}{' '}
              Você pode tentar novamente — 1 tentativa a cada 24 horas.
            </p>
            {startError && (
              <p role="alert" className="text-sm text-red-400 mt-4">
                {startError}
              </p>
            )}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                className="bg-primary hover:bg-dark-primary disabled:opacity-60 text-white text-sm font-bold px-6 py-3 rounded transition-colors"
              >
                {starting ? 'Tentando novamente…' : 'Tentar de novo'}
              </button>
            </div>
          </section>
        </main>
        <TrackFooter>
          © 2026 Nexus Code • Análise e preparação de trilha personalizada em andamento.
        </TrackFooter>
      </div>
    );
  }

  // investigating — o layout do protótipo.
  return (
    <div className="min-h-screen bg-dark-surface text-dark-on-surface font-body antialiased flex flex-col">
      <TrackTopbar
        active="aguardando"
        userName={user.name}
        userSubtitle="Perfil Cadastrado"
        statusChip={
          <div className="flex items-center gap-1.5 px-3 py-1 bg-dark-surface-container border border-border-subtle rounded-full text-xs font-code text-secondary">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>Ambiente Liberado</span>
          </div>
        }
      />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
        <section className="rounded-xl bg-gradient-to-b from-dark-surface-container to-dark-surface-container-low border border-border-strong p-8 md:p-10 relative overflow-hidden">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary flex-shrink-0">
              <MaterialIcon name="smart_toy" className="text-[28px] animate-spin" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-primary/15 text-dark-primary font-code text-xs font-semibold mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ANÁLISE DE PERFIL EM CURSO
              </div>
              <h1 className="font-headline text-display-md-mobile md:text-display-md text-white font-extrabold tracking-tight mb-3">
                Sua trilha está sendo preparada
              </h1>
              <p className="font-body text-body-md md:text-body-lg text-dark-on-surface-variant max-w-2xl leading-relaxed">
                Sua solicitação está registrada. O prazo de até 2 dias é um SLA,
                não uma medição de progresso em tempo real; avisaremos você quando
                houver uma sugestão pronta.
              </p>
              {investigation.slaDueAt && (
                <p className="text-xs text-dark-on-surface-variant mt-3">
                  Prazo: até {formatTrackDate(investigation.slaDueAt)}.
                  {investigation.overdue
                    ? ' Prazo estendido — a investigação continua em andamento.'
                    : ''}
                </p>
              )}
            </div>
          </div>
          <InvestigationSteps />
        </section>

        <section className="rounded-xl bg-dark-surface-container-low border border-border-strong p-6 space-y-4">
          <div>
            <span className="font-code text-xs text-secondary font-bold uppercase tracking-wider block mb-1">
              Primeiro valor agora
            </span>
            <h2 className="font-headline text-headline-sm font-bold text-white m-0">
              Comece enquanto sua trilha é preparada
            </h2>
            <p className="text-sm text-dark-on-surface-variant mt-2 mb-0">
              Esta sequência usa atividades existentes do curso indicado pelo seu diagnóstico;
              atividades já aprovadas não aparecem novamente.
            </p>
          </div>

          {miniTrackError && (
            <p role="alert" className="text-sm text-red-400 m-0">
              {miniTrackError}
            </p>
          )}
          {!miniTrack && !miniTrackError && (
            <p role="status" className="text-sm text-dark-on-surface-variant m-0">
              Carregando atividades disponíveis…
            </p>
          )}
          {miniTrack?.available && miniTrackCourse && (
            <div className="space-y-3">
              <p className="text-xs text-dark-on-surface-variant m-0">
                {miniTrack.trackName} · {miniTrackCourse.title}
              </p>
              <ol className="space-y-2 p-0 m-0 list-none">
                {miniTrack.activities.map((activity, index) => (
                  <li
                    key={activity.id}
                    className="rounded-lg border border-border-subtle bg-dark-surface-container p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm text-white font-semibold m-0">
                        {index + 1}. {activity.title}
                      </p>
                      <p className="text-xs text-dark-on-surface-variant mt-1 mb-0">
                        {activity.description}
                      </p>
                    </div>
                    <Link
                      href={`/ide?course=${encodeURIComponent(miniTrackCourse.id)}&activity=${encodeURIComponent(activity.id)}`}
                      className="shrink-0 text-sm font-bold text-secondary hover:text-white transition-colors"
                    >
                      Começar
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {miniTrack && !miniTrack.available && (
            <p className="text-sm text-dark-on-surface-variant m-0">
              {miniTrack.reason === 'course_not_found'
                ? 'Ainda não há um curso publicado para a trilha do seu diagnóstico.'
                : miniTrack.reason === 'no_pending_activities'
                  ? 'Você já concluiu as atividades disponíveis deste curso.'
                  : 'A mini-trilha fica disponível enquanto a investigação estiver em andamento.'}
            </p>
          )}
        </section>

        {/* Mostra apenas o estado e o tempo reais; não simula avanço nem workers. */}
        {immersion && (
          <section className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
              <h2 className="font-headline font-bold text-sm text-white uppercase tracking-wider m-0">
                Estado da investigação
              </h2>
            </div>
            <p className="text-sm text-[#F1F5F9] m-0">{immersion.miningStage}</p>
            <div className="text-xs text-[#94A3B8] space-y-1">
              <p className="m-0">
                Status:{' '}
                <span className="font-mono">
                  {INVESTIGATION_STATUS_LABELS[immersion.investigationStatus]}
                </span>
                {immersion.hoursElapsed !== null
                  ? ` • registrada há ${immersion.hoursElapsed}h`
                  : ''}
              </p>
              <p className="m-0">
                Ainda não há telemetria de etapas para informar percentual ou workers ativos.
              </p>
            </div>
          </section>
        )}

        {/* Pacote 2.3 — Módulo de Imersão: Arquitetura Visual da Área */}
        {immersion?.visualArchitecture && (
          <section className="space-y-4">
            <div>
              <span className="font-code text-xs text-[#00E5FF] font-bold uppercase tracking-wider block mb-1">
                Mapa de Engenharia
              </span>
              <h2 className="font-headline text-headline-sm font-bold text-white tracking-tight">
                Arquitetura Visual da Sua Área ({immersion.goal})
              </h2>
              <p className="text-body-sm text-[#94A3B8]">
                Entenda como cada camada de um sistema em produção se conecta, da interface do usuário até o banco de dados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {immersion.visualArchitecture.map((arch) => (
                <div
                  key={arch.layer}
                  className="rounded-xl bg-[#0C0F17] border border-[#1C2338] hover:border-[#8257E5]/50 p-5 space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#A379FF] bg-[#8257E5]/15 px-2 py-0.5 rounded border border-[#8257E5]/30">
                      {arch.layer}
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-sm text-white m-0">
                    {arch.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed m-0">
                    {arch.description}
                  </p>
                  <div className="pt-2 border-t border-[#1C2338] space-y-1">
                    <span className="text-[10px] font-mono text-[#00E5FF] block">Fluxo de Dados:</span>
                    <div className="font-mono text-[11px] text-[#F1F5F9] bg-[#07090E] p-2 rounded border border-[#1C2338]">
                      {arch.diagramFlow}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {arch.technologies.map((tech) => (
                      <span key={tech} className="text-[10px] font-mono bg-[#121624] text-[#94A3B8] px-2 py-0.5 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {immersion && !immersion.marketDataAvailable && (
          <section className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-6 space-y-2">
            <span className="font-code text-xs text-[#00E5FF] font-bold uppercase tracking-wider">
              Pesquisa de mercado indisponível
            </span>
            <p className="text-sm text-white m-0">
              A plataforma ainda não está conectada a uma fonte autorizada de vagas.
              Por isso, não exibimos salários ou competências como se fossem dados
              coletados.
            </p>
          </section>
        )}

        {/* Exibido somente quando houver pesquisa real disponível. */}
        {immersion?.marketXRay && (
          <section className="space-y-4">
            <div>
              <span className="font-code text-xs text-secondary font-bold uppercase tracking-wider block mb-1">
                Sinais Reais (Últimos 2 Anos)
              </span>
              <h2 className="font-headline text-headline-sm font-bold text-white tracking-tight">
                Raio-X de Mercado & Faixas Salariais
              </h2>
              <p className="text-body-sm text-[#94A3B8]">
                Com base em {immersion.marketXRay.totalJobsAnalyzed.toLocaleString('pt-BR')} vagas analisadas no Brasil e internacional remoto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mercado Brasil */}
              <div className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-headline font-bold text-white flex items-center gap-2">
                    <span>🇧🇷 Mercado Brasil (BRL)</span>
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8]">
                    CLT {immersion.marketXRay.brazil.hiringRegimes.clt}% • PJ {immersion.marketXRay.brazil.hiringRegimes.pj}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#121624] p-2.5 rounded-lg border border-[#1C2338]">
                    <span className="text-[10px] font-mono text-[#94A3B8] block">Júnior</span>
                    <strong className="text-sm font-code text-white">R$ {immersion.marketXRay.brazil.averageSalaryBrl.junior.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div className="bg-[#121624] p-2.5 rounded-lg border border-[#1C2338]">
                    <span className="text-[10px] font-mono text-[#00E5FF] block">Pleno</span>
                    <strong className="text-sm font-code text-[#00E5FF]">R$ {immersion.marketXRay.brazil.averageSalaryBrl.mid.toLocaleString('pt-BR')}</strong>
                  </div>
                  <div className="bg-[#121624] p-2.5 rounded-lg border border-[#1C2338]">
                    <span className="text-[10px] font-mono text-[#A379FF] block">Sênior</span>
                    <strong className="text-sm font-code text-[#A379FF]">R$ {immersion.marketXRay.brazil.averageSalaryBrl.senior.toLocaleString('pt-BR')}</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono text-[#94A3B8] block">Top Competências Exigidas:</span>
                  {immersion.marketXRay.brazil.topDemandedSkills.slice(0, 4).map((s) => (
                    <div key={s.skill} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#F1F5F9]">{s.skill}</span>
                      <span className="text-[#00E5FF] font-bold">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mercado Internacional */}
              <div className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-headline font-bold text-white flex items-center gap-2">
                    <span>🌍 Internacional Remoto (USD)</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {immersion.marketXRay.international.remoteOpportunitiesPercentage}% Remoto
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#121624] p-2.5 rounded-lg border border-[#1C2338]">
                    <span className="text-[10px] font-mono text-[#94A3B8] block">Junior</span>
                    <strong className="text-sm font-code text-white">${immersion.marketXRay.international.averageSalaryUsdMonthly.junior.toLocaleString('en-US')}/mês</strong>
                  </div>
                  <div className="bg-[#121624] p-2.5 rounded-lg border border-[#1C2338]">
                    <span className="text-[10px] font-mono text-emerald-400 block">Mid-Level</span>
                    <strong className="text-sm font-code text-emerald-400">${immersion.marketXRay.international.averageSalaryUsdMonthly.mid.toLocaleString('en-US')}/mês</strong>
                  </div>
                  <div className="bg-[#121624] p-2.5 rounded-lg border border-[#1C2338]">
                    <span className="text-[10px] font-mono text-[#A379FF] block">Senior</span>
                    <strong className="text-sm font-code text-[#A379FF]">${immersion.marketXRay.international.averageSalaryUsdMonthly.senior.toLocaleString('en-US')}/mês</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono text-[#94A3B8] block">Requisitos Globais:</span>
                  {immersion.marketXRay.international.topDemandedSkills.slice(0, 4).map((s) => (
                    <div key={s.skill} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#F1F5F9]">{s.skill}</span>
                      <span className="text-emerald-400 font-bold">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pacote 2.2 — Macro-trilha & Desafios de Graduação */}
        {immersion?.marketXRay?.recommendedMacroTrack && (
          <section className="space-y-4">
            <div>
              <span className="font-code text-xs text-[#A379FF] font-bold uppercase tracking-wider block mb-1">
                Progressão do Aluno
              </span>
              <h2 className="font-headline text-headline-sm font-bold text-white tracking-tight">
                Macro-Trilha & Desafios de Graduação
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {immersion.marketXRay.recommendedMacroTrack.map((track) => (
                <div key={track.macroLevel} className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-5 space-y-3">
                  <span className="text-xs font-mono font-bold text-white bg-[#8257E5]/20 border border-[#8257E5]/40 px-2.5 py-1 rounded inline-block">
                    Nível {track.macroLevel}
                  </span>
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-[#94A3B8] block">Habilidades Técnicas:</span>
                    <ul className="text-xs text-[#F1F5F9] space-y-1 pl-4 list-disc m-0">
                      {track.microSkills.map((sk) => (
                        <li key={sk}>{sk}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-[#1C2338]">
                    <span className="text-[10px] font-mono text-[#00E5FF] uppercase font-bold block mb-1">
                      🎓 Desafio de Graduação:
                    </span>
                    <p className="text-xs text-white bg-[#07090E] p-2.5 rounded border border-[#1C2338] leading-snug m-0">
                      {track.graduationChallenge}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div>
            <span className="font-code text-xs text-secondary font-bold uppercase tracking-wider block mb-1">
              Aproveite agora
            </span>
            <h2 className="font-headline text-headline-sm font-bold text-white tracking-tight">
              O que fazer enquanto espera
            </h2>
            <p className="text-body-sm text-dark-on-surface-variant">
              Você não precisa esperar parado. O sandbox e os desafios fundamentais já
              estão liberados na sua conta.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-surface-container-low border border-border-strong hover:border-primary/50 rounded-xl p-6 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded bg-primary/10 border border-primary/30 text-primary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <MaterialIcon name="terminal" className="text-[26px]" />
                </div>
                <h3 className="font-headline text-headline-sm text-white font-bold mb-2">
                  Começar desafios iniciais
                </h3>
                <p className="text-body-sm text-dark-on-surface-variant leading-relaxed mb-6">
                  Acesse a trilha inicial grátis com exercícios no navegador e comece a
                  pontuar agora mesmo.
                </p>
              </div>
              <Link
                href="/desafios"
                className="w-full py-3 px-4 bg-primary hover:bg-dark-primary text-white font-label text-xs font-bold rounded text-center flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20"
              >
                <span>Ir para os desafios</span>
                <MaterialIcon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            <div className="bg-dark-surface-container-low border border-border-strong hover:border-secondary/50 rounded-xl p-6 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded bg-secondary/10 border border-secondary/30 text-secondary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <MaterialIcon name="auto_stories" className="text-[26px]" />
                </div>
                <h3 className="font-headline text-headline-sm text-white font-bold mb-2">
                  Ver cursos avulsos
                </h3>
                <p className="text-body-sm text-dark-on-surface-variant leading-relaxed mb-6">
                  Conheça módulos focados em tecnologias específicas e aprofunde seus
                  conceitos com teoria e prática.
                </p>
              </div>
              <Link
                href="/courses"
                className="w-full py-3 px-4 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-xs font-semibold rounded text-center flex items-center justify-center gap-2 transition-colors"
              >
                <span>Explorar catálogo</span>
                <MaterialIcon name="open_in_new" className="text-[16px]" />
              </Link>
            </div>
            <div className="bg-dark-surface-container-low border border-border-strong hover:border-tertiary/50 rounded-xl p-6 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded bg-tertiary/10 border border-tertiary/30 text-tertiary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <MaterialIcon name="explore" className="text-[26px]" />
                </div>
                <h3 className="font-headline text-headline-sm text-white font-bold mb-2">
                  Explorar a plataforma
                </h3>
                <p className="text-body-sm text-dark-on-surface-variant leading-relaxed mb-6">
                  Conheça o simulador de entrevistas com IA, as regras das ligas
                  competitivas e seu perfil de dev.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-xs font-semibold rounded text-center flex items-center justify-center gap-2 transition-colors"
              >
                <span>Ver visão geral</span>
                <MaterialIcon name="dashboard" className="text-[16px]" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <TrackFooter>
        © 2026 Nexus Code • Análise e preparação de trilha personalizada em andamento.
      </TrackFooter>
    </div>
  );
}
