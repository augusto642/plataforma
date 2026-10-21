// B08 (mínimo) — mensuração própria do funil da landing.
//
// Sem provedor externo: os eventos vão para o endpoint próprio da API
// (POST /analytics/events, tabela analytics_events) — ver apps/api/src/analytics.
// Conectar um provedor (PostHog/Plausible) depois é trocar o destino do
// flush, sem tocar nos pontos de chamada.
//
// Desenho: track() é síncrono e nunca lança; os eventos entram numa fila em
// memória e são despachados em lote via sendBeacon (sobrevive à navegação
// do clique no CTA) com fallback para fetch keepalive.

import { API_BASE } from './apiClient';

// Catálogo fechado de eventos do funil (espelhado no DTO da API —
// apps/api/src/analytics/dto/track-events.dto.ts). Não invente nomes fora
// daqui: a API rejeita eventos fora do catálogo.
// Sprint 5 — topo e fundo do funil: pageview (com visitorId persistente),
// diagnóstico (started/completed) e primeira atividade concluída.
export type FunnelEvent =
  | 'pageview'
  | 'hero_cta'
  | 'quiz_cta'
  | 'pricing_cta'
  | 'trilha_cta'
  | 'sandbox_cta'
  | 'nav_cta'
  | 'final_cta'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'signup_submit'
  | 'signup_success'
  | 'first_activity_completed';

export interface TrackProps {
  [key: string]: string | number | boolean;
}

interface QueuedEvent {
  event: FunnelEvent;
  ctaId?: string;
  sessionId: string;
  visitorId: string;
  path: string;
  props?: TrackProps;
  ts: string;
}

const SESSION_KEY = 'nexus_analytics_session';
const VISITOR_KEY = 'nexus_analytics_visitor';
const FLUSH_DELAY_MS = 800;
const MAX_QUEUE = 50;

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;
let lastPageview: { path: string; at: number } | null = null;

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newId('sess');
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

// Visitor id PERSISTENTE (localStorage): sobrevive às sessões do navegador
// e permite contar visitantes únicos e costurar visita → clique → cadastro.
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = newId('visitor');
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0 || typeof window === 'undefined') return;

  const batch = queue;
  queue = [];
  const url = `${API_BASE}/analytics/events`;
  const body = JSON.stringify({ events: batch });

  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // sendBeacon indisponível/falhou: cai para o fetch abaixo
  }

  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // analytics nunca pode quebrar a experiência do visitante
  }
}

function installUnloadFlush(): void {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/**
 * Registra um evento do funil. `ctaId` é o identificador estável do CTA
 * (o mesmo valor do atributo data-cta-id no elemento).
 */
export function track(event: FunnelEvent, ctaId?: string, props?: TrackProps): void {
  if (typeof window === 'undefined') return;
  try {
    queue.push({
      event,
      ctaId,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      path: window.location.pathname,
      props,
      ts: new Date().toISOString(),
    });
    if (queue.length >= MAX_QUEUE) {
      flush();
      return;
    }
    installUnloadFlush();
    if (!flushTimer) {
      flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
    }
  } catch {
    // analytics nunca pode quebrar a experiência do visitante
  }
}

/**
 * Pageview do funil (Sprint 5): chamado na montagem das páginas do funil
 * (landing, diagnóstico, onboarding, cadastro). A guarda absorve a
 * montagem dupla do StrictMode em dev — o mesmo path dentro de 1,5s
 * conta uma vez só.
 */
export function trackPageview(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const now = Date.now();
  if (lastPageview && lastPageview.path === path && now - lastPageview.at < 1500) {
    return;
  }
  lastPageview = { path, at: now };
  track('pageview');
}
