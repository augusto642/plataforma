// Central 216 (F1) — contrato compartilhado da trilha dinâmica
// (GET /dynamic-track/me; POST /dynamic-track/me/start; POST
// /dynamic-track/me/seen). O mesmo contrato que o DynamicTrackCard do
// dashboard já consumia; as rotas /trilha/aguardando e /trilha/sugerida
// reutilizam-no aqui, sem duplicar o tipo nem a fiação.
//
// Regras de honestidade (209+213, mantidas):
// - a sugestão só existe com dado real da API (status ready);
// - marketEvidence só é exibido com evidência real (length > 0);
// - sem investigação, o aluno inicia uma — nunca um "preparando" falso.
import { apiFetch, API_BASE } from './apiClient';

export interface MarketEvidenceView {
  titulo: string;
  tecnologia: string;
  tipo: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  evidencia?: string | null;
  score: number;
}

export interface DynamicTrackView {
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

/** GET /dynamic-track/me — null quando não há investigação ou a API falha. */
export async function fetchMyInvestigation(): Promise<DynamicTrackView | null> {
  try {
    const res = await apiFetch(`${API_BASE}/dynamic-track/me`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.investigation ?? null) as DynamicTrackView | null;
  } catch {
    return null;
  }
}

/** POST /dynamic-track/me/start — inicia (ou retenta) a investigação. */
export async function startInvestigation(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`${API_BASE}/dynamic-track/me/start`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        ok: false,
        error:
          (data?.message as string) ||
          'Não foi possível iniciar a investigação agora. Tente novamente.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Não foi possível conectar ao servidor. Tente novamente.' };
  }
}

/** POST /dynamic-track/me/seen — marca a sugestão como vista (toast). */
export async function markInvestigationSeen(): Promise<void> {
  try {
    await apiFetch(`${API_BASE}/dynamic-track/me/seen`, { method: 'POST' });
  } catch {
    // Best-effort: o toast pode reaparecer; nada quebra por isso.
  }
}

/**
 * Rota da trilha para cada estado da investigação — o roteamento das
 * telas de trilha (F1) e do card do dashboard segue esta regra única.
 */
export function trackRouteFor(
  investigation: DynamicTrackView | null | undefined,
): '/trilha/aguardando' | '/trilha/sugerida' | null {
  if (!investigation) return null;
  if (investigation.status === 'ready') return '/trilha/sugerida';
  if (investigation.status === 'investigating') return '/trilha/aguardando';
  return null;
}

/** A6 — o rodapé "mercado real" só existe com evidência real de mercado. */
export function hasMarketEvidence(investigation: DynamicTrackView | null | undefined): boolean {
  return (investigation?.marketEvidence?.length ?? 0) > 0;
}

export function formatTrackDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
