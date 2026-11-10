'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../../../components/MaterialIcon';
import { listMyReviews, type SavedReview } from '../../../lib/reviews';

// Central 219 (D2) — "Revisões da IA Salvas": módulo de apoio do
// protótipo Stitch v2 (dashboard-aluno.html), ao lado do Simulador
// de Entrevista. Dados reais de GET /reviews/me (só as revisões das
// próprias submissões; free recebe 403 pelo gate 'code-review').
// Fail-closed: sem acesso, com a API fora ou ainda carregando, o
// card some inteiro — nunca uma lista inventada. Com acesso e zero
// revisões, estado vazio honesto (não some: o módulo existe no
// protótipo e o usuário precisa saber onde as revisões vão aparecer).
const KIND_LABEL: Record<string, string> = { ai: 'IA', peer: 'Pares' };
const STATUS_LABEL: Record<string, string> = {
  completed: 'Concluída',
  pending: 'Pendente',
  failed: 'Falhou',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

export function AiReviewsCard() {
  const [reviews, setReviews] = useState<SavedReview[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyReviews();
        if (!cancelled && Array.isArray(list)) setReviews(list);
      } catch {
        // Sem acesso (403), sem revisões ou API fora: omitir o card.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!reviews) return null;

  return (
    <section
      aria-label="Revisões da IA salvas"
      className="rounded-xl bg-dark-surface-container-low border border-border-subtle p-5 flex items-start gap-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
        <MaterialIcon name="code_blocks" className="text-[22px]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-headline text-sm font-bold text-white">
          Revisões da IA Salvas
        </h2>
        <p className="text-xs text-dark-on-surface-variant mt-0.5 mb-3">
          Suas soluções revisadas pela IA.
        </p>
        {reviews.length === 0 ? (
          <p className="text-xs text-dark-on-surface-variant leading-relaxed">
            Nenhuma revisão salva ainda — revise uma solução no editor para
            vê-la aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-border-subtle bg-dark-surface-container px-3 py-2"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {review.activityTitle ?? 'Revisão de código'}
                  </span>
                  <span className="shrink-0 text-[11px] font-code text-dark-on-surface-variant">
                    {KIND_LABEL[review.kind] ?? review.kind} ·{' '}
                    {STATUS_LABEL[review.status] ?? review.status}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-dark-on-surface-variant">
                  {formatDate(review.createdAt)}
                  {review.summary ? ` · ${review.summary.slice(0, 120)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/ide"
          className="mt-3 inline-flex items-center gap-1 text-xs font-code font-bold text-secondary hover:underline"
        >
          Abrir o editor
          <MaterialIcon name="arrow_forward" className="text-[14px]" />
        </Link>
      </div>
    </section>
  );
}
