'use client';

import React, { useEffect, useState } from 'react';
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
  hoursElapsed: number;
  progressPercentage: number;
  miningStage: string;
  workersActive: number;
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
  };
}

const INVESTIGATION_STEPS = [
  {
    code: 'ETAPA 01',
    title: 'Motivo e objetivo',
    description: 'Metas e disponibilidade registradas no cadastro.',
    state: 'done' as const,
  },
  {
    code: 'ETAPA 02',
    title: 'Mercado e vagas',
    description: 'Mapeando competências mais exigidas nas vagas tech.',
    state: 'current' as const,
  },
  {
    code: 'ETAPA 03',
    title: 'Stack',
    description: 'Definição das tecnologias e ferramentas ideais.',
    state: 'pending' as const,
  },
  {
    code: 'ETAPA 04',
    title: 'Desafios',
    description: 'Estruturação dos projetos práticos e chefões.',
    state: 'pending' as const,
  },
];

function InvestigationSteps() {
  return (
    <div className="pt-6 border-t border-border-subtle">
      <h2 className="font-headline font-bold text-xs text-white uppercase tracking-wider mb-5 flex items-center gap-2">
        <MaterialIcon name="query_stats" className="text-secondary text-[18px]" />
        <span>Andamento da Investigação</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {INVESTIGATION_STEPS.map((step) => (
          <div
            key={step.code}
            className={
              step.state === 'done'
                ? 'p-4 rounded-lg bg-dark-surface border border-secondary/40 relative'
                : step.state === 'current'
                  ? 'p-4 rounded-lg bg-dark-surface border border-primary/50 relative'
                  : 'p-4 rounded-lg bg-dark-surface border border-border-subtle opacity-70 relative'
            }
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={
                  step.state === 'done'
                    ? 'font-code text-[11px] text-secondary font-bold'
                    : step.state === 'current'
                      ? 'font-code text-[11px] text-dark-primary font-bold'
                      : 'font-code text-[11px] text-dark-on-surface-variant'
                }
              >
                {step.code}
              </span>
              {step.state === 'done' ? (
                <MaterialIcon name="check_circle" className="text-secondary text-[18px]" />
              ) : step.state === 'current' ? (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              ) : (
                <MaterialIcon
                  name="schedule"
                  className="text-dark-on-surface-variant text-[18px]"
                />
              )}
            </div>
            <h3 className="font-headline font-semibold text-white text-sm mb-1">{step.title}</h3>
            <p className="text-xs text-dark-on-surface-variant">{step.description}</p>
          </div>
        ))}
      </div>
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

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (investigation?.status === 'ready') router.replace('/trilha/sugerida');
  }, [investigation, router]);

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
              Analisamos seu perfil e suas metas — motivo, mercado, stack,
              desafios e vagas — e sugerimos a melhor trilha em até 2 dias.
              Enquanto isso, a trilha inicial e os desafios já estão liberados.
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
                A IA está analisando seu perfil, o mercado e as vagas para montar sua
                trilha personalizada. Ela chega em até 2 dias — avisaremos você aqui na
                plataforma.
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

        {/* Pacote 2.3 — Módulo de Imersão: Status Vivo da Pesquisa (48h) */}
        {immersion && (
          <section className="rounded-xl bg-[#0C0F17] border border-[#1C2338] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-ping" />
                <h2 className="font-headline font-bold text-sm text-white uppercase tracking-wider m-0">
                  Status Vivo da Pesquisa de Mercado (Janela 48h)
                </h2>
              </div>
              <span className="font-code text-xs text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-1 rounded-full border border-[#00E5FF]/30">
                {immersion.workersActive} Workers Minerando em Background
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-[#94A3B8]">
                <span>Etapa Atual: <strong className="text-white">{immersion.miningStage}</strong></span>
                <span>{immersion.progressPercentage}% ({immersion.hoursElapsed}h / 48h)</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#121624] overflow-hidden border border-[#1C2338]">
                <div
                  className="h-full bg-gradient-to-r from-[#8257E5] via-[#A379FF] to-[#00E5FF] transition-all duration-1000"
                  style={{ width: `${immersion.progressPercentage}%` }}
                />
              </div>
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

        {/* Pacote 2.3 — Módulo de Imersão: Raio-X do Mercado (Brasil vs. Internacional USD) */}
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
