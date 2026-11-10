'use client';

import React from 'react';
import Link from 'next/link';
// B08/B11 — eventos do funil + intenção de plano persistida no clique
import { track } from '../../lib/analytics';
import { savePlanIntent } from '../../lib/attribution';
// B52/P5 (Sprint 16) — preços da fonte única (pricing-data.ts)
import { PLAN_PRICES, formatBRL } from './pricing-data';

/* Central 218 (D1) — Planos do protótipo Stitch v2
   (home-desktop.html §6): título "Escolha seu plano e comece
   hoje", sem toggle Mensal/Anual, cards Iniciante R$ 0 / Pro
   R$ 39,90 / Carreira "Preço a definir", com as listas de
   benefícios do protótipo. Sem selo de lista de interessados e
   sem inputs de e-mail (PlanInterestForm saiu dos cards): o Pro
   vai ao checkout em modo de testes e o Carreira ao contato.
   A9 — o aviso de cobrança segue 1× no card Pro, junto ao CTA:
   nenhuma cobrança real é feita. */
// Fase 1 premium (desenho §2.4) — o CTA de plano pago passa da lista
// de interessados para o checkout (em modo de testes).
export const PAID_PLAN_BILLING_NOTE =
  'Checkout em modo de testes — nenhuma cobrança real é feita.';

export const PricingSection: React.FC = () => {
  return (
    <section id="planos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-mono text-xs text-brand-purple-light uppercase tracking-widest font-bold block mb-2">
          Transparência total
        </span>
        <h2 className="text-3xl sm:text-5xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Escolha seu plano e comece hoje
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Comece de graça e evolua no seu ritmo. Cancele quando quiser, sem letras miúdas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Plano Iniciante (Grátis) */}
        <div className="bg-dark-surface-container-low border border-border-subtle rounded-xl p-8 flex flex-col justify-between hover:border-border-strong transition-all">
          <div>
            <div className="mb-6">
              <h3 className="font-heading text-xl font-bold text-white mb-1">Iniciante</h3>
              <p className="text-body-sm text-ink-span">Para dar os primeiros passos e descobrir o gosto por programar.</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-heading font-extrabold text-white">R$ 0</span>
                <span className="text-body-sm text-ink-span">/para sempre</span>
              </div>
              <span className="font-mono text-xs text-secondary">Sem cartão de crédito necessário</span>
            </div>

            <ul className="space-y-4 mb-8 text-body-sm text-ink-body">
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Trilha inicial completa em formato de jogo</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Editor de código direto no navegador</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Acesso aos desafios iniciais de lógica</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Comunidade de alunos</span></li>
            </ul>
          </div>

          <Link href="/register" data-cta-id="pricing_explorer" onClick={() => { track('pricing_cta', 'pricing_explorer', { plan: 'explorer' }); savePlanIntent({ plan: 'explorer', billingCycle: 'monthly' }); }} className="block w-full py-3.5 px-4 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white text-body-sm font-mono font-bold rounded-xl text-center transition-colors">
            Criar conta grátis
          </Link>
        </div>

        {/* Plano Pro (R$ 39,90/mês) */}
        <div className="bg-dark-surface-container-low border-2 border-brand-purple rounded-xl p-8 flex flex-col justify-between relative shadow-2xl shadow-brand-purple/20">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-purple text-white font-mono text-xs font-bold rounded-full uppercase tracking-wider whitespace-nowrap">
            Mais Recomendado
          </div>

          <div>
            <div className="mb-6">
              <h3 className="font-heading text-xl font-bold text-white mb-1">Pro</h3>
              <p className="text-body-sm text-ink-span">Para quem quer acelerar até conseguir o primeiro trabalho como dev.</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-body-lg text-ink-body font-heading font-bold">R$</span>
                <span className="text-4xl font-heading font-extrabold text-white">{formatBRL(PLAN_PRICES.pro.monthly!).replace(/^R\$\s*/, '')}</span>
                <span className="text-body-sm text-ink-span">/mês</span>
              </div>
              <span className="font-mono text-xs text-brand-purple-light">Acesso a todas as fases</span>
            </div>

            <ul className="space-y-4 mb-8 text-body-sm text-ink-body">
              <li className="flex items-start gap-3"><span className="text-brand-purple-light text-[20px] leading-none">✓</span><span className="font-medium">Trilhas completas de Júnior e Pleno</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Certificado verificado de conclusão</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Simulador de entrevista de emprego com IA</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Revisão de código linha a linha por IA</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Ligas competitivas e ranking semanal</span></li>
            </ul>
          </div>

          <div>
            <Link href="/checkout/pro" data-cta-id="pricing_pro" onClick={() => { track('pricing_cta', 'pricing_pro', { plan: 'pro' }); savePlanIntent({ plan: 'pro', billingCycle: 'monthly' }); }} className="block w-full py-3.5 px-4 bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-heading font-extrabold text-center rounded-xl shadow-lg shadow-brand-purple/30 transition-all active:scale-95">
              Assinar Pro por R$ 39,90
            </Link>
            <p className="mt-3 text-center text-xs font-sans text-ink-span">{PAID_PLAN_BILLING_NOTE}</p>
          </div>
        </div>

        {/* Plano Carreira */}
        <div className="bg-dark-surface-container-low border border-border-subtle rounded-xl p-8 flex flex-col justify-between hover:border-border-strong transition-all">
          <div>
            <div className="mb-6">
              <h3 className="font-heading text-xl font-bold text-white mb-1">Carreira</h3>
              <p className="text-body-sm text-ink-span">Tudo do Pro somado a preparação direta e conexão com empresas.</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-heading font-extrabold text-white">Preço a definir</span>
              </div>
              <span className="font-mono text-xs text-brand-cyan-neon">Foco absoluto em contratação</span>
            </div>

            <ul className="space-y-4 mb-8 text-body-sm text-ink-body">
              <li className="flex items-start gap-3"><span className="text-brand-cyan-neon text-[20px] leading-none">★</span><span className="font-medium">Tudo incluído no plano Pro</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Talent Match: recomendação para empresas parceiras</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Preparação completa para vagas e revisão de currículo/LinkedIn</span></li>
              <li className="flex items-start gap-3"><span className="text-secondary text-[20px] leading-none">✓</span><span>Simulações de entrevistas com feedbacks gravados</span></li>
            </ul>
          </div>

          <Link href="/contato" data-cta-id="pricing_staff_contact" onClick={() => { track('pricing_cta', 'pricing_staff_contact', { plan: 'staff', intent: 'contact_sales' }); savePlanIntent({ plan: 'staff', billingCycle: 'monthly', intent: 'contact_sales' }); }} className="block w-full py-3.5 px-4 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white text-body-sm font-mono font-bold rounded-xl text-center transition-colors">
            Garantir Plano Carreira
          </Link>
        </div>
      </div>
    </section>
  );
};
