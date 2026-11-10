'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

// Redesign v2 (Central 213) — card "Sua trilha" do dashboard, adaptado
// do DynamicTrackCard da trilha dinâmica (Central 209). Consome o
// CONTRATO da API da 209 (GET /dynamic-track/me; POST /dynamic-track/
// me/seen) e mostra um dos 3 estados do brief da trilha dinâmica:
// preparando, sugerida e toast de pronta.
//
// DECISÃO DE ARQUITETURA: este branch NÃO inclui o backend da 209
// (sem módulo dynamic-track, sem migration). Enquanto a API não
// existir aqui, o GET falha e a UI mostra o estado "preparando"
// (Tela 1 do brief) — NUNCA uma sugestão inventada. A sugestão só
// renderiza quando a API devolver uma sugestão real (status ready).

interface MarketEvidenceView {
  titulo: string;
  tecnologia: string;
  tipo: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  evidencia?: string | null;
  score: number;
}

interface DynamicTrackView {
  id: string;
  status: 'investigating' | 'ready' | 'failed';
  suggestedTrack: string | null;
  trackName: string | null;
  reasons: string[];
  rationaleText: string | null;
  basis: string | null;
  marketEvidence: MarketEvidenceView[];
  slaDueAt: string;
  overdue: boolean;
  completedAt: string | null;
  notifiedAt: string | null;
  failureReason: string | null;
  startCourse: { slug: string; title: string } | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
}: {
  slaDueAt?: string | null;
  overdue?: boolean;
}) {
  return (
    <section
      aria-label="Sua trilha"
      className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
    >
      <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
        Sua trilha
      </span>
      <h2 className="font-bold text-white mt-2">Sua trilha está sendo preparada</h2>
      <p className="text-sm text-zinc-400 mt-1">
        A IA está analisando seu perfil, o mercado e as vagas para montar sua trilha
        personalizada. Ela chega em até 2 dias — avisaremos você aqui na plataforma.
      </p>
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
      {slaDueAt && (
        <p className="text-xs text-zinc-500 mt-3">
          Prazo: até {formatDate(slaDueAt)}.
          {overdue
            ? ' Prazo estendido — a investigação continua em andamento. Nada foi inventado para cumprir o prazo.'
            : ''}
        </p>
      )}
      <p className="text-sm text-zinc-400 mt-3">O que fazer enquanto espera:</p>
      <PreparingLinks />
    </section>
  );
}

export function DynamicTrackCard() {
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(undefined);
  const [toastVisible, setToastVisible] = useState(false);
  const seenRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/dynamic-track/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setInvestigation((data?.investigation ?? null) as DynamicTrackView | null);
      })
      .catch(() => {
        if (!cancelled) setInvestigation(null);
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
      apiFetch(`${API_BASE}/dynamic-track/me/seen`, { method: 'POST' }).catch(
        () => {},
      );
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

  // Sem investigação (sem backend neste branch, ou conta anterior à
  // trilha dinâmica): estado "preparando" — nunca sugestão inventada.
  if (investigation === null) {
    return <PreparingView />;
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
          Você pode tentar novamente quando o serviço estiver disponível.
        </p>
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
            {investigation.startCourse ? (
              <Link
                href={`/courses/${investigation.startCourse.slug}`}
                className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
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
        {investigation.marketEvidence.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Evidências de mercado
            </h3>
            <ul className="mt-2 space-y-2">
              {investigation.marketEvidence.map((item) => (
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
          {investigation.startCourse ? (
            <Link
              href={`/courses/${investigation.startCourse.slug}`}
              className="bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
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
