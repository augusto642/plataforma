'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

// Trilha dinâmica v1 (Central 209) — card "Sua trilha" do dashboard.
// Lê GET /dynamic-track/me (ao carregar + refresh manual) e mostra um
// dos 3 estados da investigação. Quando `ready` e ainda não vista, marca
// POST /dynamic-track/me/seen (GET não tem efeito colateral — DESIGN D5).
// O aluno nunca fica bloqueado: os links para trilha inicial, desafios
// e cursos avulsos aparecem em todos os estados. Nenhum número é exibido
// sem lastro: evidências de mercado só aparecem com fonte, URL e data
// (a API só devolve sinais >= 70 — DESIGN D2).

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

function AlwaysLinks() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link
        href="/ide"
        className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
      >
        🚀 Trilha inicial grátis
      </Link>
      <Link
        href="/desafios"
        className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
      >
        🏆 Desafios iniciais
      </Link>
      <Link
        href="/courses"
        className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
      >
        📚 Cursos avulsos
      </Link>
    </div>
  );
}

export function DynamicTrackCard() {
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(undefined);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const seenRef = useRef(false);

  async function load() {
    try {
      const res = await apiFetch(`${API_BASE}/dynamic-track/me`);
      if (!res.ok) {
        setInvestigation(null);
        return;
      }
      const data = await res.json();
      setInvestigation((data?.investigation ?? null) as DynamicTrackView | null);
    } catch {
      setInvestigation(null);
    }
  }

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

  // Quando a sugestão fica pronta e ainda não foi vista, marca seen.
  useEffect(() => {
    if (
      investigation &&
      investigation.status === 'ready' &&
      !investigation.notifiedAt &&
      !seenRef.current
    ) {
      seenRef.current = true;
      apiFetch(`${API_BASE}/dynamic-track/me/seen`, { method: 'POST' }).catch(
        () => {},
      );
    }
  }, [investigation]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await apiFetch(`${API_BASE}/dynamic-track/me/start`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStartError(
          (data?.message as string) ||
            'Não foi possível iniciar a investigação agora. Tente novamente.',
        );
        return;
      }
      await load();
    } catch {
      setStartError(
        'Não foi possível conectar ao servidor. Tente novamente.',
      );
    } finally {
      setStarting(false);
    }
  }

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

  // Sem investigação (conta criada antes da trilha dinâmica): oferece
  // iniciar — o aluno nunca fica sem caminho.
  if (investigation === null) {
    return (
      <section
        aria-label="Sua trilha"
        className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
      >
        <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
          Sua trilha
        </span>
        <h2 className="font-bold text-white mt-2">
          Receba uma trilha sugerida para você
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Analisamos seu perfil e suas metas — motivo, mercado, stack,
          desafios e vagas — e sugerimos a melhor trilha em até 2 dias.
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
            {starting ? 'Iniciando…' : '✨ Sugerir minha trilha'}
          </button>
        </div>
        <AlwaysLinks />
      </section>
    );
  }

  if (investigation.status === 'investigating') {
    return (
      <section
        aria-label="Sua trilha"
        className="spotlight-card rounded-2xl border border-zinc-800 bg-[#121217] p-5"
      >
        <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
          Sua trilha
        </span>
        <h2 className="font-bold text-white mt-2">
          Estamos investigando a melhor trilha para você
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Estamos investigando a melhor trilha para você — seu motivo, o
          mercado, a stack, os desafios e as vagas. Prazo: até{' '}
          {formatDate(investigation.slaDueAt)}.
        </p>
        {investigation.overdue && (
          <p className="text-sm text-amber-400 mt-2">
            Prazo estendido — a investigação passou de{' '}
            {formatDate(investigation.slaDueAt)} e continua em andamento.
            Nada foi inventado para cumprir o prazo.
          </p>
        )}
        <AlwaysLinks />
      </section>
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
        <AlwaysLinks />
      </section>
    );
  }

  // ready
  return (
    <section
      aria-label="Sua trilha"
      className="spotlight-card rounded-2xl border border-[#8257E5]/40 bg-[#121217] p-5"
    >
      <span className="text-xs font-bold text-[#8257E5] uppercase tracking-wider">
        Sua trilha
      </span>
      <h2 className="font-bold text-white mt-2">Sua trilha está pronta!</h2>
      <p className="text-lg font-bold text-white mt-2">
        {investigation.trackName ?? 'Trilha sugerida'}
      </p>
      {investigation.rationaleText && (
        <p className="text-sm text-zinc-400 mt-1">
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
          📚 Ver cursos avulsos
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href="/ide"
          className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
        >
          🚀 Trilha inicial grátis
        </Link>
        <Link
          href="/desafios"
          className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-200 hover:border-[#8257E5] hover:text-white transition-colors"
        >
          🏆 Desafios iniciais
        </Link>
      </div>
    </section>
  );
}
