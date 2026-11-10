import { apiFetch } from './apiClient';

/**
 * Fase 3 premium (desenho §4.2) — client da comunidade.
 * Ler é livre; postar/comentar/compartilhar/revisar é Pro/Carreira
 * (free recebe 403 da API). A galeria mostra só soluções aprovadas,
 * com opt-in do autor — nunca testes ocultos.
 */

export interface ForumThread {
  id: string;
  activityId: string | null;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; nickname: string | null };
  _count: { posts: number };
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  flagged: boolean;
  createdAt: string;
  author: { id: string; name: string; nickname: string | null };
}

export interface Solution {
  shareId: string;
  author: { id: string; name: string; nickname: string | null };
  codeSnapshot: string | null;
  score: number | null;
  submittedAt: string;
}

export interface OpenPeerRequest {
  reviewId: string;
  requestedAt: string;
  author: { id: string; name: string; nickname: string | null };
  activity: { id: string; title: string };
  codeSnapshot: string | null;
}

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string | string[] }).message ?? 'Não foi possível completar a operação.';
  return new Error(Array.isArray(message) ? message.join(' ') : message);
}

async function postJson(url: string, body: unknown) {
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function listThreads(activityId?: string): Promise<ForumThread[]> {
  const res = await apiFetch(
    activityId ? `/community/threads?activityId=${activityId}` : '/community/threads',
  );
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createThread(title: string, body: string, activityId?: string) {
  return postJson('/community/threads', { title, body, activityId: activityId || undefined });
}

export async function listPosts(threadId: string): Promise<ForumPost[]> {
  const res = await apiFetch(`/community/threads/${threadId}/posts`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function createPost(threadId: string, body: string) {
  return postJson(`/community/threads/${threadId}/posts`, { body });
}

export async function flagPost(postId: string) {
  const res = await apiFetch(`/community/posts/${postId}/flag`, { method: 'POST' });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function listSolutions(activityId: string): Promise<Solution[]> {
  const res = await apiFetch(`/community/solutions/${activityId}`);
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function listOpenPeerRequests(): Promise<OpenPeerRequest[]> {
  const res = await apiFetch('/reviews/peer/open');
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function submitPeerReview(
  reviewId: string,
  rubric: Record<string, { score: number; comment: string }>,
  summary: string,
  suggestions: string[],
) {
  return postJson(`/reviews/peer/${reviewId}`, { rubric, summary, suggestions });
}

export async function requestPeerReview(submissionId: string) {
  const res = await apiFetch(`/reviews/submissions/${submissionId}/peer`, { method: 'POST' });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
