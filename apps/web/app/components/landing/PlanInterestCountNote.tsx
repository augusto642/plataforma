'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchPlanInterestCounts,
  planInterestCountLabel,
} from '../../lib/planInterest';

/* B72 (Sprint 18 · Volta 3 · Growth B1) — a microcopy do hero exibe a
   contagem REAL de interessados do Pro (GET /plan-interest/counts:
   leads por e-mail + registros de conta). Enquanto a contagem não
   chega — ou se a API estiver fora do ar — NENHUM número é exibido
   (nada de chutar zero): a frase da lista aparece sem a contagem.
   Zero real é exibido como zero, convidando o primeiro nome (mesmo
   padrão da waitlist, B50). */

export const PlanInterestCountNote: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPlanInterestCounts().then((counts) => {
      if (!cancelled && counts) setCount(counts.pro);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;
  return <span> · {planInterestCountLabel(count)}</span>;
};
