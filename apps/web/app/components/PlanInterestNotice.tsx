'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { clearPlanIntent, readPlanIntent } from '../lib/attribution';
import {
  fetchMyPlanInterest,
  intentToRegistration,
  planInterestConfirmation,
  registerPlanInterest,
  type PlanInterestView,
} from '../lib/planInterest';

/**
 * Sprint 17 (Ciclo 10/10 · Volta 2/B54) — consumo da intenção de plano.
 *
 * Montado no layout raiz (dentro do AuthProvider): assim que existe
 * sessão — cadastro concluído ou login — a intenção salva no clique
 * de preço é consumida UMA vez e vira registro no servidor
 * (POST /plan-interest); sem intenção pendente, consulta o registro
 * existente (GET /plan-interest/me). O aviso confirma plano, preço
 * exibido e estado real (cobrança inativa, conta gratuita). O registro
 * permanente fica visível na aba Assinatura das Configurações —
 * este aviso é só a confirmação do momento, exibida uma vez por
 * registro (chave plano+data no localStorage).
 *
 * Nas rotas públicas o AuthContext adia a sonda de sessão, então
 * `user` segue null na landing e NENHUMA chamada é feita lá.
 */
const SEEN_KEY = 'nexus_plan_interest_notice_seen';

export const PlanInterestNotice: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<PlanInterestView | null>(null);
  const actedRef = useRef(false);

  useEffect(() => {
    if (!user || actedRef.current) return;
    actedRef.current = true;
    let cancelled = false;

    (async () => {
      let result: PlanInterestView | null = null;
      const registration = intentToRegistration(readPlanIntent());
      if (registration) {
        result = await registerPlanInterest(registration);
        // Só consome a intenção local com o registro confirmado no
        // servidor; se a API falhar, ela fica para a próxima sessão.
        if (result) clearPlanIntent();
      }
      if (!result) {
        result = await fetchMyPlanInterest();
      }
      if (cancelled || !result) return;

      const seenValue = `${result.plan}:${result.createdAt}`;
      try {
        if (window.localStorage.getItem(SEEN_KEY) === seenValue) return;
      } catch {
        /* localStorage indisponível — exibe mesmo assim */
      }
      setView(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!view) return null;

  const { title, body } = planInterestConfirmation(view);
  const dismiss = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, `${view.plan}:${view.createdAt}`);
    } catch {
      /* sem persistência do aceite — só fecha */
    }
    setView(null);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#8257E5]/50 bg-[#121217] p-5 shadow-2xl"
    >
      <p className="text-sm font-bold text-white font-heading">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{body}</p>
      <p className="mt-2 text-xs text-zinc-500">
        Seu registro fica visível em Configurações → Assinatura &amp; Faturamento.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 rounded-xl bg-[#8257E5] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#996DFF]"
      >
        Entendi
      </button>
    </div>
  );
};
