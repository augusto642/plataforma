'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchMyInvestigation,
  formatTrackDate,
  markInvestigationSeen,
  refreshInvestigation,
  startInvestigation,
  type DynamicTrackView,
} from '../../../lib/dynamic-track';
import { MaterialIcon } from '../../../components/MaterialIcon';

function formatDate(iso: string | null): string {
  return formatTrackDate(iso);
}

const INVESTIGATION_STEPS = [
  'Motivo & Objetivo',
  'Mercado & Vagas',
  'Stack Prática',
  'Desafios no Sandbox',
];

function PreparingLinks() {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
      <Link
        href="/desafios"
        className="px-3.5 py-2 rounded-xl bg-[#121624] border border-[#1C2338] text-[#F1F5F9] hover:border-[#8257E5] hover:text-white transition-colors flex items-center gap-1.5"
      >
        <span>🏆</span> Começar desafios iniciais
      </Link>
      <Link
        href="/courses"
        className="px-3.5 py-2 rounded-xl bg-[#121624] border border-[#1C2338] text-[#F1F5F9] hover:border-[#8257E5] hover:text-white transition-colors flex items-center gap-1.5"
      >
        <span>📚</span> Ver catálogo de cursos
      </Link>
      <Link
        href="/ide"
        className="px-3.5 py-2 rounded-xl bg-[#121624] border border-[#1C2338] text-[#F1F5F9] hover:border-[#8257E5] hover:text-white transition-colors flex items-center gap-1.5"
      >
        <span>🚀</span> Explorar o sandbox
      </Link>
    </div>
  );
}

function PreparingView({
  slaDueAt,
  overdue,
  onStart,
  starting = false,
  startError = null,
}: {
  slaDueAt?: string | null;
  overdue?: boolean;
  onStart?: () => void;
  starting?: boolean;
  startError?: string | null;
}) {
  return (
    <section
      aria-label="Sua trilha"
      className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-6 md:p-8 relative overflow-hidden shadow-xl"
    >
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#8257E5]/15 text-[#A379FF] border border-[#8257E5]/30 text-xs font-mono font-bold uppercase tracking-wider">
              <span>✦</span> Trilha Personalizada por IA
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFA116]/15 text-[#FFA116] border border-[#FFA116]/30 text-xs font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFA116] animate-pulse" />
              {onStart ? 'Aguardando Início' : 'Investigação em Andamento'}
            </span>
          </div>

          <div>
            <h2 className="font-brand font-black text-xl sm:text-2xl text-white tracking-tight">
              {onStart
                ? 'Receba uma trilha sob medida para seus objetivos'
                : 'Sua trilha está sendo preparada pela Tutora de IA'}
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 leading-relaxed">
              {onStart
                ? 'Analisamos suas respostas, nível de raciocínio lógico, mercado de trabalho e sugerimos a melhor trilha para você em até 48h.'
                : 'A IA está analisando seu perfil, vagas de tecnologia e desafios para montar sua rota personalizada.'}
            </p>
          </div>

          {slaDueAt && (
            <p className="text-xs font-mono text-[#64748B] pt-1">
              Prazo estimado: até <strong className="text-white">{formatDate(slaDueAt)}</strong>.
              {overdue
                ? ' Prazo estendido — a análise continua em andamento com dados reais.'
                : ''}
            </p>
          )}
        </div>

        {onStart && (
          <div className="shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7146D1] hover:brightness-110 disabled:opacity-60 text-white font-semibold text-xs font-mono tracking-wide uppercase shadow-[0_0_25px_rgba(130,87,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{starting ? 'Iniciando…' : 'Sugerir minha trilha'}</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>

      {startError && (
        <p role="alert" className="text-xs font-mono text-[#F43F5E] mt-3">
          {startError}
        </p>
      )}

      {/* Protocolo de 4 Etapas da IA */}
      <div className="mt-6 pt-5 border-t border-[#1C2133]/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        {INVESTIGATION_STEPS.map((step, idx) => (
          <div key={step} className="p-2.5 rounded-xl bg-[#07080C]/80 border border-[#1C2133] flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${onStart ? 'bg-[#64748B]' : 'bg-[#8257E5] animate-pulse'}`} />
            <div className="truncate">
              <div className="text-[10px] text-[#64748B] uppercase">Etapa 0{idx + 1}</div>
              <div className="text-white truncate font-medium">{step}</div>
            </div>
          </div>
        ))}
      </div>

      <PreparingLinks />
    </section>
  );
}

export function DynamicTrackCard({
  onLoaded,
}: {
  onLoaded?: (inv: DynamicTrackView | null) => void;
} = {}) {
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(undefined);
  const [toastVisible, setToastVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [switchingTrack, setSwitchingTrack] = useState<string | null>(null);
  const seenRef = useRef(false);

  async function load() {
    const inv = await fetchMyInvestigation();
    setInvestigation(inv);
    onLoaded?.(inv);
  }

  async function handleSwitchTrack(trackKey: 'frontend' | 'backend' | 'ai' | 'web3') {
    setSwitchingTrack(trackKey);
    const params =
      trackKey === 'backend'
        ? { careerGoals: ['backend', 'architect'], primaryTechnology: 'python' }
        : trackKey === 'ai'
        ? { careerGoals: ['ai', 'data_science'], primaryTechnology: 'python' }
        : trackKey === 'web3'
        ? { careerGoals: ['blockchain', 'startup'], primaryTechnology: 'javascript' }
        : { careerGoals: ['frontend', 'fullstack'], primaryTechnology: 'javascript' };

    const res = await refreshInvestigation(params);
    if (res.ok && res.investigation) {
      setInvestigation(res.investigation);
      onLoaded?.(res.investigation);
    }
    setSwitchingTrack(null);
  }

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    const result = await startInvestigation();
    if (!result.ok) {
      setStartError(result.error ?? 'Não foi possível iniciar a investigação agora.');
    } else {
      await load();
    }
    setStarting(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchMyInvestigation().then((inv) => {
      if (!cancelled) {
        setInvestigation(inv);
        onLoaded?.(inv);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onLoaded]);

  useEffect(() => {
    if (
      investigation &&
      investigation.status === 'ready' &&
      !investigation.notifiedAt &&
      !seenRef.current
    ) {
      seenRef.current = true;
      setToastVisible(true);
      void markInvestigationSeen();
    }
  }, [investigation]);

  if (investigation === undefined) {
    return (
      <section
        aria-label="Sua trilha"
        className="rounded-3xl bg-[#111420] border border-[#1C2133] p-6 animate-pulse"
      >
        <p className="text-xs font-mono text-[#64748B]">Carregando trilha personalizada…</p>
      </section>
    );
  }

  if (investigation === null) {
    return (
      <PreparingView
        onStart={() => void handleStart()}
        starting={starting}
        startError={startError}
      />
    );
  }

  if (investigation.status === 'investigating') {
    return (
      <PreparingView slaDueAt={investigation.slaDueAt} overdue={investigation.overdue} />
    );
  }

  if (investigation.status === 'failed') {
    return (
      <section
        aria-label="Sua trilha"
        className="rounded-3xl bg-[#111420] border border-[#F43F5E]/30 p-6 md:p-8 space-y-4"
      >
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F43F5E]">
          Sua trilha
        </span>
        <h2 className="font-brand font-bold text-lg text-white">
          A investigação da sua trilha não pôde ser concluída
        </h2>
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          {investigation.failureReason
            ? `Motivo: ${investigation.failureReason}`
            : 'Ocorreu um erro ao gerar sua trilha personalizada.'}{' '}
          Você pode tentar novamente (1 tentativa a cada 24 horas).
        </p>
        {startError && (
          <p role="alert" className="text-xs font-mono text-[#F43F5E]">
            {startError}
          </p>
        )}
        <div>
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-mono font-bold cursor-pointer"
          >
            {starting ? 'Tentando novamente…' : '↻ Tentar de novo'}
          </button>
        </div>
        <PreparingLinks />
      </section>
    );
  }

  // ready — Renderiza a trilha sugerida por IA
  return (
    <>
      {toastVisible && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#8257E5]/50 bg-[#8257E5]/15 px-5 py-3.5 shadow-[0_0_20px_rgba(130,87,229,0.25)]"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="text-sm font-semibold text-white">
              Sua trilha personalizada está pronta!
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/trilha/sugerida"
              className="px-3.5 py-1.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-mono font-bold transition-all"
            >
              Ver trilha sugerida
            </Link>
            {investigation.startCourse && (
              <Link
                href={`/courses/${investigation.startCourse.slug}`}
                className="px-3.5 py-1.5 rounded-xl border border-[#1C2133] hover:border-[#8257E5]/50 text-white text-xs font-mono transition-colors"
              >
                Começar agora
              </Link>
            )}
            <button
              type="button"
              onClick={() => setToastVisible(false)}
              aria-label="Fechar aviso"
              className="text-[#94A3B8] hover:text-white text-sm px-1.5 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <section
        aria-label="Sua trilha"
        className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-6 md:p-8 relative overflow-hidden shadow-xl"
      >
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#121624] text-[#A379FF] border border-[#8257E5]/40 text-xs font-mono font-bold uppercase tracking-wider">
                <span>✦</span> Trilha Personalizada por IA
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#121624] text-[#04D361] border border-[#04D361]/40 text-xs font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse" />
                Diagnóstico Concluído
              </span>
            </div>

            <div>
              <h2 className="font-brand font-black text-xl sm:text-2xl text-white tracking-tight">
                {investigation.trackName ?? 'Trilha Personalizada'}
              </h2>
              {investigation.rationaleText && (
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 leading-relaxed">
                  <strong className="text-white">Justificativa personalizada:</strong>{' '}
                  {investigation.rationaleText}
                </p>
              )}
            </div>

            {/* Evidências de Mercado ou Base */}
            {investigation.marketEvidence && investigation.marketEvidence.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
                <div className="flex items-center gap-1.5 text-[#00E5FF]">
                  <MaterialIcon name="trending_up" className="text-[16px]" />
                  <span>
                    Demanda:{' '}
                    <strong className="text-white">{investigation.marketEvidence[0].titulo}</strong>
                  </span>
                </div>
                {investigation.startCourse && (
                  <>
                    <span className="text-[#1C2338]">•</span>
                    <div className="text-[#94A3B8]">
                      Ponto de partida:{' '}
                      <strong className="text-white">{investigation.startCourse.title}</strong>
                    </div>
                  </>
                )}
              </div>
            ) : investigation.basis === 'profile-only' ? (
              <p className="text-xs font-mono text-[#64748B]">
                Sugestão formulada com base no seu perfil e metas de estudo.
              </p>
            ) : null}
          </div>

          {/* CTA da Trilha */}
          <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row gap-2">
            <Link
              href="/trilha/sugerida"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#7146D1] hover:brightness-110 text-white font-semibold text-xs font-mono tracking-wide uppercase shadow-[0_0_20px_rgba(130,87,229,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>Ver Trilha Completa</span>
              <span>→</span>
            </Link>
            {investigation.startCourse && (
              <Link
                href={`/courses/${investigation.startCourse.slug}`}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5] text-white font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>Começar Agora</span>
              </Link>
            )}
          </div>
        </div>

        {/* SELETOR INTERATIVO DAS 4 TRILHAS MESTRAS */}
        <div className="mt-5 pt-4 border-t border-[#1C2338] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
            <span>🧭</span> Explorar ou Alternar Trilha Inteligente:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'frontend', label: 'Front-end & Web', icon: '🌐' },
              { id: 'backend', label: 'Back-end & Sistemas', icon: '⚙️' },
              { id: 'ai', label: 'Inteligência Artificial', icon: '🤖' },
              { id: 'web3', label: 'Web3 & Blockchain', icon: '⛓️' },
            ].map((t) => {
              const isCurrent = investigation.suggestedTrack === t.id;
              const isSwitching = switchingTrack === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitchTrack(t.id as any)}
                  disabled={Boolean(switchingTrack)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#8257E5] border-[#8257E5] text-white font-bold shadow-sm'
                      : 'bg-[#121624] border-[#1C2338] text-[#94A3B8] hover:text-white hover:border-[#8257E5]'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{isSwitching ? 'Calculando…' : t.label}</span>
                  {isCurrent && <span className="text-[#04D361] text-[10px]">● Ativa</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Etapas Concluídas */}
        <div className="mt-6 pt-5 border-t border-[#1C2338] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#121624] border border-[#1C2338] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00B37E]" />
            <div className="truncate">
              <div className="text-[10px] text-[#94A3B8] uppercase">Etapa 01</div>
              <div className="text-white truncate font-medium">Motivo &amp; Objetivo</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121624] border border-[#1C2338] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00B37E]" />
            <div className="truncate">
              <div className="text-[10px] text-[#94A3B8] uppercase">Etapa 02</div>
              <div className="text-white truncate font-medium">Mercado &amp; Vagas</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121624] border border-[#1C2338] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00B37E]" />
            <div className="truncate">
              <div className="text-[10px] text-[#94A3B8] uppercase">Etapa 03</div>
              <div className="text-white truncate font-medium">Stack Prática</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121624] border border-[#8257E5]/50 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
            <div className="truncate">
              <div className="text-[10px] text-[#A379FF] uppercase">Etapa 04</div>
              <div className="text-white truncate font-bold">Desafios no Sandbox</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
