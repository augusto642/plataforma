'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/apiClient';

/**
 * Fase 5 premium (desenho §6.1) — mapa visual de gaps por skill.
 * Evolução do quiz B09 (que segue intacto em /diagnostico): aqui o
 * aluno vê o que domina, o que está em desenvolvimento e o que falta —
 * não só uma nota. O mapa é uma ESTIMATIVA até haver volume de dados
 * (a API sinaliza isso); o próximo passo de cada skill aponta para a
 * primeira atividade pendente da tag (o diagnóstico alimenta a trilha,
 * não a substitui). Mapa completo é Pro/Carreira; o grátis vê o B09.
 */
type SkillEntry = {
  skillTag: string;
  title: string;
  order: number;
  score: number | null;
  level: string;
  weakSpot: boolean;
  evidenceCount: number;
  nextSteps: { activityId: string; slug: string; title: string } | null;
};

type SkillMap = {
  estimate: boolean;
  evidenceTotal: number;
  b09: { archetype: string | null; scores: unknown } | null;
  skills: SkillEntry[];
  targetGaps: string[];
};

export default function MapaDiagnosticoPage() {
  const [map, setMap] = useState<SkillMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetJobId, setTargetJobId] = useState('');

  async function load(jobId?: string) {
    setLoading(true);
    setError(null);
    try {
      const qs = jobId ? `?targetJobId=${encodeURIComponent(jobId)}` : '';
      const res = await apiFetch(`/diagnostic/skills/me${qs}`);
      if (res.status === 403) {
        setError('O mapa completo de gaps é Pro/Carreira. O diagnóstico básico (B09) continua gratuito em /diagnostico.');
        return;
      }
      if (!res.ok) throw new Error(`Falha ao carregar o mapa (${res.status}).`);
      setMap(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o mapa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const group = (level: string) => (map?.skills ?? []).filter((s) => s.level === level);
  const mastered = group('proficient');
  const developing = group('developing');
  const missing = (map?.skills ?? []).filter((s) => s.level === 'missing' || s.level === 'unknown');

  function Section({ title, items, empty }: { title: string; items: SkillEntry[]; empty: string }) {
    return (
      <section>
        <h2 className="text-lg font-semibold mb-2">{title} ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.skillTag} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-sm text-zinc-400">
                    {s.score === null ? 'sem evidência' : `${Math.round(s.score * 100)}%`}
                    {s.weakSpot ? ' · erra com frequência' : ''}
                    {` · ${s.evidenceCount} tentativas`}
                  </span>
                </div>
                {s.nextSteps && (
                  <p className="text-sm text-zinc-400 mt-1">
                    Próximo passo: {s.nextSteps.title}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Mapa de gaps</h1>
      <p className="text-sm text-zinc-400">
        Do diagnóstico B09 (<Link href="/diagnostico" className="underline">refazer o quiz</Link>) para
        o mapa por skill: o que você domina, o que falta para a vaga-alvo e o próximo passo de cada tema.
      </p>
      {loading && <p>Carregando mapa…</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {map && (
        <>
          {map.estimate && (
            <p role="status" className="rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm">
              Mapa estimado: ainda há pouca evidência ({map.evidenceTotal} submissões). Continue
              resolvendo atividades para calibrar o mapa.
            </p>
          )}
          {map.b09 && (
            <p className="text-sm text-zinc-400">
              Arquétipo do B09: <strong className="text-zinc-200">{map.b09.archetype ?? '—'}</strong>
            </p>
          )}
          <label className="block text-sm">
            Vaga-alvo (id da vaga, da página de vagas) — opcional
            <span className="flex gap-2 mt-1">
              <input
                value={targetJobId}
                onChange={(e) => setTargetJobId(e.target.value)}
                placeholder="ex.: uuid da vaga"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-[#8257E5] text-white text-sm font-medium"
                onClick={() => load(targetJobId || undefined)}
              >
                Comparar
              </button>
            </span>
          </label>
          {map.targetGaps.length > 0 && (
            <section className="rounded-xl border border-[#8257E5]/40 bg-[#8257E5]/10 px-4 py-3">
              <h2 className="font-semibold mb-1">O que falta para a vaga-alvo</h2>
              <p className="text-sm text-zinc-300">{map.targetGaps.join(', ')}</p>
            </section>
          )}
          <Section title="Você domina" items={mastered} empty="Nenhuma skill proficiente ainda." />
          <Section title="Em desenvolvimento" items={developing} empty="Nenhuma skill em desenvolvimento." />
          <Section title="Falta desenvolver" items={missing} empty="Nada faltando — todas as skills têm evidência proficiente." />
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-zinc-700 text-sm"
            onClick={async () => {
              await apiFetch('/diagnostic/skills/refresh', { method: 'POST' });
              load(targetJobId || undefined);
            }}
          >
            Recalcular mapa
          </button>
        </>
      )}
    </main>
  );
}
