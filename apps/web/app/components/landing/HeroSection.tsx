{/* Sprint 10 · B34 — fatiado do antigo page.tsx monolítico ('use client' integral, 1.767 linhas): esta seção é Server Component; o estado interativo vive nas ilhas client. */}
import React from 'react';
import { TrackedLink } from './TrackedLink';

// Central 216 retrabalho (D1) — hero rebuild para o protótipo Stitch
// v2 (home-desktop.html / home-mobile.html): H1 Inter 56px/64px/800
// "Aprenda a programar de verdade, jogando." (antes Space Grotesk
// 60px/900 com outro texto), chip "Código real no navegador, sem
// videoaulas passivas", CTAs "Começar grátis agora" (→ cadastro) +
// "Ver prévia do jogo" (→ prólogo jogável), stats "4 Linguagens no
// sandbox · 100% Prática no browser · Zero Configuração local"
// (ressalva: a contagem do hero exclui o Portugol).
// Central 218 (D1) — o card do editor volta a ser o do protótipo:
// 2 colunas — código + terminal à esquerda, painel da tutora à
// direita ("Tutora de IA / ao vivo", quote, "Avançar no Mapa"). Os
// números do mock (Liga Prata 780/1.000 XP, +150 XP em jogo, Nível
// 04) NÃO entram: são dados de aluno inventados (A3) — o painel
// mostra dados reais quando existirem ou omite o elemento, nunca
// um número fixo. O bloco de testes (3/3 aprovados, 42ms, DESAFIO
// VENCIDO!) fica: é a saída da demonstração, não dado de aluno.
// Saíram o 2º parágrafo sobre a tutora, a linha da lista de
// interessados ("0 pessoas na lista...") e a captura da Missão 1
// que fechava o hero — nenhum existe no protótipo.
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
        <div className="lg:col-span-6 text-left">
          <div className="hero-rise inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-surface-container border border-border-subtle text-dark-on-surface text-xs font-code font-bold mb-6" style={{ animationDelay: '0ms' }}>
            <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
            <span>Código real no navegador, sem videoaulas passivas</span>
          </div>

          <h1 className="hero-rise font-display text-display-lg-mobile sm:text-display-lg text-white mb-6" style={{ animationDelay: '90ms' }}>
            Aprenda a programar de verdade, <span className="text-brand-purple">jogando.</span>
          </h1>

          <p className="hero-rise font-sans text-base sm:text-lg text-ink-body leading-relaxed mb-8 max-w-xl" style={{ animationDelay: '180ms' }}>
            Do zero absoluto até o nível pleno. Domine algoritmos, lógica e arquitetura resolvendo desafios práticos em um jogo de trilha guiado pela sua tutora de IA.
            Você avança numa <strong className="text-ink-heading">trilha de RPG sugerida pela IA para você</strong>, com base no seu nível e nos seus objetivos.
          </p>

          <div className="hero-rise flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-10" style={{ animationDelay: '300ms' }}>
            <TrackedLink
              href="/register"
              ctaId="hero_primary"
              event="hero_cta"
              className="group inline-flex items-center justify-center gap-3 px-7 py-4 rounded bg-brand-purple hover:bg-brand-purple-dark text-white text-sm sm:text-base font-heading font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-purple/30 cursor-pointer whitespace-nowrap"
            >
              <span>Começar grátis agora</span>
              <span className="group-hover:translate-x-1.5 transition-transform duration-200 font-bold">→</span>
            </TrackedLink>

            <TrackedLink
              href="/onboarding"
              ctaId="hero_game_preview"
              event="hero_cta"
              className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded bg-transparent hover:bg-surface-2 border border-border-2 hover:border-border-brand text-ink-heading font-heading font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <span>🎮 Ver prévia do jogo</span>
            </TrackedLink>
          </div>

          {/* Prova social do protótipo (sem número inventado de aluno). */}
          <div className="hero-rise grid grid-cols-3 gap-4 pt-6 border-t border-border-subtle w-full max-w-lg" style={{ animationDelay: '440ms' }}>
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
        </div>

        {/* COLUNA DIREITA: card do editor em 2 colunas (demonstração
            do protótipo). À esquerda, código + saída dos testes; à
            direita, o painel da tutora. Sem XP, liga ou nível: não
            há aluno logado na home pública e os valores do mock são
            inventados (A3). */}
        <div className="lg:col-span-6 w-full">
          <div className="rounded-xl bg-dark-surface-container-low border border-border-subtle shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-dark-surface-container-high border-b border-border-subtle">
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

            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
              {/* Código + terminal */}
              <div className="md:col-span-7 p-4 bg-[#0A0B10] font-code text-code-sm text-dark-on-surface">
                <div className="flex gap-4">
                  <div className="text-dark-on-surface-variant/40 select-none text-right font-code text-xs leading-6 space-y-1">
                    <div>01</div>
                    <div>02</div>
                    <div>03</div>
                    <div>04</div>
                    <div>05</div>
                    <div>06</div>
                    <div>07</div>
                    <div>08</div>
                    <div>09</div>
                  </div>
                  <div className="leading-6 space-y-1 overflow-x-auto text-xs">
                    <div><span className="text-brand-purple font-semibold">function</span> <span className="text-brand-cyan-neon">calcularPontuacao</span>(desafios) {'{'}</div>
                    <div className="pl-4"><span className="text-dark-on-surface-variant">{'// Filtra desafios concluídos com sucesso'}</span></div>
                    <div className="pl-4"><span className="text-brand-purple">const</span> concluidos = desafios.<span className="text-yellow-400">filter</span>(d =&gt; d.status === <span className="text-secondary">&#39;PASSED&#39;</span>);</div>
                    <div className="pl-4"><span className="text-brand-purple">return</span> concluidos.<span className="text-yellow-400">reduce</span>((acc, d) =&gt; {'{'}</div>
                    <div className="pl-8"><span className="text-brand-purple">return</span> acc + d.xp;</div>
                    <div className="pl-4">{'}'}, <span className="text-purple-300">0</span>);</div>
                    <div>{'}'}</div>
                    <div></div>
                    <div><span className="text-secondary font-semibold">test</span>(<span className="text-emerald-300">&#39;Retorna soma correta de XP&#39;</span>);</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <div className="flex items-center justify-between text-[11px] font-code text-dark-on-surface-variant mb-1.5">
                    <span className="flex items-center gap-1.5 text-secondary">
                      <span>✓</span>
                      Testes unitários: 3/3 aprovados
                    </span>
                    <span className="text-dark-on-surface-variant">execução: 42ms</span>
                  </div>
                  <div className="bg-dark-surface-container p-2.5 rounded font-code text-[11px] text-emerald-400 border border-emerald-500/20">
                    ✓ calcularPontuacao([d1, d2]) === 350 XP<br />
                    <span className="text-dark-on-surface-variant">Status da missão:</span> <span className="text-white font-bold">DESAFIO VENCIDO!</span>
                  </div>
                </div>
              </div>

              {/* Painel lateral: tutora ao vivo */}
              <div className="md:col-span-5 p-4 bg-dark-surface-container-low flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple/20 text-dark-primary font-code text-xs font-bold">
                      IA
                    </span>
                    <span className="font-sans text-xs font-semibold text-white">Tutora de IA</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-purple/20 text-dark-primary font-code ml-auto">ao vivo</span>
                  </div>

                  <p className="p-3 rounded bg-dark-surface-container border border-border-subtle text-xs text-dark-on-surface-variant mb-4 leading-relaxed">
                    &ldquo;Excelente uso do <code className="text-yellow-300">.reduce()</code>! Sua solução tem complexidade O(n) e seu código ficou limpo e expressivo. Pronto para o próximo boss?&rdquo;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <TrackedLink
                    href="/onboarding"
                    ctaId="hero_editor_cta"
                    event="hero_cta"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary hover:brightness-110 text-black font-sans text-xs font-bold rounded transition-colors"
                  >
                    <span>Avançar no Mapa</span>
                    <span>→</span>
                  </TrackedLink>
                  <p className="mt-3 text-[11px] font-mono text-ink-span">
                    Exemplo de desafio — seu progresso aparece aqui quando você joga.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </>
);
