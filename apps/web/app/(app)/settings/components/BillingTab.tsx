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

  useEffect(() => {
    let active = true;
    fetchMyPlanInterest().then((view) => {
      if (active) setInterest(view);
    });
    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Seu plano</h3>
        <p className="text-xs text-zinc-400">Consultando o plano associado à sua conta…</p>
      </div>
    );
  }

  if (!user || !user.plan) {
    return (
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Seu plano</h3>
        <p className="text-xs text-zinc-400 max-w-md">
          Não foi possível identificar o plano da sua conta nesta sessão. Entre na sua conta para
          consultar o plano associado a ela — nenhuma cobrança é exibida sem uma fonte real.
        </p>
      </div>
    );
  }

  const isPro = user.plan === 'pro';
  const includes = isPro ? PRO_INCLUDES : EXPLORER_INCLUDES;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CURRENT PLAN (REAL — GET /users/me)                                    */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#181820] to-[#121217] border border-[#8257E5]/50 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#8257E5]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#8257E5] text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Plano atual da conta
              </span>
            </div>
            <h3 className="text-2xl font-black text-white font-heading">
              {isPro ? 'Nexus Pro' : 'Explorer — Grátis'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              {isPro
                ? 'Plano Pro registrado na sua conta. A tutora de IA responde em todas as trilhas e níveis de carreira.'
                : 'Plano gratuito da sua conta. O nível Iniciante é grátis — a tutora de IA acompanha você nesse nível.'}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {!isPro && (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white font-mono">R$ 0</span>
                <span className="text-xs text-zinc-400 font-mono">/ para sempre</span>
              </div>
            )}
            <Link
              href="/#precos"
              className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all shadow-md shadow-[#8257E5]/25"
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
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">
          O que muda entre os planos
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Diferença de entitlement implementada hoje na plataforma (matriz de planos da API):
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#27272A] text-zinc-400 font-mono uppercase tracking-wider">
                <th className="py-2 pr-4">Recurso</th>
                <th className="py-2 pr-4">Explorer (grátis)</th>
                <th className="py-2">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#27272A]/50">
                <td className="py-2.5 pr-4 font-bold text-zinc-200">Tutora de IA socrática</td>
                <td className="py-2.5 pr-4 text-zinc-400">Somente no nível Iniciante</td>
                <td className="py-2.5 text-zinc-200">Em todas as trilhas e níveis de carreira</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BILLING STATE — SEM GATEWAY, SEM FATURAS, SEM CARTÃO                   */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">
          Cobranças e faturas
        </h3>
        <p className="text-xs text-zinc-400 mb-4 max-w-2xl">
          {isPro
            ? 'Nenhuma fatura disponível nesta área: não há gateway de pagamento integrado nem assinatura vinculada à sua conta, por isso não exibimos cartão, renovação automática ou recibos.'
            : 'Nenhuma fatura: contas no plano gratuito não geram cobranças.'}
        </p>
        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
          <span className="font-bold text-white">Pagamento online ainda não disponível.</span>{' '}
          Quando o checkout for lançado, esta área passará a exibir a forma de pagamento, a renovação
          e os recibos reais da sua assinatura.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LISTA DE INTERESSADOS (B54 — SPRINT 17): REGISTRO REAL, SEM COBRANÇA   */}
      {/* ========================================================================= */}
      {interest && (
        <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
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
