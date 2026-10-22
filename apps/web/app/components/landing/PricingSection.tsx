'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// B08/B11 — eventos do funil + intenção de plano persistida no clique
import { track } from '../../lib/analytics';
import { savePlanIntent } from '../../lib/attribution';
// Frente 3 — ícones SVG únicos da landing
import { IconBolt, IconCard, IconRocket } from './icons';

/* Sprint 10 · B34 — ilha client dos preços: o toggle mensal/anual é o
   único estado da seção; os cards leem o ciclo dele.
   B45 (Sprint 15) — o toggle agora ABRE NO MENSAL: ele nascia no
   anual ('annual') e o primeiro preço lido era R$ 29,90/mês,
   desencontrado da âncora do hero (Pro R$ 39,90/mês). O anual segue
   a um clique, com o total do ano exibido como sempre. */
export const PricingSection: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <>
  {/* 10. PLANOS E PREÇOS: DESTAQUE NO PLANO PRO EM ROXO */}
  <section id="precos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
      <div className="max-w-2xl text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green-neon text-xs font-mono font-bold mb-3">
          <IconCard className="w-4 h-4" />
          <span>PLANOS ACESSÍVEIS & TRANSPARENTES</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
          Comece grátis. Pague só quando avançar.
        </h2>
        <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
          Investimento direto na sua independência técnica. O nível Iniciante é grátis para sempre — você só paga se decidir avançar de nível.
        </p>
      </div>

      {/* SELETOR MENSAL / ANUAL ALINHADO À DIREITA */}
      <div className="inline-flex items-center p-1.5 rounded-full bg-surface-1 border border-border-2 shrink-0 self-start lg:self-end">
        <button
          type="button"
          onClick={() => setBillingCycle('monthly')}
          aria-pressed={billingCycle === 'monthly'}
          className={`px-6 py-2 rounded-full text-body-sm sm:text-sm transition-all cursor-pointer ${
            billingCycle === 'monthly'
              ? 'font-bold bg-brand-purple text-white shadow-md'
              : 'font-medium text-ink-span hover:text-ink-heading'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setBillingCycle('annual')}
          aria-pressed={billingCycle === 'annual'}
          className={`px-6 py-2 rounded-full text-body-sm sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            billingCycle === 'annual'
              ? 'font-bold bg-brand-purple text-white shadow-md'
              : 'font-medium text-ink-span hover:text-ink-heading'
          }`}
        >
          <span>Anual</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-purple-light/20 text-brand-purple-light font-bold">
            ECONOMIZE 25%
          </span>
        </button>
      </div>
    </div>
{/* CARDS DE PREÇO */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      
      {/* Card Gratuito (Explorer) */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-ink-span uppercase tracking-wider mb-2">Explorer</div>
          <h3 className="text-xl font-heading font-bold text-ink-heading mb-2">Comunitário</h3>
          <p className="text-body-sm text-ink-span leading-relaxed mb-6 font-sans">
            Para experimentar os primeiros módulos e o terminal interativo.
          </p>
          <div className="mb-6">
            <span className="text-3xl sm:text-4xl font-heading font-black text-ink-heading">R$ 0</span>
            <span className="text-body-sm font-mono text-ink-span ml-1">/ para sempre</span>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-body mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Desafios fundamentais do nível Iniciante</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Sandbox Linux Piston</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Ranking por curso entre alunos matriculados</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Tutora de IA socrática no nível Iniciante</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Portfólio público com seus projetos</li>
          </ul>
        </div>
        <Link href="/register" data-cta-id="pricing_explorer" onClick={() => { track('pricing_cta', 'pricing_explorer', { plan: 'explorer', cycle: billingCycle }); savePlanIntent({ plan: 'explorer', billingCycle }); }} className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-mono font-bold text-center shadow-md shadow-brand-purple/25 transition-all active:scale-95">
          Começar grátis agora
        </Link>
      </div>

      {/* Card Pro Engineer (Featured - Roxo com Shadow Difusa) */}
      <div className="p-8 rounded-2xl bg-surface-1 border-2 border-brand-purple relative flex flex-col justify-between shadow-xl shadow-brand-purple/20">
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-purple text-white text-xs font-mono font-bold uppercase tracking-wider shadow-md">
          RECOMENDADO
        </div>
        <div>
          <div className="text-xs font-mono font-bold text-brand-purple uppercase tracking-wider mb-2">PRO ENGINEER</div>
          <h3 className="text-2xl font-heading font-bold text-ink-heading mb-2">Plano Pro</h3>
          <p className="text-body-sm text-ink-body leading-relaxed mb-6 font-sans">
            Para quem busca autonomia técnica e preparação para vagas de alto nível.
          </p>
          <div className="mb-6">
            <span id="price-pro" className="text-4xl sm:text-5xl font-heading font-black text-ink-heading">
              {billingCycle === 'annual' ? 'R$ 29,90' : 'R$ 39,90'}
            </span>
            <span id="cycle-pro" className="text-body-sm font-mono text-ink-span ml-1">
              {billingCycle === 'annual' ? '/ mês (R$ 358,80/ano)' : '/ mês'}
            </span>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple-low border border-border-brand text-brand-purple-light text-xs font-mono font-bold uppercase tracking-wider">
                <IconRocket className="w-3.5 h-3.5" />
                <span>Preço de lançamento · Lote fundador</span>
              </span>
            </div>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-heading mb-8">
            {/* B48/P1 (Sprint 16) — a lista prometia "todas as 4 Trilhas
                Master" e "capstones de concorrência e sistemas
                distribuídos": as trilhas da ementa ainda não existem
                como cursos (ver seção de trilhas/roadmap) e capstone
                nomeado não é conferível. Fica o benefício real do plano:
                acesso a trilhas e níveis, tutora e portfólio verificável. */}
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Acesso total a todas as trilhas e níveis da plataforma</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Tutora de IA socrática em todas as trilhas e níveis</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Portfólio de Evidências com Hash SHA-256</li>
          </ul>
        </div>
        <Link href="/register" data-cta-id="pricing_pro" onClick={() => { track('pricing_cta', 'pricing_pro', { plan: 'pro', cycle: billingCycle }); savePlanIntent({ plan: 'pro', billingCycle }); }} className="w-full py-3.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-heading font-extrabold text-center shadow-lg shadow-brand-purple/30 hover:shadow-xl hover:shadow-brand-purple/40 transition-all active:scale-95 border border-border-2">
          <span className="inline-flex items-center gap-2">Começar grátis agora <IconBolt className="w-4 h-4" /></span>
        </Link>
      </div>

      {/* Card Staff / Enterprise */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-brand-purple-light uppercase tracking-wider mb-2">ENTERPRISE & TIMES</div>
          <h3 className="text-xl font-heading font-bold text-ink-heading mb-2">Plano Staff</h3>
          <p className="text-body-sm text-ink-span leading-relaxed mb-6 font-sans">
            Para times de engenharia, tech academies e posições seniores.
          </p>
          <div className="mb-6">
            <span id="price-staff" className="text-3xl sm:text-4xl font-heading font-black text-ink-heading">
              {billingCycle === 'annual' ? 'R$ 59,90' : 'R$ 79,90'}
            </span>
            <span id="cycle-staff" className="text-body-sm font-mono text-ink-span ml-1">
              {billingCycle === 'annual' ? '/ mês (R$ 718,80/ano)' : '/ mês'}
            </span>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-body mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Painel de Gestão de Equipes</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Desafios Customizados de Empresa</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Tudo do plano Pro incluído</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Relatórios de Performance de Engenharia</li>
          </ul>
        </div>
        {/* Staff é contato comercial (ação genuinamente outra): cta_id e
            intenção próprios, tratamento secundário em roxo — não divide o
            funil de cadastro genérico (Sprint 5).
            Sprint 6 — o rótulo agora tem destino REAL: a página /contato
            (formulário próprio com endpoint na API), não mais o /register
            disfarçado de contato. */}
        <Link href="/contato" data-cta-id="pricing_staff_contact" onClick={() => { track('pricing_cta', 'pricing_staff_contact', { plan: 'staff', intent: 'contact_sales', cycle: billingCycle }); savePlanIntent({ plan: 'staff', billingCycle, intent: 'contact_sales' }); }} className="w-full py-3 rounded-xl bg-transparent hover:bg-brand-purple text-brand-purple-light hover:text-white text-body-sm font-mono font-bold text-center border border-brand-purple/60 transition-colors">
          Falar com Engenharia
        </Link>
      </div>

    </div>
  </section>
    </>
  );
};
