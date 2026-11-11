'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  createInterviewSession,
  listInterviewSessions,
  type InterviewSession,
} from '../../lib/interview';

/**
 * Fase 2 premium (desenho §3.1) — lista e criação de sessões de
 * entrevista simulada (Pro/Carreira; free recebe 403 da API).
 * Posicionamento obrigatório: treino, não substituto de entrevista
 * humana real. Cap: 20 turnos por sessão, 1 sessão ativa por vez.
 */
export default function EntrevistaPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [mode, setMode] = useState<'technical' | 'behavioral'>('technical');
  const [track, setTrack] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    listInterviewSessions()
      .then(setSessions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, isLoading]);

  async function start() {
    setError(null);
    setCreating(true);
    try {
      const session = await createInterviewSession(mode, track.trim() || undefined);
      router.push(`/entrevista/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar a sessão.');
      setCreating(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-dark-surface text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-surface text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto">
          <h1 className="text-2xl font-black text-white">Simulador de entrevista</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Faça login para treinar. O simulador faz parte dos planos pagos.
          </p>
        </div>
      </div>
    );
  }

  const active = sessions.find((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-dark-surface text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-black text-white">Simulador de entrevista</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Treino com a tutora: perguntas, avaliação por rubrica explícita e relatório final
          com pontos fortes, fracos e o que estudar em seguida. Treino — não substitui
          entrevista humana real.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-400 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {active ? (
          <div className="mt-6 border border-border-subtle rounded-xl p-4">
            <p className="text-sm">Você tem uma sessão ativa — finalize-a antes de começar outra.</p>
            <Link
              href={`/entrevista/${active.id}`}
              className="inline-block mt-3 text-sm font-bold text-[#996DFF] underline"
            >
              Continuar sessão ({active.mode === 'technical' ? 'técnica' : 'comportamental'})
            </Link>
          </div>
        ) : (
          <div className="mt-6 border border-border-subtle rounded-xl p-4 space-y-3">
            <label className="block text-sm">
              Modalidade
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'technical' | 'behavioral')}
                className="mt-1 w-full bg-dark-surface-container-low border border-border-subtle rounded-lg px-3 py-2 text-sm"
              >
                <option value="technical">Técnica</option>
                <option value="behavioral">Comportamental</option>
              </select>
            </label>
            <label className="block text-sm">
              Trilha-alvo (opcional)
              <input
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="ex.: java, frontend"
                maxLength={64}
                className="mt-1 w-full bg-dark-surface-container-low border border-border-subtle rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-zinc-500">
              Limite de 20 turnos por sessão. Cada resposta consome 1 chamada da cota diária
              de IA do seu plano.
            </p>
            <button
              onClick={start}
              disabled={creating}
              className="bg-[#8257E5] hover:bg-[#6F46D6] disabled:opacity-50 text-white text-sm font-bold rounded-lg px-4 py-2"
            >
              {creating ? 'Iniciando…' : 'Começar entrevista'}
            </button>
          </div>
        )}

        <h2 className="text-lg font-bold text-white mt-10 mb-3">Sessões anteriores</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhuma sessão ainda.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="border border-border-subtle rounded-xl px-4 py-3">
                <Link href={`/entrevista/${s.id}`} className="text-sm font-bold text-[#996DFF] underline">
                  {s.mode === 'technical' ? 'Técnica' : 'Comportamental'}
                  {s.track ? ` · ${s.track}` : ''}
                </Link>
                <p className="text-xs text-zinc-500 mt-1">
                  {s.status === 'active' ? 'ativa' : 'finalizada'} ·{' '}
                  {s.turns.filter((t) => t.role === 'candidate').length} respostas
                  {s.report ? ' · relatório disponível' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
