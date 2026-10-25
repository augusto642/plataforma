import { apiFetch } from './apiClient';

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

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string | string[] }).message ??
    'Não foi possível completar a operação.';
  return new Error(Array.isArray(message) ? message.join(' ') : message);
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
