'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
  answerInterview,
  finishInterview,
  getInterviewSession,
  type InterviewReport,
  type InterviewSession,
} from '../../../lib/interview';

/**
 * Fase 2 premium (desenho §3.1) — sessão de entrevista por turnos +
 * relatório final. A avaliação de cada turno (rubrica + evidência)
 * aparece abaixo da resposta do aluno; o relatório final lista pontos
 * fortes, fracos e próximos passos de estudo. Treino — não substitui
 * entrevista humana real.
 */
export default function EntrevistaSessaoPage() {
  const params = useParams();
  const id = (params?.id as string | undefined) ?? '';
  const { user, isLoading } = useAuth();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !user || !id) return;
    getInterviewSession(id)
      .then((s) => {
        setSession(s);
        if (s.report) setReport(s.report);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, isLoading, id]);

  async function send() {
    if (!answer.trim()) return;
    setError(null);
    setSending(true);
    try {
      const updated = await answerInterview(id, answer.trim());
      setSession(updated);
      setAnswer('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a resposta.');
    } finally {
      setSending(false);
    }
  }

  async function finish() {
    setError(null);
    setFinishing(true);
    try {
      const rep = await finishInterview(id);
      setReport(rep);
      setSession((s) => (s ? { ...s, status: 'completed', report: rep } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o relatório.');
    } finally {
      setFinishing(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!session) return null;
  const candidateCount = session.turns.filter((t) => t.role === 'candidate').length;
  const isActive = session.status === 'active';

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-black text-white">
          Entrevista {session.mode === 'technical' ? 'técnica' : 'comportamental'}
          {session.track ? ` · ${session.track}` : ''}
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          {candidateCount}/20 turnos · Treino — não substitui entrevista humana real.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-400 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {session.turns.map((turn) => (
            <div
              key={turn.id}
              className={`rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                turn.role === 'interviewer'
                  ? 'bg-[#121218] border border-[#2A2A33]'
                  : 'bg-[#1B1430] border border-[#3B2A6B]'
              }`}
            >
              <p className="text-xs font-bold text-zinc-400 mb-1">
                {turn.role === 'interviewer' ? 'Entrevistador' : 'Você'}
              </p>
              <p>{turn.content}</p>
              {turn.role === 'candidate' && turn.evaluation && (
                <div className="mt-2 text-xs text-zinc-400 space-y-1">
                  {Object.entries(turn.evaluation).map(([key, v]) => (
                    <p key={key}>
                      <span className="font-bold text-zinc-300">{key}: {v.score}/5</span>
                      {' — '}
                      {v.evidence}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {isActive && (
          <div className="mt-6 space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="Sua resposta…"
              className="w-full bg-[#121218] border border-[#2A2A33] rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={sending || !answer.trim() || candidateCount >= 20}
                className="bg-[#8257E5] hover:bg-[#6F46D6] disabled:opacity-50 text-white text-sm font-bold rounded-lg px-4 py-2"
              >
                {sending ? 'Avaliando…' : 'Responder'}
              </button>
              <button
                onClick={finish}
                disabled={finishing || candidateCount === 0}
                className="border border-[#2A2A33] hover:border-[#8257E5] disabled:opacity-50 text-sm font-bold rounded-lg px-4 py-2"
              >
                {finishing ? 'Gerando relatório…' : 'Finalizar e ver relatório'}
              </button>
            </div>
          </div>
        )}

        {report && (
          <div className="mt-8 border border-[#2A2A33] rounded-xl p-4 space-y-4">
            <h2 className="text-lg font-bold text-white">Relatório</h2>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Notas por critério</h3>
              <ul className="text-sm text-zinc-400 mt-1 space-y-1">
                {Object.entries(report.scores).map(([key, v]) => (
                  <li key={key}>
                    <span className="font-bold text-zinc-200">{key}: {v.score}/5</span>
                    {' — '}
                    {v.evidence}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Pontos fortes</h3>
              <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                {report.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">Pontos fracos</h3>
              <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                {report.gaps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">O que estudar em seguida</h3>
              <ul className="text-sm text-zinc-400 mt-1 list-disc list-inside">
                {report.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
