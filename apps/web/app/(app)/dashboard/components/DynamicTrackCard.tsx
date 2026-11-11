'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchMyInvestigation,
  formatTrackDate,
  markInvestigationSeen,
  startInvestigation,
  type DynamicTrackView,
} from '../../../lib/dynamic-track';

// Redesign v2 (Central 213) — card "Sua trilha" do dashboard, adaptado
// do DynamicTrackCard da trilha dinâmica (Central 209). Consome o
// CONTRATO da API da 209 (GET /dynamic-track/me; POST /dynamic-track/
// me/seen; POST /dynamic-track/me/start) e mostra um dos 3 estados do
// brief da trilha dinâmica: preparando, sugerida e toast de pronta.
//
// MERGE 209+213: o backend da 209 existe nesta árvore (módulo
// dynamic-track + migration), então o GET é real. A sugestão só
// renderiza quando a API devolver uma sugestão real (status ready) —
// NUNCA uma sugestão inventada. Sem investigação (conta anterior à
// trilha dinâmica), o card oferece iniciar (POST /me/start, fiação 209).
//
// Central 216 (F1) — o tipo e a fiação vivem em lib/dynamic-track.ts
// (compartilhados com as rotas /trilha/aguardando e /trilha/sugerida);
// o card linka para essas rotas em vez de só exibir o estado.

function formatDate(iso: string | null): string {
  return formatTrackDate(iso);
}

// Etapas da investigação (brief Tela 1) — exibidas sem prometer
// conclusão de nenhuma: são o andamento declarado, não progresso medido.
const INVESTIGATION_STEPS = [
  'motivo e objetivo',
  'mercado e vagas',
  'stack',
  'desafios',
];

function PreparingLinks() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link
        href="/desafios"
        className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
      >
        🏆 Começar desafios iniciais
      </Link>
      <Link
        href="/courses"
        className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
      >
        📚 Ver cursos avulsos
      </Link>
      <Link
        href="/ide"
        className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
      >
        🚀 Explorar a plataforma
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
  // Fiação 209: só presente quando NÃO há investigação (conta anterior
  // à trilha dinâmica) — o card oferece iniciar em vez de fingir que
  // algo está sendo preparado.
  onStart?: () => void;
  starting?: boolean;
  startError?: string | null;
}) {
  return (
    <section
      aria-label="Sua trilha"
      className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
    >
      <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
        Sua trilha
      </span>
      <h2 className="font-bold text-white mt-2">
        {onStart
          ? 'Receba uma trilha sugerida para você'
          : 'Sua trilha está sendo preparada'}
      </h2>
      <p className="text-sm text-zinc-400 mt-1">
        {onStart
          ? 'Analisamos seu perfil e suas metas — motivo, mercado, stack, desafios e vagas — e sugerimos a melhor trilha em até 2 dias.'
          : 'A IA está analisando seu perfil, o mercado e as vagas para montar sua trilha personalizada. Ela chega em até 2 dias — avisaremos você aqui na plataforma.'}
      </p>
      {!onStart && (
        <div className="mt-4">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Andamento da investigação
          </h3>
          <ul className="mt-2 space-y-1.5">
            {INVESTIGATION_STEPS.map((step) => (
              <li key={step} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-[#8257E5] animate-pulse shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
      {slaDueAt && (
        <p className="text-xs text-zinc-500 mt-3">
          Prazo: até {formatDate(slaDueAt)}.
          {overdue
            ? ' Prazo estendido — a investigação continua em andamento. Nada foi inventado para cumprir o prazo.'
            : ''}
        </p>
      )}
      {!onStart && (
        <div className="mt-3">
          <Link
            href="/trilha/aguardando"
            className="text-xs font-bold text-[#996DFF] hover:underline"
          >
            Acompanhar o andamento da investigação →
          </Link>
        </div>
      )}
      {onStart && (
        <>
          {startError && (
            <p role="alert" className="text-sm text-red-400 mt-3">
              {startError}
            </p>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              className="bg-[#8257E5] hover:bg-[#996DFF] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              {starting ? 'Iniciando…' : '✨ Sugerir minha trilha'}
            </button>
          </div>
        </>
      )}
      <p className="text-sm text-zinc-400 mt-3">O que fazer enquanto espera:</p>
      <PreparingLinks />
    </section>
  );
}

export function DynamicTrackCard() {
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(undefined);
  const [toastVisible, setToastVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const seenRef = useRef(false);

  // Fiação 209 — POST /dynamic-track/me/start: contas criadas antes da
  // trilha dinâmica (ou com investigação falha) iniciam/tentam de novo.
  async function load() {
    setInvestigation(await fetchMyInvestigation());
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
      if (!cancelled) setInvestigation(inv);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Quando a sugestão fica pronta e ainda não foi vista, mostra o toast
  // (Tela 3 do brief) e marca seen — GET não tem efeito colateral.
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

  // Carregando: reserva o espaço sem prometer nada.
  if (investigation === undefined) {
    return (
      <section
        aria-label="Sua trilha"
        className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5 animate-pulse"
      >
        <p className="text-sm text-zinc-500">Carregando sua trilha…</p>
      </section>
    );
  }

  // Sem investigação (conta anterior à trilha dinâmica): oferece
  // iniciar — o aluno nunca fica sem caminho nem com um "preparando"
  // falso (nada está em andamento aqui).
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
        className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
      >
        <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
          Sua trilha
        </span>
        <h2 className="font-bold text-white mt-2">
          A investigação da sua trilha falhou
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          {investigation.failureReason
            ? `Motivo: ${investigation.failureReason}`
            : 'Não foi possível concluir a investigação da sua trilha.'}{' '}
          Você pode tentar novamente — 1 tentativa a cada 24 horas.
        </p>
        {startError && (
          <p role="alert" className="text-sm text-red-400 mt-3">
            {startError}
          </p>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="bg-[#8257E5] hover:bg-[#996DFF] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            {starting ? 'Tentando novamente…' : '↻ Tentar de novo'}
          </button>
        </div>
        <PreparingLinks />
      </section>
    );
  }

  // ready — SÓ renderiza com sugestão real da API.
  return (
    <>
      {toastVisible && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#8257E5]/50 bg-[#8257E5]/15 px-4 py-3"
        >
          <span className="text-sm font-bold text-white">
            Sua trilha personalizada está pronta — Começar agora
          </span>
          <span className="flex items-center gap-2">
            <Link
              href="/trilha/sugerida"
              className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
            >
              Ver trilha sugerida
            </Link>
            {investigation.startCourse ? (
              <Link
                href={`/courses/${investigation.startCourse.slug}`}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
              >
                Começar agora
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setToastVisible(false)}
              aria-label="Fechar aviso"
              className="text-zinc-400 hover:text-white text-sm px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </span>
        </div>
      )}
      <section
        aria-label="Sua trilha"
        className="spotlight-card rounded-2xl border border-[#8257E5]/40 bg-[#121217] p-5"
      >
        <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
          Sua trilha chegou!
        </span>
        <p className="text-lg font-bold text-white mt-2">
          {investigation.trackName ?? 'Trilha sugerida'}
        </p>
        {investigation.rationaleText && (
          <p className="text-sm text-zinc-400 mt-1">
            <span className="font-semibold text-zinc-300">
              Sugerida para você porque:{' '}
            </span>
            {investigation.rationaleText}
          </p>
        )}
        {investigation.basis === 'profile-only' && (
          <p className="text-xs text-zinc-500 mt-2">
            Sugestão baseada só no seu perfil — nenhuma fonte de mercado
            estava disponível no momento da investigação.
          </p>
        )}
        {/* Guarda 209+213: marketEvidence pode vir null/undefined da API
            — a seção só existe com evidência real (e a API só devolve
            sinais >= 70). */}
        {(investigation.marketEvidence?.length ?? 0) > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Evidências de mercado
            </h3>
            <ul className="mt-2 space-y-2">
              {investigation.marketEvidence?.map((item) => (
                <li
                  key={item.sourceUrl}
                  className="text-sm text-zinc-400 border border-zinc-800 rounded-xl p-3"
                >
                  <span className="block font-semibold text-zinc-200">
                    {item.titulo}
                  </span>
                  {item.evidencia && (
                    <span className="block mt-1">{item.evidencia}</span>
                  )}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-1 text-[#996DFF] hover:underline break-all"
                  >
                    {item.sourceName} — {formatDate(item.publishedAt)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/trilha/sugerida"
            className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            Ver trilha sugerida
          </Link>
          {investigation.startCourse ? (
            <Link
              href={`/courses/${investigation.startCourse.slug}`}
              className="text-xs font-bold px-4 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
            >
              🚀 Começar minha trilha — {investigation.startCourse.title}
            </Link>
          ) : (
            <p className="text-sm text-zinc-400">
              O curso desta trilha ainda não está publicado — veja os cursos
              avulsos abaixo.
            </p>
          )}
          <Link
            href="/courses"
            className="text-xs font-bold px-4 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
          >
            📚 Prefere escolher? Veja os cursos avulsos
          </Link>
        </div>
        <PreparingLinks />
      </section>
    </>
  );
}
