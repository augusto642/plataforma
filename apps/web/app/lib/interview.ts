import { apiFetch } from './apiClient';

/**
 * Fase 2 premium (desenho §3.1) — client do simulador de entrevista.
 * Posicionamento em toda a UI: treino, não substituto de entrevista
 * humana real. Nenhum texto promete emprego.
 */

export interface InterviewTurn {
  id: string;
  role: string;
  content: string;
  evaluation?: Record<string, { score: number; evidence: string }> | null;
}

export interface InterviewReport {
  id: string;
  scores: Record<string, { score: number; evidence: string }>;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
}

export interface InterviewSession {
  id: string;
  mode: string;
  track: string | null;
  status: string;
  createdAt: string;
  endedAt: string | null;
  turns: InterviewTurn[];
  report: InterviewReport | null;
}

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string | string[] }).message ??
    'Não foi possível completar a operação.';
  return new Error(Array.isArray(message) ? message.join(' ') : message);
}

export async function createInterviewSession(
  mode: 'technical' | 'behavioral',
  track?: string,
): Promise<InterviewSession> {
  const res = await apiFetch('/interview/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, track: track || undefined }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function listInterviewSessions(): Promise<InterviewSession[]> {
  const res = await apiFetch('/interview/sessions/me');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function getInterviewSession(id: string): Promise<InterviewSession> {
  const res = await apiFetch(`/interview/sessions/${encodeURIComponent(id)}`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function answerInterview(
  id: string,
  content: string,
): Promise<InterviewSession> {
  const res = await apiFetch(`/interview/sessions/${encodeURIComponent(id)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function finishInterview(id: string): Promise<InterviewReport> {
  const res = await apiFetch(`/interview/sessions/${encodeURIComponent(id)}/finish`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
