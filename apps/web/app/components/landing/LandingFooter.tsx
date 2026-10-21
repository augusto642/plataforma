{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';
import { IconGithub, IconLogoMark } from './icons';

export const LandingFooter: React.FC = () => (
  <>
      {/* FOOTER CLEAN, ESPAÇOSO E MINIMALISTA */}
  <footer className="relative z-10 border-t border-border-2 bg-background py-20 px-6 sm:px-12 overflow-hidden">
    {/* Linha laser superior minimalista */}
    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent"></div>

    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between gap-16 lg:gap-24">
        
        {/* Bloco da Marca & Proposta */}
        <div className="max-w-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-surface-1 border border-border-2 flex items-center justify-center p-1.5 shadow-lg">
                <IconLogoMark />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-xl tracking-wider text-ink-heading">NEXUS</span>
                <span className="text-xs font-mono font-bold bg-brand-purple/20 text-brand-purple-light px-2 py-0.5 rounded border border-brand-purple/40 tracking-wider">
                  CODE
                </span>
              </div>
            </div>

            <p className="text-sm text-ink-span font-sans leading-relaxed mb-6">
              A plataforma definitiva para aprender programação na prática, escrevendo código real diretamente no navegador.
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-ink-span">
              <span className="w-2 h-2 rounded-full bg-brand-green-neon"></span>
              <span>Sandbox Linux direto no navegador</span>
            </div>
          </div>

          {/* Redes Sociais — Sprint 7 (honestidade): só destinos reais.
              O GitHub aponta para o repositório real do produto; Discord
              e X saíram (não há comunidade nesses canais hoje) */}
          <div className="flex items-center gap-4 mt-8">
            <a href="https://github.com/augusto642/plataforma" target="_blank" rel="noopener noreferrer" className="text-ink-span hover:text-ink-heading transition-colors" aria-label="GitHub">
              <IconGithub className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Colunas Curadas de Navegação */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-16 flex-1 max-w-2xl">
          
          {/* Trilhas */}
          <div>
            <h4 className="text-body-sm font-mono font-bold uppercase tracking-wider text-ink-heading mb-4">
              Trilhas
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  Lógica & Rust
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  APIs com Go
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  React & Next.js
                </a>
              </li>
              <li>
                <a href="#trilhas" className="text-ink-span hover:text-ink-heading transition-colors">
                  Python & IA
                </a>
              </li>
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-body-sm font-mono font-bold uppercase tracking-wider text-ink-heading mb-4">
              Plataforma
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <a href="/ide" className="text-ink-span hover:text-ink-heading transition-colors">
                  Web IDE
                </a>
              </li>
              <li>
                <a href="#sandbox" className="text-ink-span hover:text-ink-heading transition-colors">
                  Sandbox Linux
                </a>
              </li>
              <li>
                <a href="/leaderboard" className="text-ink-span hover:text-ink-heading transition-colors">
                  Leaderboard
                </a>
              </li>
              <li>
                <a href="/verify/check" className="text-ink-span hover:text-ink-heading transition-colors">
                  Certificados
                </a>
              </li>
            </ul>
          </div>

          {/* Acesso */}
          <div>
            <h4 className="text-body-sm font-mono font-bold uppercase tracking-wider text-ink-heading mb-4">
              Acesso
            </h4>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                {/* Sprint 6 (D2 do QA) — o cadastro do rodapé ganha o
                    tratamento das demais superfícies de conta (botão com
                    borda da marca, como o secundário do Staff), não um
                    link de texto perdido entre os links comuns */}
                <TrackedLink href="/register" ctaId="footer_register" event="nav_cta" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 -ml-3.5 rounded-lg border border-brand-purple/50 text-brand-purple-light hover:bg-brand-purple hover:text-white font-semibold transition-colors">
                  Começar grátis agora
                </TrackedLink>
              </li>
              <li>
                <a href="/login" className="text-ink-span hover:text-ink-heading transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="#precos" className="text-ink-span hover:text-ink-heading transition-colors">
                  Planos
                </a>
              </li>
              <li>
                <a href="#faq" className="text-ink-span hover:text-ink-heading transition-colors">
                  Dúvidas (FAQ)
                </a>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Faixa Inferior / Sub-footer */}
      <div className="pt-10 mt-16 border-t border-border-1/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-span">
        <div>
          © 2026 NEXUS CODE. Todos os direitos reservados.
        </div>

        <div className="flex items-center gap-6">
          <a href="/termos" className="hover:text-ink-heading transition-colors">Termos</a>
          <a href="/privacidade" className="hover:text-ink-heading transition-colors">Privacidade</a>
          <a href="#hero" className="text-ink-body hover:text-ink-heading transition-colors flex items-center gap-1">
            Voltar ao topo ↑
          </a>
        </div>
      </div>
    </div>
  </footer>
  </>
);
