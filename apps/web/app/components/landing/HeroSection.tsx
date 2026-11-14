import React from 'react';
import Image from 'next/image';
import { MaterialIcon } from '../MaterialIcon';
import { TrackedLink } from './TrackedLink';

export const HeroSection: React.FC = () => (
  <section
    id="hero"
    className="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden border-b border-border-subtle code-grid bg-dark-surface"
  >
    {/* Ambient Glow Cibernético */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-primary/18 via-secondary/8 to-transparent blur-[120px] pointer-events-none -z-0" />

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-6 flex flex-col items-start">
          {/* Dev Status Chip */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-dark-surface-container-low border border-primary/40 shadow-[0_0_15px_rgba(130,87,229,0.2)] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="font-code text-code-sm text-dark-on-surface font-semibold tracking-wide">
              TEMPORADA 2026 // APRENDA PROGRAMANDO NA PRÁTICA
            </span>
          </div>

          <h1 className="font-headline text-display-lg-mobile md:text-display-lg text-white font-extrabold tracking-tight mb-6 leading-[1.08]">
            Aprenda a programar de verdade,{' '}
            <span className="bg-gradient-to-r from-primary via-[#A379FF] to-secondary bg-clip-text text-transparent underline decoration-primary/40 underline-offset-8">
              jogando.
            </span>
          </h1>

          <p className="font-body text-body-lg text-dark-on-surface-variant max-w-xl mb-8 leading-relaxed">
            Do zero absoluto até o nível pleno. Domine algoritmos, lógica e arquitetura distribuída resolvendo
            desafios reais em um jogo de trilha guiado pela sua tutora socrática de IA.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10">
            <TrackedLink
              href="/register"
              ctaId="hero_primary"
              event="hero_cta"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary to-[#632cd6] hover:from-[#996DFF] hover:to-primary text-white font-label text-label-lg font-bold rounded-xl transition-all duration-300 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
            >
              <span>Começar grátis agora</span>
              <MaterialIcon name="rocket_launch" className="text-[20px]" />
            </TrackedLink>

            <TrackedLink
              href="/onboarding"
              ctaId="hero_game_preview"
              event="hero_cta"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-dark-surface-container border border-border-strong hover:border-secondary/60 text-dark-on-surface hover:text-white font-label text-label-md font-semibold rounded-xl transition-all hover:bg-dark-surface-container-high whitespace-nowrap cursor-pointer"
            >
              <MaterialIcon name="sports_esports" className="text-secondary text-[20px]" />
              <span>Ver prévia do jogo</span>
            </TrackedLink>
          </div>

          {/* Proof Points */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border-subtle w-full max-w-lg">
            <div>
              <span className="font-code text-headline-sm font-bold text-white block tabular-nums">
                4+
              </span>
              <span className="text-body-sm text-dark-on-surface-variant">
                Linguagens no sandbox
              </span>
            </div>
            <div>
              <span className="font-code text-headline-sm font-bold text-secondary block tabular-nums">
                100%
              </span>
              <span className="text-body-sm text-dark-on-surface-variant">
                Prática no browser
              </span>
            </div>
            <div>
              <span className="font-code text-headline-sm font-bold text-tertiary block tabular-nums">
                Zero
              </span>
              <span className="text-body-sm text-dark-on-surface-variant">
                Instalação local
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Editor / Game Trail Preview */}
        <div className="lg:col-span-6 w-full">
          <div className="relative rounded-lg bg-dark-surface-container-low border border-border-strong shadow-2xl overflow-hidden">
            {/* Editor Top Chrome */}
            <div className="bg-dark-surface-container-high px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]/80 shrink-0" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80 shrink-0" />
                <div className="w-3 h-3 rounded-full bg-[#10B981]/80 shrink-0" />
                <span className="ml-2 font-code text-code-sm text-dark-on-surface-variant truncate">
                  fase-03_desafio-arrays.js
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/10 border border-secondary/25 text-secondary font-code text-[11px] whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  +150 XP em jogo
                </span>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-dark-primary font-code text-[11px] whitespace-nowrap">
                  Nível 03
                </span>
              </div>
            </div>

            {/* Split Pane: Code Editor + Game Mission */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
              {/* Code Area */}
              <div className="md:col-span-7 p-4 bg-[#0A0B10] font-code text-code-sm text-dark-on-surface">
                <div className="flex gap-4">
                  <div
                    aria-hidden="true"
                    className="text-dark-on-surface-variant/40 select-none text-right font-code text-xs leading-6 space-y-1"
                  >
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
                    <div>
                      <span className="text-primary font-semibold">function</span>{' '}
                      <span className="text-tertiary">calcularPontuacao</span>(desafios) &#123;
                    </div>
                    <div className="pl-4">
                      <span className="text-dark-on-surface-variant">
                        {`// Filtra desafios concluídos com sucesso`}
                      </span>
                    </div>
                    <div className="pl-4">
                      <span className="text-primary">const</span> concluidos = desafios.
                      <span className="text-yellow-400">filter</span>(d =&gt; d.status ==={' '}
                      <span className="text-secondary">&apos;PASSED&apos;</span>);
                    </div>
                    <div className="pl-4">
                      <span className="text-primary">return</span> concluidos.
                      <span className="text-yellow-400">reduce</span>((acc, d) =&gt; &#123;
                    </div>
                    <div className="pl-8">
                      <span className="text-primary">return</span> acc + d.xp;
                    </div>
                    <div className="pl-4">
                      &#125;, <span className="text-purple-300">0</span>);
                    </div>
                    <div>&#125;</div>
                    <div aria-hidden="true">&nbsp;</div>
                    <div>
                      <span className="text-secondary font-semibold">test</span>(
                      <span className="text-emerald-300">
                        &apos;Retorna soma correta de XP&apos;
                      </span>
                      );
                    </div>
                  </div>
                </div>

                {/* Integrated Mini Terminal Output */}
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <div className="flex items-center justify-between text-[11px] font-code text-dark-on-surface-variant mb-1.5">
                    <span className="flex items-center gap-1.5 text-secondary">
                      <MaterialIcon name="check_circle" className="text-[14px]" />
                      Testes unitários: 3/3 aprovados
                    </span>
                    <span className="text-dark-on-surface-variant">execução: 38ms</span>
                  </div>
                  <div className="bg-dark-surface-container p-2.5 rounded-sm font-code text-[11px] text-emerald-400 border border-emerald-500/20">
                    ✓ calcularPontuacao([d1, d2]) === 350 XP
                    <br />
                    <span className="text-dark-on-surface-variant">Status da missão:</span>{' '}
                    <span className="text-white font-bold">DESAFIO VENCIDO!</span>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: IA Tutor & Mission Status */}
              <div className="md:col-span-5 p-4 bg-dark-surface-container-low flex flex-col justify-between">
                <div>
                  {/* AI Tutor Feedback Box */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="relative shrink-0">
                      <Image
                        src="/images/stitch/tutor-cat.png"
                        alt="Tutora de IA"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded object-cover border border-primary/50 shadow-[0_0_10px_rgba(130,87,229,0.3)]"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary border border-dark-surface" />
                    </div>
                    <span className="font-label text-label-sm text-white font-bold">
                      Tutora de IA
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-dark-primary font-code ml-auto">
                      ao vivo
                    </span>
                  </div>

                  <div className="p-3 rounded bg-dark-surface-container border border-border-subtle text-dark-on-surface-variant mb-4 text-xs leading-relaxed">
                    &ldquo;Excelente uso do <code className="text-yellow-300">.reduce()</code>! Sua
                    solução tem complexidade O(n) e seu código ficou limpo e expressivo. Pronto para
                    o próximo boss?&rdquo;
                  </div>

                  {/* XP Progress in Level */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-code">
                      <span className="text-dark-on-surface-variant">Progresso da Liga Prata</span>
                      <span className="text-white font-bold">780 / 1.000 XP</span>
                    </div>
                    <div className="w-full h-2 bg-dark-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: '78%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Next button simulator */}
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <TrackedLink
                    href="/onboarding"
                    ctaId="hero_advance_map"
                    event="hero_cta"
                    className="w-full py-2 px-3 bg-secondary hover:bg-emerald-400 text-black font-label text-label-sm font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Avançar no Mapa</span>
                    <MaterialIcon name="chevron_right" className="text-[16px]" />
                  </TrackedLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
