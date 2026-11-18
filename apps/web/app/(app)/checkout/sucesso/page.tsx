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
 * Retorno do checkout em modo teste. A confirmação da assinatura é
 * consultada via GET /billing/subscription/me; somente o provedor
 * simulado oferece o botão de confirmação manual.
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
  const { user, isLoading: authLoading } = useAuth();
  const sessionId = searchParams?.get('session') ?? null;
  const providerName = searchParams?.get('provider') ?? 'simulated';
  const isSimulatedProvider = providerName === 'simulated';
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [pollingFinished, setPollingFinished] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const maxAttempts = 12;

    setSubscription(null);
    setLookupError(null);
    setPollingFinished(false);

    if (!user || !sessionId) {
      setIsChecking(false);
      return () => {
        active = false;
      };
    }

    const poll = async () => {
      attempts += 1;
      setIsChecking(true);
      try {
        const current = await fetchMySubscription();
        if (!active) return;
        setSubscription(current);
        setLookupError(null);
        if (current?.hasAccess) return;
      } catch (error) {
        if (!active) return;
        setLookupError(
          error instanceof Error ? error.message : 'Não foi possível consultar a assinatura.',
        );
      } finally {
        if (active) setIsChecking(false);
      }

      if (!active) return;
      if (attempts >= maxAttempts) {
        setPollingFinished(true);
        return;
      }
      timer = setTimeout(() => void poll(), 5000);
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [user, sessionId, retryToken]);

  async function simulateApproval() {
    if (!sessionId || !user) return;
    setSimulating(true);
    setNotice(null);
    try {
      const result = await simulateProviderWebhook({ sessionId });
      setNotice(
        result.alreadyProcessed
          ? 'Confirmação já processada antes — sem duplicar a liberação.'
          : 'Confirmação simulada recebida. Aguardando a liberação do plano…',
      );
      setRetryToken((current) => current + 1);
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
              ? 'Sua conta tem uma assinatura ativa e o plano está liberado.'
              : 'Você voltou do checkout. O plano só é liberado quando o provedor confirma a assinatura via webhook — enquanto isso não acontece, nada muda na sua conta.'}
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
          {lookupError && (
            <p className="text-xs text-rose-300 mt-3" role="alert">
              Não foi possível consultar a assinatura: {lookupError}
            </p>
          )}
          {authLoading && (
            <p className="text-xs text-zinc-400 mt-3">
              Validando sua sessão…
            </p>
          )}
          {!user && !authLoading && (
            <p className="text-xs text-amber-300 mt-3">
              Entre na sua conta para consultar o estado do checkout.
            </p>
          )}
          {user && !sessionId && (
            <p className="text-xs text-amber-300 mt-3">
              Este retorno não contém a sessão do checkout; consulte a assinatura nas configurações.
            </p>
          )}
          {isChecking && user && sessionId && (
            <p className="text-xs text-zinc-400 mt-3" role="status">
              Consultando a confirmação da assinatura…
            </p>
          )}
          {pollingFinished && !hasAccess && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-amber-300" role="status">
                A confirmação ainda não chegou após várias consultas. Você pode tentar novamente sem reiniciar o checkout.
              </p>
              <button
                type="button"
                onClick={() => setRetryToken((current) => current + 1)}
                className="rounded-lg border border-[#3F3F46] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Consultar novamente
              </button>
            </div>
          )}
        </div>

        {!hasAccess && sessionId && user && isSimulatedProvider && (
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
        {!hasAccess && sessionId && user && !isSimulatedProvider && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
            <p className="text-sm text-zinc-300">
              Aguardando a confirmação da assinatura pelo Mercado Pago. O plano será liberado automaticamente após o webhook validado.
            </p>
          </div>
        )}

        {user ? (
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
        ) : !authLoading ? (
          <Link
            href="/login"
            className="inline-flex px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs"
          >
            Entrar na conta
          </Link>
        ) : null}
      </div>
    </div>
  );
}
