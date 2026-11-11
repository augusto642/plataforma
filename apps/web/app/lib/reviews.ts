import { apiFetch } from './apiClient';
import { parseError } from './parse-error';

/**
 * Fase 2 premium (desenho §3.2) — client da revisão de código por IA.
 * A revisão COMPLEMENTA o resultado dos testes ocultos: é exibida ao
 * lado do passa/falha, nunca no lugar dele.
 */

export interface CodeReview {
  id: string;
  submissionId: string;
  kind: string;
  status: string;
  rubric: Record<string, { score: number; comment: string }> | null;
  summary: string | null;
  suggestions: string[];
  note: string | null;
  createdAt: string;
}

export async function requestAiReview(submissionId: string): Promise<CodeReview> {
  const res = await apiFetch(`/reviews/submissions/${encodeURIComponent(submissionId)}`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function listReviews(submissionId: string): Promise<CodeReview[]> {
  const res = await apiFetch(`/reviews/submissions/${encodeURIComponent(submissionId)}`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// Central 219 (D2) — "Revisões da IA Salvas" do dashboard: as
// revisões das próprias submissões do usuário (GET /reviews/me).
// Rejeita em !ok (403 de plano free incluído) para o card sumir
// fail-closed, nunca inventar lista.
export interface SavedReview {
  id: string;
  kind: string;
  status: string;
  summary: string | null;
  createdAt: string;
  submissionId: string;
  activityTitle: string | null;
}

export async function listMyReviews(): Promise<SavedReview[]> {
  const res = await apiFetch('/reviews/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}
