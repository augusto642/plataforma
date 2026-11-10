{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import Link from 'next/link';
import { TrackedLink } from './TrackedLink';
import { IconGamepad } from './icons';

export const FinalCtaSection: React.FC = () => (
  <>
  {/* 12. CTA FINAL EM SPLIT ASSIMÉTRICO */}
  <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <div className="relative rounded-3xl bg-gradient-to-br from-surface-2 via-surface-1 to-background border border-white/[0.1] p-8 sm:p-14 overflow-hidden shadow-elev-2xl">
      {/* Laser beam na ordem exata da marca: Roxo -> Ciano -> Verde */}
      <div className="top-laser-beam bg-gradient-to-r from-brand-purple via-brand-cyan-neon to-brand-green-neon" style={{ left: '2%', right: '2%' }}></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        {/* Esquerda: 7 cols */}
        <div className="lg:col-span-7 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green-neon/10 border border-brand-green-neon/30 text-brand-green-neon text-xs font-mono font-bold mb-5">
            <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
            <span>COMECE GRÁTIS, SEM CARTÃO</span>
          </div>

          {/* Central 216 (D1) — título do CTA final do protótipo. */}
          <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-ink-heading tracking-tight mb-5 leading-[1.08]">
            Pronto para escrever seu primeiro código hoje?
          </h2>

          <p className="font-sans text-sm sm:text-base text-ink-body leading-relaxed mb-8 max-w-xl">
            Crie sua conta gratuita e envie seu primeiro commit hoje mesmo. O mercado não contrata certificados de vídeo — ele contrata quem resolve problemas no código.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm sm:text-sm font-mono text-ink-body">
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Acesso imediato ao terminal</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Desafios gratuitos do nível Iniciante</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Sem necessidade de cartão</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-brand-green-neon font-black text-base">✔</span>
              <span>Git Real & Hash SHA-256</span>
            </div>
          </div>
        </div>

        {/* Direita: 5 cols (Cockpit Card de Ação) */}
        <div className="lg:col-span-5 w-full">
          <div className="p-8 rounded-2xl bg-background/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl flex flex-col gap-5 text-center sm:text-left">
            <div className="flex items-center justify-between pb-4 border-b border-border-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-green-neon"></span>
                <span className="text-xs font-mono font-bold text-ink-heading uppercase">ARENA DE PRODUÇÃO</span>
              </div>
              {/* Sprint 7 (honestidade) — o badge de status ao vivo
                  saiu: claim sem fonte, igual ao selo removido do FAQ */}
            </div>

            <div>
              <div className="text-xs font-mono text-ink-span mb-1">PASSO INICIAL:</div>
              <div className="text-lg font-heading font-black text-ink-heading">Escolha seu Companion Inicial</div>
              <div className="text-body-sm text-ink-span font-sans mt-1">
                Pythox (Python), Scripty (TypeScript) ou Javagon (Java).
              </div>
            </div>

            <TrackedLink
              href="/onboarding"
              ctaId="final_primary"
              event="final_cta"
              className="w-full inline-flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-brand-purple hover:bg-brand-purple-dark text-white font-heading font-black text-base transition-all duration-200 cursor-pointer active:scale-95 shadow-xl shadow-brand-purple/40 group"
            >
              <span>Começar grátis agora</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200 text-lg font-black">→</span>
            </TrackedLink>

            <p className="text-center text-xs font-mono text-ink-span">
              Sem pegadinhas • Não pedimos dados de cartão no plano grátis
            </p>

            <Link
              href="/game"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border-1 hover:border-brand-cyan-neon/40 text-body-sm font-mono text-ink-body hover:text-ink-heading transition-all"
            >
              <IconGamepad className="w-4 h-4" />
              <span>Ou jogue o Overworld 2D no navegador</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
  </>
);
