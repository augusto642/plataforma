'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyReviews, type SavedReview } from '../../../lib/reviews';

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
    <div className="rounded-3xl bg-[#0C0F17] border border-[#1C2338] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-brand font-bold text-white text-sm">Revisões da IA Salvas</h4>
        <span className="text-[10px] font-mono text-[#00E5FF] bg-[#121624] px-2 py-0.5 rounded border border-[#00E5FF]/30 font-bold">
          Code Review
        </span>
      </div>

      <p className="text-xs text-[#94A3B8] leading-relaxed">
        Feedbacks socráticos gravados com sugestões de otimização de complexidade e Clean Code.
      </p>

      {reviews.length > 0 ? (
        <div className="space-y-2">
          {reviews.slice(0, 2).map((rev) => (
            <div
              key={rev.id}
              className="p-3 rounded-xl bg-[#121624] border border-[#1C2338] text-xs font-mono text-[#94A3B8] space-y-1"
            >
              <div className="text-white font-medium flex items-center justify-between">
                <span className="truncate max-w-[160px]">
                  {rev.activityTitle || 'Atividade de Código'}
                </span>
                <span className="text-[#04D361]">{rev.kind === 'ai' ? 'IA' : 'Revisão'}</span>
              </div>
              <p className="text-[11px] text-[#64748B] line-clamp-1">{rev.summary}</p>
            </div>
          ))}
          <Link
            href="/revisao"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#00E5FF] hover:underline pt-1"
          >
            <span>Ver todas as análises salvas</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-[#121624] border border-[#1C2338] text-xs font-mono text-[#64748B]">
          Nenhuma revisão salva ainda. Ao enviar seu código no sandbox, peça feedback à Tutora de IA.
        </div>
      )}
    </div>
  );
}
