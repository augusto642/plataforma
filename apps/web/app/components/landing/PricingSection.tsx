'use client';

import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../MaterialIcon';
import { track } from '../../lib/analytics';
import { savePlanIntent } from '../../lib/attribution';
import { PLAN_PRICES, formatBRL } from './pricing-data';

export const PAID_PLAN_BILLING_NOTE =
  'Checkout em modo de testes — nenhuma cobrança real é feita.';

export const PricingSection: React.FC = () => {
  return (
    <section id="planos" className="py-24 border-b border-border-subtle bg-dark-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-code text-code-sm text-primary uppercase tracking-widest font-semibold block mb-2">
            Transparência total
          </span>
          <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg font-bold text-white tracking-tight mb-4">
            Escolha seu plano e comece hoje
          </h2>
          <p className="font-body text-body-lg text-dark-on-surface-variant">
            Comece de graça e evolua no seu ritmo. Cancele quando quiser, sem letras miúdas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Plano Iniciante (Grátis) */}
          <div className="bg-dark-surface-container-low border border-border-subtle rounded-lg p-8 flex flex-col justify-between hover:border-border-strong transition-all">
            <div>
              <div className="mb-6">
                <h3 className="font-headline text-headline-sm text-white font-bold mb-1">
                  Iniciante
                </h3>
                <p className="text-body-sm text-dark-on-surface-variant">
                  Para dar os primeiros passos e descobrir o gosto por programar.
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-display-md font-headline font-extrabold text-white">
                    R$ 0
                  </span>
                  <span className="text-body-sm text-dark-on-surface-variant">/para sempre</span>
                </div>
                <span className="font-code text-code-sm text-secondary">
                  Sem cartão de crédito necessário
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Trilha inicial completa em formato de jogo</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Editor de código direto no navegador</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Acesso aos desafios iniciais de lógica</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Comunidade de alunos</span>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              data-cta-id="pricing_explorer"
              onClick={() => {
                track('pricing_cta', 'pricing_explorer', { plan: 'explorer' });
                savePlanIntent({ plan: 'explorer', billingCycle: 'monthly' });
              }}
              className="block w-full py-3.5 px-4 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-label-md text-center rounded transition-colors"
            >
              Criar conta grátis
            </Link>
          </div>

          {/* Plano Pro (R$ 39,90/mês) */}
          <div className="bg-dark-surface-container-low border-2 border-primary rounded-lg p-8 flex flex-col justify-between relative shadow-2xl shadow-primary/20">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white font-code text-xs font-bold rounded-full uppercase tracking-wider whitespace-nowrap">
              Mais Recomendado
            </div>

            <div>
              <div className="mb-6">
                <h3 className="font-headline text-headline-sm text-white font-bold mb-1">Pro</h3>
                <p className="text-body-sm text-dark-on-surface-variant">
                  Para quem quer acelerar até conseguir o primeiro trabalho como dev.
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-body-lg text-dark-on-surface font-headline font-bold">
                    R$
                  </span>
                  <span className="text-display-md font-headline font-extrabold text-white">
                    {formatBRL(PLAN_PRICES.pro.monthly!).replace(/^R\$\s*/, '')}
                  </span>
                  <span className="text-body-sm text-dark-on-surface-variant">/mês</span>
                </div>
                <span className="font-code text-code-sm text-primary">
                  Acesso a todas as fases
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface font-medium">
                  <MaterialIcon name="check_circle" className="text-primary text-[20px] shrink-0" />
                  <span>Trilhas completas de Júnior e Pleno</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Certificado verificado de conclusão</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Simulador de entrevista de emprego com IA</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Revisão de código linha a linha por IA</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Ligas competitivas e ranking semanal</span>
                </div>
              </div>
            </div>

            <div>
              <Link
                href="/checkout/pro"
                data-cta-id="pricing_pro"
                onClick={() => {
                  track('pricing_cta', 'pricing_pro', { plan: 'pro' });
                  savePlanIntent({ plan: 'pro', billingCycle: 'monthly' });
                }}
                className="block w-full py-3.5 px-4 bg-primary hover:bg-dark-primary text-white font-label text-label-md font-bold text-center rounded transition-all shadow-lg shadow-primary/30"
              >
                Assinar Pro por R$ 39,90
              </Link>
              <p className="mt-3 text-center text-xs font-body text-dark-on-surface-variant">
                {PAID_PLAN_BILLING_NOTE}
              </p>
            </div>
          </div>

          {/* Plano Carreira */}
          <div className="bg-dark-surface-container-low border border-border-subtle rounded-lg p-8 flex flex-col justify-between hover:border-border-strong transition-all">
            <div>
              <div className="mb-6">
                <h3 className="font-headline text-headline-sm text-white font-bold mb-1">
                  Carreira
                </h3>
                <p className="text-body-sm text-dark-on-surface-variant">
                  Tudo do Pro somado a preparação direta e conexão com empresas.
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-display-md font-headline font-extrabold text-white">
                    Preço a definir
                  </span>
                </div>
                <span className="font-code text-code-sm text-tertiary">
                  Foco absoluto em contratação
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface font-medium">
                  <MaterialIcon name="stars" className="text-tertiary text-[20px] shrink-0" />
                  <span>Tudo incluído no plano Pro</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Talent Match: recomendação para empresas parceiras</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Preparação completa para vagas e revisão de currículo/LinkedIn</span>
                </div>
                <div className="flex items-start gap-3 text-body-sm text-dark-on-surface">
                  <MaterialIcon name="check" className="text-secondary text-[20px] shrink-0" />
                  <span>Simulações de entrevistas com feedbacks gravados</span>
                </div>
              </div>
            </div>

            <Link
              href="/contato"
              data-cta-id="pricing_staff_contact"
              onClick={() => {
                track('pricing_cta', 'pricing_staff_contact', {
                  plan: 'staff',
                  intent: 'contact_sales',
                });
                savePlanIntent({
                  plan: 'staff',
                  billingCycle: 'monthly',
                  intent: 'contact_sales',
                });
              }}
              className="block w-full py-3.5 px-4 bg-dark-surface-container hover:bg-dark-surface-container-high border border-border-strong text-white font-label text-label-md text-center rounded transition-colors"
            >
              Garantir Plano Carreira
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
