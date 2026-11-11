'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

/**
 * Fase 5 premium (desenho §6.3) — preparação para certificações.
 * Simulados no FORMATO das provas, com questões PRÓPRIAS — nunca
 * reprodução de provas reais (direito autoral das certificadoras).
 * O relatório de prontidão segue o formato do relatório de entrevista:
 * score por domínio, domínio mais fraco e faixa (não pronto / quase lá
 * / pronto). Não promete aprovação nem reconhecimento oficial.
 * Listar exames é catálogo; registrar tentativa e ver prontidão é
 * Pro/Carreira (a API devolve 403 para o grátis).
 */
type CertExam = { id: string; provider: string; name: string; domains: string[] };
type Attempt = {
  id: string;
  exam?: { provider: string; name: string };
  readiness: number;
  createdAt: string;
};

export default function CertificacoesPage() {
  const [exams, setExams] = useState<CertExam[]>([]);
  const [selected, setSelected] = useState<CertExam | null>(null);
  const [tallies, setTallies] = useState<Record<string, { correct: string; total: string }>>({});
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/certprep/exams');
        if (!res.ok) throw new Error(`Falha ao listar exames (${res.status}).`);
        const data = await res.json();
        setExams(data);
        if (data.length) {
          setSelected(data[0]);
          setTallies(
            Object.fromEntries(data[0].domains.map((d: string) => [d, { correct: '', total: '' }])),
          );
        }
        const mine = await apiFetch('/certprep/attempts/me');
        if (mine.ok) setAttempts(await mine.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os exames.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function select(exam: CertExam) {
    setSelected(exam);
    setTallies(
      Object.fromEntries(exam.domains.map((d) => [d, { correct: '', total: '' }])),
    );
    setResult(null);
  }

  async function submit() {
    if (!selected) return;
    setError(null);
    const domainScores: Record<string, { correct: number; total: number }> = {};
    for (const [domain, tally] of Object.entries(tallies)) {
      const correct = Number(tally.correct);
      const total = Number(tally.total);
      if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0) {
        setError(`Domínio "${domain}": informe acertos e total (total > 0).`);
        return;
      }
      domainScores[domain] = { correct, total };
    }
    const res = await apiFetch(`/certprep/exams/${selected.id}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainScores }),
    });
    if (res.status === 403) {
      setError('Simulados e relatório de prontidão são Pro/Carreira.');
      return;
    }
    if (!res.ok) {
      setError(`Falha ao registrar a tentativa (${res.status}).`);
      return;
    }
    const attempt = await res.json();
    const readiness = await apiFetch(`/certprep/attempts/${attempt.id}/readiness`);
    if (readiness.ok) setResult(await readiness.json());
    const mine = await apiFetch('/certprep/attempts/me');
    if (mine.ok) setAttempts(await mine.json());
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Preparação para certificações</h1>
      <p className="text-sm text-zinc-400">
        Simulados no formato das provas (AWS, Azure, Google Cloud), com questões próprias.
        Trilhas de IA aplicada e de inglês técnico vivem no catálogo de cursos, sobre os
        mesmos motores (KMS, tutora e Piston) — sem prometer fluência nem emprego.
      </p>
      {loading && <p>Carregando exames…</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {exams.length > 0 && (
        <>
          <label className="block text-sm">
            Exame (formato)
            <select
              value={selected?.id ?? ''}
              onChange={(e) => {
                const exam = exams.find((x) => x.id === e.target.value);
                if (exam) select(exam);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <section className="space-y-3">
              <h2 className="font-semibold">Registre o resultado do simulado, por domínio</h2>
              {selected.domains.map((domain) => (
                <div key={domain} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex-1 min-w-40">{domain}</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="acertos"
                    value={tallies[domain]?.correct ?? ''}
                    onChange={(e) =>
                      setTallies((t) => ({ ...t, [domain]: { ...t[domain], correct: e.target.value } }))
                    }
                    className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                  />
                  <span className="text-zinc-500">de</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="total"
                    value={tallies[domain]?.total ?? ''}
                    onChange={(e) =>
                      setTallies((t) => ({ ...t, [domain]: { ...t[domain], total: e.target.value } }))
                    }
                    className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                  />
                </div>
              ))}
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-[#8257E5] text-white text-sm font-medium"
                onClick={submit}
              >
                Ver prontidão
              </button>
            </section>
          )}
          {result && (
            <section role="status" className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-1">
              <p className="font-semibold">
                Prontidão: {Math.round(result.readiness * 100)}% —{' '}
                {result.readinessBand === 'ready'
                  ? 'pronto'
                  : result.readinessBand === 'almost-ready'
                    ? 'quase lá'
                    : 'não pronto'}
              </p>
              {result.weakestDomain && (
                <p className="text-sm text-zinc-400">Domínio mais fraco: {result.weakestDomain}</p>
              )}
              <ul className="text-sm text-zinc-400">
                {Object.entries(result.scores).map(([domain, score]: [string, any]) => (
                  <li key={domain}>
                    {domain}: {score.correct}/{score.total} ({Math.round(score.score * 100)}%)
                  </li>
                ))}
              </ul>
            </section>
          )}
          {attempts.length > 0 && (
            <section>
              <h2 className="font-semibold mb-2">Minhas tentativas</h2>
              <ul className="space-y-1 text-sm text-zinc-400">
                {attempts.map((a) => (
                  <li key={a.id}>
                    {a.exam?.name ?? 'Exame'} — {Math.round(a.readiness * 100)}% ·{' '}
                    {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
