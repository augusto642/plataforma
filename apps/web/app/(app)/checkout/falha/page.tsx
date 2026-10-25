'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Fase 1 premium (desenho §2.4) — retorno de falha do checkout.
 * Nada foi cobrado (modo de testes) e nada mudou na conta.
 */
export default function CheckoutFailurePage() {
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
            O checkout não foi concluído
          </h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            O pagamento simulado não foi aprovado ou o checkout foi
            cancelado. Nenhuma assinatura foi criada e nada mudou na sua
            conta. Você pode tentar de novo quando quiser.
          </p>
          <div className="flex gap-3 mt-5">
            <Link
              href="/checkout/pro"
              className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs"
            >
              Tentar de novo
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-[#181820] border border-[#27272A] text-zinc-200 font-bold text-xs"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
