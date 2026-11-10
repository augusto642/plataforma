{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { IconLogoMark } from './icons';

/* Central 218 (D1) — rodapé do protótipo Stitch v2
   (home-desktop.html): logo, os 5 links (Como funciona / Trilhas
   / Gamificação / Tutora de IA / Planos & Preços) e "© 2026 Nexus
   Code. Aprenda a programar de verdade, jogando." Saíram as
   colunas Trilhas no radar / Plataforma / Acesso, os Termos /
   Privacidade / Voltar ao topo e o botão "Começar grátis agora"
   da coluna Acesso (que quebrava em 2 linhas a 390px). */
export const LandingFooter: React.FC = () => (
  <footer className="relative z-10 border-t border-border-2 bg-dark-surface-container-low py-12 px-6 sm:px-12">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-1 border border-border-2 flex items-center justify-center p-1">
          <IconLogoMark />
        </div>
        <span className="font-heading font-bold text-white text-lg">
          NEXUS<span className="text-brand-purple-light">CODE</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 text-body-sm text-ink-span font-sans">
        <a href="#como-funciona" className="hover:text-white transition-colors whitespace-nowrap">Como funciona</a>
        <a href="#trilhas" className="hover:text-white transition-colors whitespace-nowrap">Trilhas</a>
        <a href="#o-jogo" className="hover:text-white transition-colors whitespace-nowrap">Gamificação</a>
        <a href="#recursos" className="hover:text-white transition-colors whitespace-nowrap">Tutora de IA</a>
        <a href="#planos" className="hover:text-white transition-colors whitespace-nowrap">Planos &amp; Preços</a>
      </div>

      <div className="text-body-sm text-ink-span font-mono text-center md:text-right">
        © 2026 Nexus Code. Aprenda a programar de verdade, jogando.
      </div>
    </div>
  </footer>
);
