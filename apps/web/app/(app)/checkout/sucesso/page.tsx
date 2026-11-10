'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchMySubscription,
  simulateProviderWebhook,
  type MySubscription,
} from '../../../lib/billing';

/**
 * Fase 1 premium (desenho §2.4) — retorno do checkout em modo teste.
 * O provedor simulado não aprova sozinho: a confirmação chega pelo
 * webhook simulado (harness de teste). Esta página mostra o estado
 * real da assinatura (polling de GET /billing/subscription/me) e, em
 * ambiente de testes, oferece o botão de simulação da confirmação do
 * provedor — que só funciona enquanto o webhook não exigir assinatura
 * (sem BILLING_WEBHOOK_SECRET configurado). Sem confirmação, nada é
 * liberado: a página diz isso, em vez de fingir sucesso.
 */
/**
 * Correção Fase 2 (resíduo da Fase 1): `useSearchParams()` exige
 * Suspense boundary no build (prerender) do Next 14 — sem ele, o
 * `next build` inteiro falhava nesta página. Nenhuma mudança de
 * comportamento: só o wrapper exigido pelo framework.
 */
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16"><div className="max-w-[640px] mx-auto text-sm text-zinc-400">Carregando…</div></div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const sessionId = searchParams?.get('session') ?? null;
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const current = await fetchMySubscription();
    setSubscription(current);
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function simulateApproval() {
    if (!sessionId || !user) return;
    setSimulating(true);
    setNotice(null);
    try {
      const result = await simulateProviderWebhook({
        providerEventId: `sim-ev-${sessionId}`,
        type: 'payment_approved',
        sessionId,
        userId: user.id,
        plan: 'pro',
        billingCycle: 'monthly',
      });
      setNotice(
        result.alreadyProcessed
          ? 'Confirmação já processada antes — sem duplicar a liberação.'
          : 'Confirmação simulada recebida. Aguardando a liberação do plano…',
      );
      setTimeout(refresh, 1500);
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : 'A confirmação simulada falhou.',
      );
    } finally {
      setSimulating(false);
    }
  }

  const hasAccess = subscription?.hasAccess ?? false;

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[640px] mx-auto space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-300">
            Ambiente de testes — nenhuma cobrança real foi feita
          </p>
        </div>

        <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
          <h1 className="text-2xl font-black font-heading text-white">
            {hasAccess ? 'Plano Pro liberado (modo de testes)' : 'Checkout em modo de testes'}
          </h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            {hasAccess
              ? 'Sua assinatura Pro foi confirmada pelo provedor simulado e o plano está ativo na sua conta.'
              : 'Você voltou do checkout simulado. O plano só é liberado quando o provedor confirma o pagamento via webhook — enquanto isso não acontece, nada muda na sua conta.'}
          </p>
          {sessionId && (
            <p className="text-xs font-mono text-zinc-500 mt-3 break-all">
              Sessão: {sessionId}
            </p>
          )}
          {subscription?.subscription && (
            <p className="text-xs text-zinc-300 mt-3">
              Assinatura: {subscription.subscription.plan} ·{' '}
              {subscription.subscription.status} ·{' '}
              {subscription.subscription.currentPeriodEnd
                ? `até ${new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}`
                : 'sem período definido'}
            </p>
          )}
          {notice && (
            <p className="text-xs text-zinc-300 mt-3" role="status">{notice}</p>
          )}
        </div>

        {!hasAccess && sessionId && user && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
            <p className="text-sm text-zinc-300">
              Simular a confirmação do provedor (somente em ambiente de testes):
            </p>
            <button
              type="button"
              onClick={simulateApproval}
              disabled={simulating}
              className="mt-4 px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] disabled:opacity-50 text-white font-bold text-xs"
            >
              {simulating ? 'Simulando…' : 'Simular pagamento aprovado'}
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs"
          >
            Ver minha assinatura
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-[#181820] border border-[#27272A] text-zinc-200 font-bold text-xs"
          >
            Ir para o dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
