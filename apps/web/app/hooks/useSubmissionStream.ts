'use client';

import { useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface SubmissionEvent {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  durationMs: number | null;
  errorMessage?: string;
  aiFeedback?: string;
  aiHints?: string;
  createdAt?: string;
  testResults: Array<{
    id: string;
    name: string;
    passed: boolean;
    durationMs?: number;
    errorMessage?: string;
    isHidden?: boolean;
  }>;
}

function parseSSE(buffer: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = [];
  const rawEvents = buffer.split('\n\n');
  for (const raw of rawEvents) {
    const lines = raw.split('\n');
    let current: { event?: string; data: string } = { data: '' };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed.startsWith('event:')) {
        current.event = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('data:')) {
        current.data = (current.data || '') + trimmed.slice(4).trim();
      }
    }
    if (current.data) {
      events.push({ event: current.event || 'message', data: current.data });
    }
  }
  return events;
}

export function useSubmissionStream(
  submissionId: string | null,
  token: string | null,
  onUpdate: (sub: SubmissionEvent) => void,
  onComplete: () => void,
) {
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!submissionId || !token) return;

    stop();
    const controller = new AbortController();
    abortRef.current = controller;

    let buffer = '';

    const startStream = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token && token !== 'cookie-auth') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/submissions/${submissionId}/events`, {
          headers,
          signal: controller.signal,
          credentials: 'include',
        });

        if (!res.ok || !res.body) {
          onComplete();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lastDoubleNewline = buffer.lastIndexOf('\n\n');
          if (lastDoubleNewline !== -1) {
            const complete = buffer.slice(0, lastDoubleNewline);
            buffer = buffer.slice(lastDoubleNewline + 2);
            const events = parseSSE(complete);
            for (const evt of events) {
              try {
                const data = JSON.parse(evt.data);
                if (data.status === 'queued' || data.status === 'running' || data.status === 'pending') {
                  onUpdate(data);
                } else {
                  onUpdate(data);
                  onComplete();
                  return;
                }
              } catch {
                // skip malformed events
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onComplete();
        }
      }
    };

    startStream();

    return stop;
  }, [submissionId, token, onUpdate, onComplete, stop]);
}
