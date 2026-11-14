import React from 'react';
import { MaterialIcon } from '../MaterialIcon';
import { TrackedLink } from './TrackedLink';

export const FinalCtaSection: React.FC = () => (
  <section className="py-24 bg-dark-surface relative overflow-hidden">
    <div className="max-w-5xl mx-auto px-6">
      <div className="text-center rounded-2xl bg-gradient-to-b from-dark-surface-container to-dark-surface-container-low border border-border-strong p-10 md:p-16">
        <h2 className="font-headline text-display-md-mobile md:text-display-md text-white font-extrabold tracking-tight mb-4">
          Pronto para escrever seu primeiro código hoje?
        </h2>
        <p className="font-body text-body-lg text-dark-on-surface-variant max-w-xl mx-auto mb-8">
          Cadastre-se em menos de 1 minuto, escolha sua trilha e comece a jogar sem pagar nada.
        </p>
        <TrackedLink
          href="/register"
          ctaId="final_primary"
          event="final_cta"
          className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary hover:bg-dark-primary text-white font-label text-label-lg rounded transition-all duration-state-change shadow-xl shadow-primary/30 whitespace-nowrap"
        >
          <span>Começar grátis agora</span>
          <MaterialIcon name="arrow_forward" className="text-[20px]" />
        </TrackedLink>
        <div className="mt-4 text-body-sm text-dark-on-surface-variant font-code">
          Sem pegadinhas • Não pedimos dados de cartão no plano grátis
        </div>
      </div>
    </div>
  </section>
);
