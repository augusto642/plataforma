{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import Image from 'next/image';
import { PlanInterestCountNote } from './PlanInterestCountNote';
import { TrackedLink } from './TrackedLink';
// B52/P5 (Sprint 16) — a âncora de preço do hero lê da fonte única
// de preços (pricing-data.ts), a mesma do card e do JSON-LD.
import { PLAN_PRICES, formatBRL } from './pricing-data';

// Central 216 retrabalho (D1) — hero rebuild para o protótipo Stitch
// v2 (home-desktop.html / home-mobile.html): H1 Inter 56px/64px/800
// "Aprenda a programar de verdade, jogando." (antes Space Grotesk
// 60px/900 com outro texto), chip "Código real no navegador, sem
// videoaulas passivas", CTAs "Começar grátis agora" (→ cadastro) +
// "Ver prévia do jogo" (→ prólogo jogável), stats "4 Linguagens no
// sandbox · 100% Prática no browser · Zero Configuração local"
// (ressalva: a contagem do hero exclui o Portugol) e, à direita, o
// card do editor `fase-03_desafio-arrays.js` com a bolha da tutora.
// Os valores do mock (XP, liga, streak) NÃO entram: o card é uma
// demonstração rotulada como tal, sem número de aluno — dado real
// ou omitido, nunca fixo. Mobile: H1 em 32px (text-display-lg-mobile).
export const HeroSection: React.FC = () => (
  <>
    <section id="hero" className="relative z-10 pt-10 sm:pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <style>{`
      @keyframes heroRise {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hero-rise {
        opacity: 0;
        animation: heroRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-rise { opacity: 1; animation: none; }
      }
    `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-5 text-left">
          <div className="hero-rise inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-surface-container border border-border-subtle text-dark-on-surface text-xs font-code font-bold mb-6" style={{ animationDelay: '0ms' }}>
            <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
            <span>Código real no navegador, sem videoaulas passivas</span>
          </div>

          <h1 className="hero-rise font-display text-display-lg-mobile sm:text-display-lg text-white mb-6" style={{ animationDelay: '90ms' }}>
            Aprenda a programar de verdade, <span className="text-brand-purple">jogando.</span>
          </h1>

          <p className="hero-rise font-sans text-base sm:text-lg text-ink-body leading-relaxed mb-4 max-w-xl" style={{ animationDelay: '180ms' }}>
            Do zero absoluto até o nível pleno. Domine algoritmos, lógica e arquitetura resolvendo desafios práticos em um jogo de trilha guiado pela sua tutora de IA.
            Você avança numa <strong className="text-ink-heading">trilha de RPG sugerida pela IA para você</strong>, com base no seu nível e nos seus objetivos.
          </p>

          <p className="hero-rise text-sm text-ink-span font-sans mb-8" style={{ animationDelay: '240ms' }}>
            Nossa <strong className="text-brand-purple-light">tutora de IA</strong> acompanha você em cada exercício: em vez de entregar a resposta, ela faz a pergunta certa e libera dicas em 3 níveis. A resposta pronta, nunca — quem resolve é você.
          </p>

          <div className="hero-rise flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-4" style={{ animationDelay: '300ms' }}>
            <TrackedLink
              href="/register"
              ctaId="hero_primary"
              event="hero_cta"
              className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded bg-brand-purple hover:bg-brand-purple-dark text-white text-sm sm:text-base font-heading font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-purple/30 cursor-pointer"
            >
              <span>Começar grátis agora</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200 font-bold">→</span>
            </TrackedLink>

            <TrackedLink
              href="/onboarding"
              ctaId="hero_game_preview"
              event="hero_cta"
              className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded bg-transparent hover:bg-surface-2 border border-border-2 hover:border-border-brand text-ink-heading font-heading font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🎮 Ver prévia do jogo</span>
            </TrackedLink>
          </div>

          <p className="hero-rise text-xs font-mono text-ink-span mb-8" style={{ animationDelay: '380ms' }}>
            Lista de interessados do Pro aberta · Pro por {formatBRL(PLAN_PRICES.pro.monthly!)}/mês · grátis para começar, sem cartão
            <PlanInterestCountNote />
          </p>

          {/* Prova social do protótipo (sem número inventado de aluno). */}
          <div className="hero-rise grid grid-cols-3 gap-4 max-w-lg" style={{ animationDelay: '440ms' }}>
            <div>
              <p className="text-2xl font-display font-extrabold text-white">4</p>
              <p className="text-xs font-mono text-ink-span mt-1">Linguagens no sandbox</p>
            </div>
            <div>
              <p className="text-2xl font-display font-extrabold text-white">100%</p>
              <p className="text-xs font-mono text-ink-span mt-1">Prática no browser</p>
            </div>
            <div>
              <p className="text-2xl font-display font-extrabold text-white">Zero</p>
              <p className="text-xs font-mono text-ink-span mt-1">Configuração local</p>
            </div>
          </div>
          <p className="hero-rise text-xs font-mono text-ink-span mt-4" style={{ animationDelay: '480ms' }}>
            Execução real do seu código em sandbox isolado
          </p>
        </div>

        {/* COLUNA DIREITA: card do editor (demonstração do protótipo). */}
        <div className="lg:col-span-7 w-full">
          <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <span className="font-code text-xs text-dark-on-surface-variant flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-rose inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-brand-amber inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
                <span className="ml-2">fase-03_desafio-arrays.js</span>
              </span>
              <span className="font-code text-[11px] text-dark-on-surface-variant uppercase tracking-wider">
                Demonstração
              </span>
            </div>
            <pre className="px-4 py-4 overflow-x-auto font-code text-code-sm text-dark-on-surface leading-relaxed">
              <code>
{`function calcularPontuacao(desafios) {
  // Filtra desafios concluídos com sucesso
  const concluidos = desafios
    .filter(d => d.status === 'PASSED');
  return concluidos
    .reduce((acc, d) => acc + d.xp, 0);
}`}
              </code>
            </pre>
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-dark-surface-container border border-border-subtle p-3 flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-purple/20 text-dark-primary font-code text-xs font-bold">
                  IA
                </span>
                <p className="text-sm text-dark-on-surface leading-relaxed">
                  <span className="font-bold text-white">Tutora de IA: </span>
                  &ldquo;Excelente uso do .reduce()! Sua solução tem complexidade O(n) e
                  seu código ficou limpo e expressivo.&rdquo;
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <TrackedLink
                  href="/onboarding"
                  ctaId="hero_editor_cta"
                  event="hero_cta"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-secondary text-black text-sm font-bold transition-colors hover:brightness-110"
                >
                  Avançar no Mapa
                  <span>→</span>
                </TrackedLink>
                <span className="text-xs font-mono text-ink-span">
                  Exemplo de desafio — seu progresso aparece aqui quando você joga.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B68 (Sprint 18 · Volta 3 · Designer M1) — O PRODUTO REAL no
          primeiro viewport: a captura da Missão 1 — a MESMA tela real
          que abre a demonstração — fecha o hero, no tamanho nativo
          (768×500, sem upscale, padrão B52), rotulada como o que é:
          tela de verdade. */}
      <figure className="mt-14 rounded-2xl bg-surface-1 border border-border-2 overflow-hidden w-full max-w-[768px] mx-auto">
        <Image
          src="/landing/produto-missao-1.webp"
          alt="Tela real da Nexus Code: batalha da Missão 1 contra o SyntaxBug número 404, com o starter Pythox, barras de HP, registro da batalha e os botões de habilidade que pedem código"
          width={768}
          height={500}
          className="w-full h-auto"
          loading="lazy"
        />
        <figcaption className="px-5 py-3.5 border-t border-border-2 text-body-sm font-mono text-ink-span">
          Tela real da plataforma: a Missão 1 do prólogo — você batalha escrevendo código, antes mesmo de criar a conta.
        </figcaption>
      </figure>
    </section>
  </>
);
