'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

// Sprint 21 (adaptação v1) — "Conceitos para reforçar": lista DERIVADA
// das submissões reais do aluno (GET /adaptation/remediation): conceito
// da espinha com >= 3 falhas em atividades ainda não concluídas.
// Sem conceito frágil, o bloco NÃO renderiza — nenhum score inventado,
// nenhum placeholder.

interface FragileConceptView {
  conceptTag: string;
  moduleTitle: string;
  failedAttempts: number;
  reinforcement: {
    id: string;
    title: string;
    courseId: string;
    source: 'library' | 'track';
  } | null;
}

export function ConceptsToReinforce() {
  const [concepts, setConcepts] = useState<FragileConceptView[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/adaptation/remediation`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.fragileConcepts)) return;
        setConcepts(
          data.fragileConcepts
            .filter(
              (f: FragileConceptView) =>
                typeof f?.conceptTag === 'string' &&
                typeof f?.failedAttempts === 'number',
            )
            .slice(0, 4),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (concepts.length === 0) return null;

  return (
    <section
      aria-label="Conceitos para reforçar"
      className="rounded-3xl border border-[#8b5cf6]/30 bg-[#12101d] p-6"
    >
      <h2 className="font-heading text-lg font-bold text-white">
        🎯 Conceitos para reforçar
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Derivado das suas tentativas reais: conceitos em que você já falhou 3
        vezes ou mais em atividades ainda não concluídas.
      </p>
      <ul className="mt-4 space-y-3">
        {concepts.map((concept) => (
          <li
            key={concept.conceptTag}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#27272A] bg-[#181820] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                {concept.moduleTitle}
              </p>
              <p className="text-[11px] text-zinc-400">
                {concept.failedAttempts} tentativas sem concluir neste conceito
              </p>
            </div>
            {concept.reinforcement ? (
              <Link
                href={`/ide?course=${concept.reinforcement.courseId}&activity=${concept.reinforcement.id}`}
                className="ml-auto shrink-0 rounded-lg border border-[#8b5cf6]/50 bg-[#8b5cf6]/15 px-3 py-1.5 text-[11px] font-bold text-[#c4b5fd] transition-colors hover:bg-[#8b5cf6]/25"
              >
                Reforçar com “{concept.reinforcement.title}”
                {concept.reinforcement.source === 'library' ? ' (Biblioteca)' : ''}
              </Link>
            ) : (
              <span className="ml-auto shrink-0 text-[11px] text-zinc-500">
                Sem reforço disponível agora — peça a dica da tutora na atividade
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
