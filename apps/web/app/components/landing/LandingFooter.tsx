import React from 'react';
import Logo from '../Logo';

export const LandingFooter: React.FC = () => (
  <footer className="border-t border-border-subtle bg-dark-surface-container-low py-12">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <Logo size="md" theme="dark" href="/" />

      <div className="flex flex-wrap items-center justify-center gap-6 text-body-sm text-dark-on-surface-variant font-body">
        <a href="#como-funciona" className="hover:text-white transition-colors whitespace-nowrap">
          Como funciona
        </a>
        <a href="#trilhas" className="hover:text-white transition-colors whitespace-nowrap">
          Trilhas
        </a>
        <a href="#o-jogo" className="hover:text-white transition-colors whitespace-nowrap">
          Gamificação
        </a>
        <a href="#recursos" className="hover:text-white transition-colors whitespace-nowrap">
          Tutora de IA
        </a>
        <a href="#planos" className="hover:text-white transition-colors whitespace-nowrap">
          Planos &amp; Preços
        </a>
      </div>

      <div className="text-body-sm text-dark-on-surface-variant font-code text-center md:text-right">
        © 2026 Nexus Code. Aprenda a programar de verdade, jogando.
      </div>
    </div>
  </footer>
);
