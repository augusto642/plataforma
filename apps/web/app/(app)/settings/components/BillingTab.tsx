'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchMyPlanInterest,
  planDisplayName,
  planPriceLabel,
  type PlanInterestView,
} from '../../../lib/planInterest';
import {
  cancelMySubscription,
  fetchMySubscription,
  type MySubscription,
} from '../../../lib/billing';

// B37 (Sprint 11) — aba de plano HONESTA.
// Antes esta tela era um stub fictício: plano "PRO ativo" com renovação
// automática, cartão inventado, faturas inventadas e medidores de uso sem
// nenhuma fonte de dados. Não existe gateway de pagamento nem assinatura
// integrada à plataforma, então agora a aba mostra apenas o que é verdade:
//  - o plano real da conta (GET /users/me → `plan`, camada B32 da Sprint 10);
//  - a diferença de entitlement que a matriz de planos da API realmente
//    implementa hoje (tutora de IA: free = nível Iniciante; pro = todos);
//  - o estado real de cobranças: nenhuma fatura, nenhum cartão, nenhuma
//    renovação — pagamento online ainda não disponível.
// Os medidores (CPU sandbox, tokens do tutor, storage Git) foram removidos:
// nenhum endpoint expõe essas quotas para a conta.

const EXPLORER_INCLUDES = [
  'Desafios fundamentais do nível Iniciante',
  'Sandbox Linux Piston',
  'Ranking por curso entre alunos matriculados',
  'Tutora de IA socrática no nível Iniciante',
  'Portfólio público com seus projetos',
];

const PRO_INCLUDES = [
  'Tutora de IA socrática em todas as trilhas e níveis',
  'Tudo do plano Explorer',
];

export const BillingTab: React.FC = () => {
  const { user, isLoading } = useAuth();

  // B54 (Sprint 17) — registro da lista de interessados (GET
  // /plan-interest/me): existe quando o usuário clicou num plano pago
  // na landing e concluiu o cadastro/entrou logado. É um registro de
  // interesse, não uma assinatura: nenhum valor é cobrado.
  const [interest, setInterest] = useState<PlanInterestView | null>(null);

  // Fase 1 premium — assinatura real (GET /billing/subscription/me).
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyPlanInterest().then((view) => {
      if (active) setInterest(view);
    });
    fetchMySubscription().then((view) => {
      if (active) setSubscription(view);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleCancel() {
    setCanceling(true);
    setCancelMessage(null);
    try {
      const result = await cancelMySubscription();
      setCancelMessage(result.message ?? 'Assinatura cancelada.');
      setSubscription(await fetchMySubscription());
    } catch (err) {
      setCancelMessage(err instanceof Error ? err.message : 'Não foi possível cancelar.');
    } finally {
      setCanceling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Seu plano</h3>
        <p className="text-xs text-zinc-400">Consultando o plano associado à sua conta…</p>
      </div>
    );
  }

  if (!user || !user.plan) {
    return (
      <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Seu plano</h3>
        <p className="text-xs text-zinc-400 max-w-md">
          Não foi possível identificar o plano da sua conta nesta sessão. Entre na sua conta para
          consultar o plano associado a ela.
        </p>
      </div>
    );
  }

  const isPro = user.plan === 'pro';
  const isCareer = user.plan === 'career';
  const includes = isPro || isCareer ? PRO_INCLUDES : EXPLORER_INCLUDES;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CURRENT PLAN (REAL — GET /users/me)                                    */}
      {/* ========================================================================= */}
      <div className="bg-[#0C0F17] border border-[#8257E5]/50 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#8257E5] text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Plano atual da conta
              </span>
            </div>
            <h3 className="text-2xl font-black text-white font-heading">
              {isPro ? 'Nexus Pro' : isCareer ? 'Nexus Carreira' : 'Explorer — Grátis'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              {isPro || isCareer
                ? 'Plano pago registrado na sua conta. A tutora de IA responde em todas as trilhas e níveis de carreira.'
                : 'Plano gratuito da sua conta. O nível Iniciante é grátis — a tutora de IA acompanha você nesse nível.'}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {!isPro && !isCareer && (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono">R$ 0</span>
                <span className="text-xs text-zinc-400 font-mono">/ para sempre</span>
              </div>
            )}
            {!isPro && !isCareer && (
              <Link
                href="/checkout/pro"
                className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all shadow-md shadow-[#8257E5]/25"
              >
                Assinar o Pro (modo de testes)
              </Link>
            )}
            <Link
              href="/#precos"
              className="px-4 py-2 rounded-xl bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] text-zinc-200 font-bold text-xs transition-all"
            >
              Ver planos e preços
            </Link>
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-xs font-mono text-zinc-300">
          {includes.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="text-[#04D361] font-bold">✔</span> {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ========================================================================= */}
      {/* 2. ENTITLEMENTS — A DIFERENÇA QUE A MATRIZ DA API IMPLEMENTA HOJE         */}
      {/* ========================================================================= */}
      <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white font-heading mb-1">
          O que muda entre os planos
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Diferença de entitlement implementada na plataforma:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1C2338] text-zinc-400 font-mono uppercase tracking-wider">
                <th className="py-2 pr-4">Recurso</th>
                <th className="py-2 pr-4">Explorer (grátis)</th>
                <th className="py-2">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#1C2338]/50">
                <td className="py-2.5 pr-4 font-bold text-zinc-200">Tutora de IA socrática</td>
                <td className="py-2.5 pr-4 text-zinc-400">Somente no nível Iniciante</td>
                <td className="py-2.5 text-zinc-200">Em todas as trilhas e níveis de carreira</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BILLING STATE — FASE 1: ASSINATURA REAL, EM MODO DE TESTES            */}
      {/* ========================================================================= */}
      <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white font-heading mb-1">
          Assinatura e cobranças
        </h3>
        <p className="text-xs text-amber-300 mb-4">
          Ambiente de testes — nenhuma cobrança real é feita. Nenhum dado de
          cartão é exibido ou armazenado.
        </p>
        {subscription?.subscription ? (
          <div className="text-xs text-zinc-300 space-y-2">
            <p>
              <span className="font-bold text-white">Plano:</span>{' '}
              {subscription.subscription.plan === 'pro' ? 'Nexus Pro' : subscription.subscription.plan}
            </p>
            <p>
              <span className="font-bold text-white">Status:</span>{' '}
              {subscription.subscription.status}
              {subscription.hasAccess ? ' (acesso vigente)' : ' (sem acesso vigente)'}
            </p>
            <p>
              <span className="font-bold text-white">Ciclo:</span>{' '}
              {subscription.subscription.billingCycle === 'annual' ? 'anual' : 'mensal'}
            </p>
            {subscription.subscription.currentPeriodEnd && (
              <p>
                <span className="font-bold text-white">Período vigente até:</span>{' '}
                {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </p>
            )}
            {subscription.subscription.status !== 'canceled' && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={canceling}
                className="mt-2 px-4 py-2 rounded-xl bg-[#121624] border border-[#1C2338] hover:border-rose-500/50 text-zinc-200 disabled:opacity-50 font-bold text-xs cursor-pointer"
              >
                {canceling ? 'Cancelando…' : 'Cancelar assinatura'}
              </button>
            )}
            {subscription.subscription.status === 'canceled' && (
              <p className="text-zinc-400">
                Assinatura cancelada: o acesso continua até o fim do período vigente acima.
              </p>
            )}
            {cancelMessage && (
              <p role="status" className="text-zinc-300">{cancelMessage}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 max-w-2xl">
            Nenhuma assinatura vinculada à sua conta. Contas no plano gratuito
            não geram cobranças.
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. LISTA DE INTERESSADOS (B54 — SPRINT 17): REGISTRO REAL, SEM COBRANÇA   */}
      {/* ========================================================================= */}
      {interest && (
        <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-white font-heading mb-1">
            Lista de interessados — plano {planDisplayName(interest.plan)}
          </h3>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Você entrou na lista de interessados do plano {planDisplayName(interest.plan)} (
            {interest.billingCycle === 'annual' ? 'ciclo anual' : 'ciclo mensal'},{' '}
            {planPriceLabel(interest)}) em{' '}
            {new Date(interest.createdAt).toLocaleDateString('pt-BR')}. A cobrança dos planos
            pagos ainda não está ativa: este registro não é uma assinatura e nenhum valor é
            cobrado. Quando a cobrança abrir, avisamos você.
          </p>
        </div>
      )}
    </div>
  );
};
