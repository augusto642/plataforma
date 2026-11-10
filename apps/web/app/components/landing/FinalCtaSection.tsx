{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';

/* Central 218 (D1) — CTA final do protótipo Stitch v2
   (home-desktop.html §7): centrado e simples — título, texto,
   botão "Começar grátis agora" (→ cadastro) e a linha "Sem
   pegadinhas • Não pedimos dados de cartão no plano grátis". O
   painel "ARENA DE PRODUÇÃO / Escolha seu Companion Inicial"
   saiu (não existe no protótipo). O texto do protótipo dizia
   "escolha sua trilha" — adaptado per A1 (o aluno não escolhe a
   trilha: a IA sugere). */
export const FinalCtaSection: React.FC = () => (
  <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div className="max-w-5xl mx-auto">
      <div className="text-center rounded-3xl bg-gradient-to-b from-surface-2 to-surface-1 border border-border-2 p-10 md:p-16">
        <h2 className="font-heading text-3xl sm:text-5xl font-black text-ink-heading tracking-tight mb-4">
          Pronto para escrever seu primeiro código hoje?
        </h2>
        <p className="font-sans text-base sm:text-lg text-ink-body max-w-xl mx-auto mb-8 leading-relaxed">
          Cadastre-se em menos de 1 minuto e comece a jogar sem pagar nada.
        </p>
        <TrackedLink
          href="/register"
          ctaId="final_primary"
          event="final_cta"
          className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-brand-purple hover:bg-brand-purple-dark text-white font-heading font-bold text-base rounded-xl transition-all duration-200 shadow-xl shadow-brand-purple/30 whitespace-nowrap"
        >
          <span>Começar grátis agora</span>
          <span>→</span>
        </TrackedLink>
        <div className="mt-4 text-body-sm text-ink-span font-mono">
          Sem pegadinhas • Não pedimos dados de cartão no plano grátis
        </div>
      </div>
    </div>
  </section>
);
