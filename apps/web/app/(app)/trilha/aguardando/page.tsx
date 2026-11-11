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
// layout responsivo), no visual do protótipo Stitch v2
// (aguardando-trilha-desktop.html / aguardando-trilha-mobile.html).
// Estados reais de GET /dynamic-track/me:
// - ready → redireciona para /trilha/sugerida;
// - failed → motivo real + nova tentativa;
// - sem investigação → oferece iniciar (POST /me/start);
// - investigating → o layout do protótipo.
// As 4 etapas são o fluxo declarado da investigação (mesma convenção
// do DynamicTrackCard), não progresso medido: a API não expõe em que
// etapa a investigação está.

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
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
