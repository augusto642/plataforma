'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
  createCheckout,
  cancelPendingCheckout,
  planCheckoutPrice,
  type BillingCycle,
  type CheckoutPlan,
} from '../../../lib/billing';
import { PLAN_PRICES, formatBRL } from '../../../components/landing/pricing-data';
import { isFreeAlphaMode } from '../../../lib/runtime-mode';

/**
 * Fase 1 premium (desenho §2.4) — página de checkout.
 * - Pro: resumo do plano e checkout do provedor configurado em modo
 *   de testes, com selo explícito de que nenhuma cobrança real será feita.
 * - Carreira: SEM preço e SEM compra (decisão pendente do Augusto) —
 *   só a lista de espera (PlanInterest), como antes.
 * Sem sessão ativa, pede login em vez de iniciar o checkout.
 * Nenhum texto promete emprego.
 */
export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const plan = (params?.plan as string | undefined) ?? '';
  const isPro = plan === 'pro';
  const isCareer = plan === 'career';

  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (isFreeAlphaMode) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[640px] mx-auto space-y-4">
          <h1 className="text-2xl font-black font-heading text-white">Alfa gratuito</h1>
          <p className="text-sm text-zinc-300">
            Checkout e cobranças estão desativados durante o alfa aberto. Você pode criar uma conta sem custo.
          </p>
          <Link href="/register" className="text-[#996DFF] underline">Criar conta gratuita</Link>
        </div>
      </div>
    );
  }

  if (!isPro && !isCareer) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[640px] mx-auto">
          <h1 className="text-2xl font-black font-heading text-white">Plano desconhecido</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Os planos disponíveis são o Pro e o Carreira. Veja os preços na{' '}
            <Link href="/#precos" className="text-[#996DFF] underline">página de preços</Link>.
          </p>
        </div>
      </div>
    );
  }

  async function startCheckout() {
    setError(null);
    setNotice(null);
    setStarting(true);
    try {
      const session = await createCheckout('pro' as CheckoutPlan, cycle);
      router.push(session.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o checkout.');
      setStarting(false);
    }
  }

  async function cancelPending() {
    if (!window.confirm('Cancelar o checkout pendente no provedor de testes?')) return;
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      await cancelPendingCheckout();
      setNotice('Checkout pendente cancelado. Você pode escolher outro ciclo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cancelar o checkout.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[640px] mx-auto space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-300">
            Ambiente de testes — nenhuma cobrança real será feita
          </p>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Nenhuma cobrança real será feita. Se o Mercado Pago estiver
            selecionado, o checkout e os meios de pagamento serão os do
            ambiente de testes do provedor.
          </p>
        </div>

        <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
          <h1 className="text-2xl font-black font-heading text-white">
            {isPro ? 'Nexus Pro' : 'Nexus Carreira'}
          </h1>
          {isPro ? (
            <>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Tutora de IA socrática em todas as trilhas e níveis, certificado
                verificável com LinkedIn e todas as funcionalidades pagas da
                plataforma.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setCycle('monthly')}
                  aria-pressed={cycle === 'monthly'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${cycle === 'monthly' ? 'bg-[#8257E5] text-white' : 'bg-[#181820] text-zinc-300 border border-[#27272A]'}`}
                >
                  Mensal — {formatBRL(PLAN_PRICES.pro.monthly!)}/mês
                </button>
                <button
                  type="button"
                  onClick={() => setCycle('annual')}
                  aria-pressed={cycle === 'annual'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${cycle === 'annual' ? 'bg-[#8257E5] text-white' : 'bg-[#181820] text-zinc-300 border border-[#27272A]'}`}
                >
                  Anual — {formatBRL(PLAN_PRICES.pro.annualMonthly!)}/mês
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Total no ciclo: {planCheckoutPrice('pro', cycle)}. Os meios de
                pagamento disponíveis aparecem no checkout de testes do provedor.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                O plano Carreira ainda não tem preço definido. Enquanto isso,
                você pode entrar na lista de espera — sem cobrança e sem
                compromisso.
              </p>
              <Link
                href="/#precos"
                className="inline-block mt-5 px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs"
              >
                Entrar na lista de espera
              </Link>
            </>
          )}
        </div>

        {isPro && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
            {isLoading ? (
              <p className="text-xs text-zinc-400">Consultando sua sessão…</p>
            ) : !user ? (
              <div>
                <p className="text-sm text-zinc-300">
                  Entre na sua conta para concluir o checkout em modo de testes.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs"
                >
                  Entrar na conta
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-300">
                  Conta: <span className="font-bold text-white">{user.email}</span>
                </p>
                {error && (
                  <p className="text-xs text-rose-400 mt-3" role="alert">{error}</p>
                )}
                {notice && <p className="text-xs text-emerald-300 mt-3" role="status">{notice}</p>}
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={starting}
                  className="mt-4 px-5 py-3 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] disabled:opacity-50 text-white font-bold text-sm"
                >
                  {starting ? 'Iniciando…' : 'Continuar em modo de testes'}
                </button>
                <button type="button" onClick={cancelPending} disabled={starting} className="ml-3 text-xs text-zinc-300 underline disabled:opacity-50">
                  Cancelar checkout pendente
                </button>
                <p className="text-xs text-zinc-500 mt-3">
                  Ao continuar, nenhuma cobrança real será feita.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
