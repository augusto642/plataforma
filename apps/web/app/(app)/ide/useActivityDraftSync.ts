'use client';

import { useEffect, useRef, useState } from 'react';
import { API_BASE, apiFetch } from '../../lib/apiClient';
import { readActivityDraft } from './practice';

interface RemoteDraft {
  code: string;
  revision: number;
}

type SyncState =
  | { phase: 'loading' | 'ready' | 'saving' }
  | { phase: 'conflict'; remote: RemoteDraft }
  | { phase: 'error' };

export function useActivityDraftSync(
  userId: string | undefined,
  activityId: string | undefined,
  code: string,
  restore: (value: string) => void,
) {
  return useDraftSync(userId, activityId, activityId && `/activities/${activityId}/draft`, code, restore);
}

export function usePlaygroundDraftSync(
  userId: string,
  language: string,
  code: string,
  restore: (value: string) => void,
) {
  return useDraftSync(userId, `playground:${language}`, `/playground-projects/drafts/${language}`, code, restore);
}

function useDraftSync(
  userId: string | undefined,
  storageKey: string | undefined,
  apiPath: string | undefined,
  code: string,
  restore: (value: string) => void,
) {
  const [state, setState] = useState<SyncState>({ phase: 'loading' });
  const [retry, setRetry] = useState(0);
  const codeRef = useRef(code);
  const restoreRef = useRef(restore);
  const revisionRef = useRef(0);
  const savedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  codeRef.current = code;
  restoreRef.current = restore;

  useEffect(() => {
    if (!userId || !storageKey || !apiPath) return;
    const controller = new AbortController();
    abortRef.current = controller;
    revisionRef.current = 0;
    savedRef.current = null;
    setState({ phase: 'loading' });
    const initialCode = codeRef.current;

    void (async () => {
      try {
        const res = await apiFetch(`${API_BASE}${apiPath}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Falha ao carregar rascunho.');
        const { draft } = await res.json() as { draft: RemoteDraft | null };
        if (controller.signal.aborted) return;
        let local: string | null;
        try {
          local = readActivityDraft(userId, storageKey);
        } catch {
          local = codeRef.current !== initialCode ? codeRef.current : null;
        }
        if (local === null && codeRef.current !== initialCode) local = codeRef.current;
        if (draft && local !== null && local !== draft.code) {
          setState({ phase: 'conflict', remote: draft });
          return;
        }
        revisionRef.current = draft?.revision ?? 0;
        if (draft) {
          savedRef.current = draft.code;
          if (local === null) restoreRef.current(draft.code);
        } else {
          savedRef.current = local === null ? codeRef.current : null;
        }
        setState({ phase: 'ready' });
      } catch {
        if (!controller.signal.aborted) setState({ phase: 'error' });
      }
    })();

    return () => controller.abort();
  }, [userId, storageKey, apiPath, retry]);

  useEffect(() => {
    if (!userId || !apiPath || state.phase !== 'ready' || code === savedRef.current) return;
    const controller = abortRef.current;
    if (!controller || controller.signal.aborted) return;
    const timer = setTimeout(() => {
      const snapshot = codeRef.current;
      setState({ phase: 'saving' });
      void (async () => {
        try {
          const res = await apiFetch(`${API_BASE}${apiPath}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: snapshot, revision: revisionRef.current }),
            signal: controller.signal,
          });
          if (res.status === 409) {
            const latest = await apiFetch(`${API_BASE}${apiPath}`, { signal: controller.signal });
            if (!latest.ok) throw new Error('Falha ao verificar conflito.');
            const { draft } = await latest.json() as { draft: RemoteDraft | null };
            if (!draft) throw new Error('Rascunho não encontrado.');
            if (!controller.signal.aborted) setState({ phase: 'conflict', remote: draft });
            return;
          }
          if (!res.ok) throw new Error('Falha ao salvar rascunho.');
          const saved = await res.json() as RemoteDraft;
          if (controller.signal.aborted) return;
          revisionRef.current = saved.revision;
          savedRef.current = snapshot;
          setState({ phase: 'ready' });
        } catch {
          if (!controller.signal.aborted) setState({ phase: 'error' });
        }
      })();
    }, 800);
    return () => clearTimeout(timer);
  }, [userId, apiPath, code, state]);

  function resolveConflict(useRemote: boolean) {
    if (state.phase !== 'conflict') return;
    revisionRef.current = state.remote.revision;
    savedRef.current = state.remote.code;
    if (useRemote) restoreRef.current(state.remote.code);
    setState({ phase: 'ready' });
  }

  return {
    state,
    useRemote: () => resolveConflict(true),
    useLocal: () => resolveConflict(false),
    retry: () => setRetry((value) => value + 1),
  };
}
