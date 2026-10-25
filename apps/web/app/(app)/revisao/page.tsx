'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

/**
 * Fase 5 premium (desenho §6.2) — revisão offline-first.
 * Escopo EXPLÍCITO, repetido na tela: flashcards/quiz de revisão
 * funcionam offline; execução de código (Piston) fica SEMPRE online
 * e não existe nesta página. Funciona assim:
 * - online: busca o desafio diário (/activities/daily) e o guarda em
 *   localStorage para uso offline;
 * - offline: mostra a atividade guardada e aceita autoavaliação
 *   (Acertei/Errei), enfileirada em localStorage;
 * - ao voltar online: envia a fila para POST /activities/:id/review-sync
 *   (idempotente por clientId — reenvio não duplica) e limpa a fila.
 * A sincronização registra o resultado, sem mintar XP: revisar offline
 * não dá XP nem streak.
 */
const CACHE_KEY = 'nexus_review_cache';
const QUEUE_KEY = 'nexus_review_queue';

type ReviewActivity = {
  id: string;
  title: string;
  description: string;
  conceptTags?: string[];
};

type QueuedReview = {
  clientId: string;
  activityId: string;
  title: string;
  score: number;
  passed: boolean;
  createdAt: string;
};

function loadQueue(): QueuedReview[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function RevisaoPage() {
  const [activity, setActivity] = useState<ReviewActivity | null>(null);
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<QueuedReview[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const syncQueue = useCallback(async (items: QueuedReview[]) => {
    if (!items.length) return;
    let synced = 0;
    const remaining: QueuedReview[] = [];
    for (const item of items) {
      try {
        const res = await apiFetch(`/activities/${item.activityId}/review-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: item.clientId,
            score: item.score,
            passed: item.passed,
          }),
        });
        if (res.ok) synced += 1;
        else remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    setQueue(remaining);
    setStatus(
      synced > 0
        ? `${synced} revisõe(s) sincronizada(s)${remaining.length ? `; ${remaining.length} pendente(s).` : '.'}`
        : 'Sem conexão — a fila continua guardada no aparelho.',
    );
  }, []);

  const load = useCallback(async () => {
    setQueue(loadQueue());
    try {
      const res = await apiFetch('/activities/daily');
      if (!res.ok) throw new Error('daily indisponível');
      const data = await res.json();
      if (data?.activity) {
        setActivity(data.activity);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.activity));
        setOffline(false);
      } else {
        setStatus('Nenhuma atividade de revisão disponível no momento.');
      }
    } catch {
      setOffline(true);
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setActivity(JSON.parse(cached));
        else setStatus('Você está offline e ainda não há revisão guardada neste aparelho.');
      } catch {
        setStatus('Você está offline e ainda não há revisão guardada neste aparelho.');
      }
    }
  }, []);

  useEffect(() => {
    load();
    const onOnline = () => {
      setOffline(false);
      setStatus('Conexão de volta — sincronizando a fila…');
      syncQueue(loadQueue());
    };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [load, syncQueue]);

  function grade(passed: boolean) {
    if (!activity) return;
    const item: QueuedReview = {
      clientId: `${activity.id}-${Date.now()}`,
      activityId: activity.id,
      title: activity.title,
      score: passed ? 100 : 0,
      passed,
      createdAt: new Date().toISOString(),
    };
    const next = [...loadQueue(), item];
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
    setQueue(next);
    setStatus(
      offline
        ? 'Resposta guardada offline — será sincronizada ao voltar a conexão.'
        : 'Resposta guardada — sincronizando…',
    );
    if (!offline) syncQueue(next);
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Revisão</h1>
      <p className="text-sm text-zinc-400">
        Revisão offline-first: flashcards e quizzes funcionam sem internet.
        A execução de código continua sempre online — esta página não roda código.
      </p>
      {offline && (
        <p role="status" className="rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm">
          Você está offline — mostrando a revisão guardada neste aparelho.
        </p>
      )}
      {status && <p role="status" className="text-sm text-zinc-300">{status}</p>}
      {activity ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 space-y-3">
          <h2 className="font-semibold">{activity.title}</h2>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{activity.description}</p>
          {activity.conceptTags?.length ? (
            <p className="text-xs text-zinc-500">Temas: {activity.conceptTags.join(', ')}</p>
          ) : null}
          <p className="text-sm text-zinc-400">
            Tente resolver de cabeça (sem rodar código aqui) e avalie-se:
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium"
              onClick={() => grade(true)}
            >
              Acertei
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-red-800 text-white text-sm font-medium"
              onClick={() => grade(false)}
            >
              Errei — revisar
            </button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-zinc-400">Nenhuma revisão carregada.</p>
      )}
      {queue.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Fila para sincronizar ({queue.length})</h2>
          <ul className="space-y-1">
            {queue.map((item) => (
              <li key={item.clientId} className="text-sm text-zinc-400">
                {item.title} — {item.passed ? 'acerto' : 'erro'}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 px-3 py-2 rounded-lg border border-zinc-700 text-sm"
            onClick={() => syncQueue(loadQueue())}
          >
            Sincronizar agora
          </button>
        </section>
      )}
    </main>
  );
}
