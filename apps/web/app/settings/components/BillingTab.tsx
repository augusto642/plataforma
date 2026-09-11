'use client';

import React from 'react';
import { BillingInvoice } from '../types';
import { INITIAL_INVOICES } from '../data';

interface BillingTabProps {
  onNotify: (message: string) => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({ onNotify }) => {
  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CURRENT PLAN OVERVIEW HERO                                             */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#181820] to-[#121217] border border-[#8257E5]/50 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#8257E5]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#8257E5] text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Plano Ativo
              </span>
              <span className="text-xs font-mono text-[#04D361] font-bold">
                ● Renovação Automática em 01/04/2026
              </span>
            </div>
            <h3 className="text-2xl font-black text-white font-heading">
              Nexus PRO Engineer
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              Acesso ilimitado ao sandbox de contêineres Piston, IA Socrática em tempo real e auditoria criptográfica de diplomas.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white font-mono">R$ 89</span>
              <span className="text-xs text-zinc-400 font-mono">/mês</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNotify('Modal de upgrade de plano anual (-20% OFF)!')}
                className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all shadow-md shadow-[#8257E5]/25 cursor-pointer"
              >
                Mudar para Anual (-20%)
              </button>
              <button
                type="button"
                onClick={() => onNotify('Link de cancelamento ou pausa enviado.')}
                className="px-3 py-2 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-600 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Gerenciar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RESOURCE CONSUMPTION GAUGES                                            */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">
          Consumo de Recursos &amp; Quotas do Ciclo Atual
        </h3>
        <p className="text-xs text-zinc-400 mb-5">
          Suas métricas de uso de sandbox isolada com cgroups v2 e chamadas ao LLM pedagógico.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gauge 1: Piston Sandbox Hours */}
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-zinc-300">Tempo de CPU Sandbox</span>
              <span className="font-mono text-[#00E5FF] font-bold">142h / Ilimitado</span>
            </div>
            <div className="w-full bg-[#121217] h-2 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#00E5FF] rounded-full w-[45%]" />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-1.5 block">
              Linux Piston Cgroups v2 isolado
            </span>
          </div>

          {/* Gauge 2: Socratic AI Tokens */}
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-zinc-300">Tokens do Tutor IA</span>
              <span className="font-mono text-[#8257E5] font-bold">480k / 2.0M</span>
            </div>
            <div className="w-full bg-[#121217] h-2 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#8257E5] rounded-full w-[24%]" />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-1.5 block">
              24% do limite mensal utilizado
            </span>
          </div>

          {/* Gauge 3: Git Storage */}
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-zinc-300">Storage Git &amp; Blobs</span>
              <span className="font-mono text-[#04D361] font-bold">1.2 GB / 25 GB</span>
            </div>
            <div className="w-full bg-[#121217] h-2 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#04D361] rounded-full w-[5%]" />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono mt-1.5 block">
              Repositórios remotos Gitea
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PAYMENT METHOD & INVOICES                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Card */}
        <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading mb-1">
              Forma de Pagamento
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Cartão padrão utilizado na renovação mensal.
            </p>

            <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded bg-gradient-to-r from-red-600 to-amber-500 flex items-center justify-center text-white text-[10px] font-black tracking-wider">
                  MC
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white">•••• •••• •••• 4821</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Expira em 08/29</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#04D361] bg-[#04D361]/10 px-2 py-0.5 rounded border border-[#04D361]/30 font-bold">
                PADRÃO
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNotify('Modal de alteração de cartão de crédito aberto.')}
            className="w-full mt-4 py-2 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white transition-all cursor-pointer"
          >
            Atualizar Cartão
          </button>
        </div>

        {/* Invoice History */}
        <div className="lg:col-span-2 bg-[#121217] border border-[#27272A] rounded-2xl p-6">
          <h3 className="text-base font-bold text-white font-heading mb-1">
            Histórico de Faturas &amp; Recibos
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Faça download dos comprovantes fiscais em PDF.
          </p>

          <div className="space-y-2">
            {INITIAL_INVOICES.map((inv) => (
              <div
                key={inv.id}
                className="bg-[#181820] border border-[#27272A] rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-zinc-400">{inv.date}</span>
                  <span className="font-bold text-white">{inv.invoiceNumber}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#04D361]">{inv.amount}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#04D361]/10 text-[#04D361] border border-[#04D361]/30 font-bold">
                    PAGO
                  </span>
                  <button
                    type="button"
                    onClick={() => onNotify(`Baixando recibo ${inv.invoiceNumber} em PDF...`)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    title="Baixar PDF"
                  >
                    📄
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
