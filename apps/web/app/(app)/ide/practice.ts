import { apiFetch, API_BASE } from '../../lib/apiClient';

export interface PracticeResult {
  status: 'passed' | 'failed' | 'error';
  kind: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  errorMessage?: string;
}

async function runCode(path: 'practice' | 'playground', body: object, signal?: AbortSignal): Promise<PracticeResult> {
  const res = await apiFetch(`${API_BASE}/submissions/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error('Não foi possível executar o código. Confira a conexão e tente novamente.');
  return res.json();
}

export function executePractice(activityId: string, code: string, stdin: string, signal?: AbortSignal): Promise<PracticeResult> {
  return runCode('practice', { activityId, code, stdin }, signal);
}

export function executePlayground(language: 'javascript' | 'python' | 'portugol', code: string, stdin: string, signal?: AbortSignal): Promise<PracticeResult> {
  return runCode('playground', { language, code, stdin }, signal);
}

function draftKey(userId: string, activityId: string): string {
  return `nexus-ide-draft:${userId}:${activityId}`;
}

export function readActivityDraft(userId: string, activityId: string): string | null {
  return sessionStorage.getItem(draftKey(userId, activityId));
}

export function saveActivityDraft(userId: string, activityId: string, code: string): void {
  sessionStorage.setItem(draftKey(userId, activityId), code);
}
