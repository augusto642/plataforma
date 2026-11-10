'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// B08/B11 — eventos do funil + intenção de plano persistida no clique
import { track } from '../../lib/analytics';
import { savePlanIntent } from '../../lib/attribution';
// Frente 3 — ícones SVG únicos da landing
import { IconBolt, IconCard, IconRocket } from './icons';
// B52/P5 (Sprint 16) — preços da fonte única (pricing-data.ts)
import { PLAN_PRICES, annualSavings, annualTotal, formatBRL } from './pricing-data';
// B71 (Sprint 18 · Volta 3) — captura só-e-mail da lista de interessados
import { PlanInterestForm } from './PlanInterestForm';

/* Sprint 10 · B34 — ilha client dos preços: o toggle mensal/anual é o
   único estado da seção; os cards leem o ciclo dele.
   B45 (Sprint 15) — o toggle agora ABRE NO MENSAL: ele nascia no
   anual ('annual') e o primeiro preço lido era R$ 29,90/mês,
   desencontrado da âncora do hero (Pro R$ 39,90/mês). O anual segue
   a um clique, com o total do ano exibido como sempre. */
/* B54 (Sprint 17 · Volta 2) — aviso no ponto de decisão: os cards
   pagos exibem junto ao CTA o estado real da cobrança, no MESMO texto
   curto nos dois cards pagos. A intenção do clique tem destino: com
   sessão ativa, ela vira a lista de interessados do plano no servidor
   (POST /plan-interest) — e o selo do Pro diz exatamente isso, sem
   "lote fundador" nem benefício indefinido. */
/* Fase 1 premium (desenho §2.4) — o CTA de plano pago passa da lista
   de interessados para o checkout (em modo de testes). A lista de
   interessados segue válida só para o Carreira, sem preço definido.
   A9 (Lote 3 · portões do merge) — o aviso de cobrança RESTAURADO: a
   fase 1 removeu o aviso e a página passou a sugerir cobrança ativa; o
   P1 do merge fatiado restaurou o aviso com o texto atualizado para a
   realidade do checkout (landing-render.spec.ts:71 espera o aviso 2×).
   O P6 do premium restaurou o texto ANTIGO ("Cobrança ainda não ativa")
   sem saber do P1; no merge, vale o texto do P1 — a propriedade de
   segurança é a mesma (aviso honesto 2×, nenhuma cobrança real). */
export const PAID_PLAN_BILLING_NOTE =
  'Checkout em modo de testes — nenhuma cobrança real é feita.';

export const PricingSection: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <>
  {/* 10. PLANOS E PREÇOS: DESTAQUE NO PLANO PRO EM ROXO */}
  <section id="precos" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto">
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
    {/* B51/P4 (Sprint 16) — a economia do anual em REAIS ABSOLUTOS,
        junto ao toggle. Central 216 (D1): só o Pro tem preço — o
        Carreira está com preço a definir e não entra na conta. */}
    <p className="text-body-sm font-mono text-ink-span -mt-8 mb-16 lg:text-right">
      No plano anual: <span className="text-ink-heading font-bold">economize {formatBRL(annualSavings(PLAN_PRICES.pro) ?? 0)} por ano</span> no Pro, em relação ao mensal.
    </p>
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
            <span className="text-3xl sm:text-4xl font-heading font-black text-ink-heading">{formatBRL(PLAN_PRICES.explorer.monthly)}</span>
            <span className="text-body-sm font-mono text-ink-span ml-1">/ para sempre</span>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-body mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Desafios fundamentais do nível Iniciante</li>
            {/* Redesign v2 (correção 4) — itens do plano Iniciante do
                mockup v2: os desafios iniciais de lógica são o conteúdo
                do nível Iniciante, e a comunidade é a /comunidade
                (fórum + revisão por pares) que já existe no produto. */}
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Acesso aos desafios iniciais de lógica</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Comunidade de alunos</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Sandbox Linux Piston</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Ranking por curso entre alunos matriculados</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Tutora de IA socrática no nível Iniciante</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Portfólio público e certificado com verificação por código SHA-256</li>
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
              {formatBRL(billingCycle === 'annual' ? PLAN_PRICES.pro.annualMonthly : PLAN_PRICES.pro.monthly)}
            </span>
            <span id="cycle-pro" className="text-body-sm font-mono text-ink-span ml-1">
              {billingCycle === 'annual' ? `/ mês (${formatBRL(annualTotal(PLAN_PRICES.pro))}/ano)` : '/ mês'}
            </span>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple-low border border-border-brand text-brand-purple-light text-xs font-mono font-bold uppercase tracking-wider">
                <IconRocket className="w-3.5 h-3.5" />
                <span>Preço de lançamento · Lista de interessados aberta</span>
              </span>
            </div>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-heading mb-8">
            {/* B48/P1 (Sprint 16) — a lista prometia "todas as 4 Trilhas
                Master" e "capstones de concorrência e sistemas
                distribuídos": as trilhas da ementa ainda não existem
                como cursos (ver seção de trilhas/roadmap) e capstone
                nomeado não é conferível. Fica o benefício real do plano:
                acesso a trilhas e níveis, tutora e portfólio verificável.
                B66 (Sprint 18 · Volta 3 · QA A6) — "Acesso TOTAL a
                TODAS as trilhas" lia como inventário presente,
                incluindo as 4 do radar. Formulação no presente
                verdadeiro: as trilhas e níveis DISPONÍVEIS. */}
            {/* Central 216 (D1, correção #6 do prompt v2) — o Pro dá
                "Acesso a todas as fases", sem "ilimitado". */}
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Acesso a todas as fases</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Tutora de IA socrática em todas as trilhas e níveis</li>
            <li className="flex items-center gap-2"><span className="text-brand-green-neon font-bold">✔</span> Certificado de conclusão com verificação pública por código SHA-256</li>
          </ul>
          {/* B67 (Sprint 18 · Volta 3 · PM M2) — a diferença free×Pro
              dita com precisão: conferido no código (B61), o ÚNICO
              entitlement de plano que existe hoje é a tutora além do
              nível Iniciante (AiTutorPlanGuard). O card diz isso em
              vez de deixar o visitante presumir um muro maior. */}
          <p className="text-body-sm font-sans text-ink-span leading-relaxed -mt-4 mb-8">
            A diferença para o Explorer, hoje: a tutora de IA em <span className="text-ink-heading font-semibold">todos os níveis</span> —
            no plano gratuito, ela acompanha só o nível Iniciante.
          </p>
        </div>
        <div>
          {/* B67 (Sprint 18 · Volta 3 · PM M2/Growth M2) — os três
              cards diziam a mesma frase ("Começar grátis agora") e
              nenhum momento de compromisso era nomeado. Cada CTA
              agora diz a ação verdadeira do seu card. Fase 1 premium:
              o CTA do Pro aponta para o checkout em modo de testes
              (/checkout/pro); a lista de interessados segue no
              formulário só-e-mail abaixo do CTA (PlanInterestForm),
              cujo botão é o "Entrar na lista de interessados" que a
              landing conta no teste de honestidade de preço. */}
          <Link href="/checkout/pro" data-cta-id="pricing_pro" onClick={() => { track('pricing_cta', 'pricing_pro', { plan: 'pro', cycle: billingCycle }); savePlanIntent({ plan: 'pro', billingCycle }); }} className="block w-full py-3.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm font-heading font-extrabold text-center shadow-lg shadow-brand-purple/30 hover:shadow-xl hover:shadow-brand-purple/40 transition-all active:scale-95 border border-border-2">
            <span className="inline-flex items-center gap-2">Assinar o Pro (modo de testes) <IconBolt className="w-4 h-4" /></span>
          </Link>
          <p className="mt-3 text-center text-xs font-sans text-ink-span">{PAID_PLAN_BILLING_NOTE}</p>
          {/* B71 (Sprint 18 · Volta 3 · Growth M1) — captura só-e-mail
              no card: entrar na lista não pode exigir o cadastro
              completo (a waitlist das trilhas já capturava só o
              e-mail; a assimetria era invertida no lead mais valioso). */}
          <div className="mt-4 border-t border-border-2/60 pt-4">
            <PlanInterestForm plan="pro" planLabel="plano Pro" billingCycle={billingCycle} />
          </div>
        </div>
      </div>

      {/* Card Carreira (protótipo Stitch v2) — Central 216 (D1): o
          terceiro plano é o Carreira, com "Preço a definir" (não o
          Staff R$ 79,90). Sem preço, sem aviso de cobrança e sem
          checkout: a ação real é a lista de interessados (+ contato).
          O id interno segue 'staff' (plan-interest/API). */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 flex flex-col justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-brand-purple-light uppercase tracking-wider mb-2">CARREIRA</div>
          <h3 className="text-xl font-heading font-bold text-ink-heading mb-2">Plano Carreira</h3>
          <p className="text-body-sm text-ink-span leading-relaxed mb-6 font-sans">
            Tudo do Pro somado a preparação direta e conexão com empresas.
          </p>
          <div className="mb-6">
            <span id="price-staff" className="text-3xl sm:text-4xl font-heading font-black text-ink-heading">
              Preço a definir
            </span>
          </div>
          <ul className="space-y-3 text-body-sm font-mono text-ink-body mb-8">
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Tudo incluído no plano Pro</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Talent Match: recomendação para empresas parceiras</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Preparação completa para vagas e revisão de currículo/LinkedIn</li>
            <li className="flex items-center gap-2"><span className="text-brand-purple font-bold">✔</span> Simulações de entrevistas com feedbacks gravados</li>
          </ul>
        </div>
        <div>
          <Link href="/contato" data-cta-id="pricing_staff_contact" onClick={() => { track('pricing_cta', 'pricing_staff_contact', { plan: 'staff', intent: 'contact_sales', cycle: billingCycle }); savePlanIntent({ plan: 'staff', billingCycle, intent: 'contact_sales' }); }} className="block w-full py-3 rounded-xl bg-transparent hover:bg-brand-purple text-brand-purple-light hover:text-white text-body-sm font-mono font-bold text-center border border-brand-purple/60 transition-colors">
            Falar com a equipe
          </Link>
          <p className="mt-2 text-center text-xs font-sans text-ink-span">
            Sem preço definido — entre na lista de interessados do plano Carreira e avisaremos quando abrir.
          </p>
          <div className="mt-4 border-t border-border-2/60 pt-4">
            <PlanInterestForm plan="staff" planLabel="plano Carreira" billingCycle={billingCycle} />
          </div>
        </div>
      </div>

    </div>
  </section>
    </>
  );
};
