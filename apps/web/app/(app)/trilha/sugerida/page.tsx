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
  startInvestigation,
  type DynamicTrackView,
} from '../../../lib/dynamic-track';
import { TrackFooter, TrackTopbar } from '../components/track-chrome';

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
  const [investigation, setInvestigation] = useState<DynamicTrackView | null | undefined>(
    undefined,
  );
  const [bannerVisible, setBannerVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
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

  if (authLoading || investigation === undefined) {
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
    <div className="min-h-screen bg-dark-surface text-dark-on-surface font-body antialiased flex flex-col">
      {/* A10 — banner da sugestão pronta (toast do estado real) */}
      {bannerVisible && (
        <div className="bg-primary/20 border-b border-primary/40 px-6 py-3 flex items-center justify-between z-50">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-dark-primary text-white font-label text-xs font-bold rounded transition-colors shadow-sm"
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
          <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/15 border border-secondary/30 rounded-full text-xs font-code text-secondary font-bold">
            <MaterialIcon name="bolt" className="text-[16px]" />
            <span>Trilha Pronta</span>
          </div>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10" id="trilha-sugerida">
        <div className="rounded-xl bg-gradient-to-r from-primary/25 via-dark-surface-container to-dark-surface-container-low border border-primary/40 p-8 flex items-center justify-between">
          <div>
            <span className="font-code text-xs text-secondary font-bold uppercase tracking-wider block mb-1">
              Análise Concluída
            </span>
            <h1 className="font-headline text-display-md-mobile md:text-display-md text-white font-extrabold tracking-tight">
              Sua trilha chegou!
            </h1>
            <p className="text-body-md text-dark-on-surface-variant mt-2 max-w-xl">
              A IA cruzou suas respostas, o mercado de tecnologia e as vagas disponíveis
              para estruturar este caminho focado no seu objetivo.
            </p>
          </div>
          <div className="hidden md:flex w-20 h-20 rounded-2xl bg-primary/20 border border-primary/40 items-center justify-center text-primary">
            <MaterialIcon name="auto_awesome" className="text-[44px]" />
          </div>
        </div>

        <section className="rounded-2xl bg-dark-surface-container-low border-2 border-primary/60 p-8 md:p-10 shadow-2xl shadow-primary/15 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-6 border-b border-border-subtle">
            <div>
              <span className="px-3 py-1 rounded bg-primary/20 border border-primary/40 text-dark-primary font-code text-xs font-bold uppercase tracking-wider">
                Recomendada pela IA
              </span>
              <h2 className="font-headline text-headline-lg font-bold text-white mt-3">
                {investigation.trackName ?? 'Trilha sugerida'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-secondary/15 text-secondary font-code text-xs font-bold border border-secondary/30">
                Pronto para iniciar
              </span>
            </div>
          </div>

          {rationale && (
            <div className="p-5 rounded-xl bg-dark-surface-container border border-border-subtle mb-8 space-y-2">
              <div className="flex items-center gap-2 text-primary font-headline font-bold text-sm">
                <MaterialIcon name="psychology" className="text-[20px]" />
                <span>Sugerida para você porque...</span>
              </div>
              <p className="text-body-md text-dark-on-surface leading-relaxed">
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
          </div>
        </section>

        <section className="rounded-xl bg-dark-surface-container border border-border-strong p-8 flex flex-col md:flex-row items-center justify-between gap-6">
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
            className="w-full md:w-auto px-6 py-3 bg-dark-surface-container-high hover:bg-dark-surface border border-border-strong text-white font-label text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors flex-shrink-0"
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
  );
}
