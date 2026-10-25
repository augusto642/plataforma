'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  getJobs,
  getMyMatches,
  type JobPosting,
  type TalentMatch,
} from '../../lib/talent';

/**
 * Fase 4 premium (desenho §5.1) — radar de vagas do aluno: vagas
 * compatíveis (com score explicado) + todas as vagas não expiradas.
 * Posicionamento obrigatório: visibilidade, não garantia — o Talent Match
 * não promete emprego ou contratação.
 */
export default function VagasPage() {
  const { user, isLoading } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [matches, setMatches] = useState<TalentMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setJobs(await getJobs());
        try {
          setMatches(await getMyMatches());
        } catch {
          setMatches([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar as vagas.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isLoading]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">
          Entre na sua conta para ver o radar de vagas.
        </div>
      </div>
    );
  }

  const matchedIds = new Set(matches.map((m) => m.job.id));

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-bold">Radar de vagas</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Vagas agregadas e de empresas parceiras, compatíveis com as suas
          skills comprovadas. O Talent Match amplia a sua visibilidade — não
          garante emprego ou contratação.
        </p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <h2 className="mt-8 text-lg font-semibold">Compatíveis com você</h2>
        {matches.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">
            Nenhuma vaga compatível por enquanto. Conclua atividades e projetos
            para comprovar mais skills — o match usa só o que você já provou,
            nunca o que você declarou.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {matches.map(({ job, match }) => (
              <li key={job.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <strong>{job.title}</strong>
                  <span className="text-sm text-[#04D361]">{Math.round(match.score * 100)}% compatível</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Nível: {job.level} · {job.company?.name ?? 'Vaga agregada'}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-zinc-400">Em comum: </span>
                  {match.matchedSkills.join(', ') || '—'}
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-zinc-400">Falta comprovar: </span>
                  {match.missingSkills.join(', ') || 'nenhuma'}
                </p>
                {job.externalUrl && (
                  <a href={job.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#8257E5] underline">
                    Ver vaga original
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        <h2 className="mt-10 text-lg font-semibold">Todas as vagas abertas</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nenhuma vaga aberta no momento.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-lg border border-zinc-800 p-4">
                <strong>{job.title}</strong>
                <p className="mt-1 text-sm text-zinc-400">
                  Nível: {job.level} · {job.company?.name ?? 'Vaga agregada'}
                  {matchedIds.has(job.id) ? ' · compatível com você' : ''}
                </p>
                <p className="mt-1 text-sm text-zinc-400">Skills: {job.skills.join(', ')}</p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-sm">
          <Link href="/talent" className="text-[#8257E5] underline">
            Gerenciar meu perfil no Talent Match
          </Link>
        </p>
      </div>
    </div>
  );
}
