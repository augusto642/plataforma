{/* Retrabalho Central 213 (D3) — a seção de passos do design v2 não
    existia em nenhuma tela: o mockup (nexus-home-desktop-v2.html,
    "COMO FUNCIONA", id="como-funciona") traz os 3 passos e o prompt
    v2 traz os textos exatos (correções 2, 5 e 7). Ordem no mockup:
    hero → como funciona → trilhas; aqui ela entra logo depois do
    HeroSection. Textos copiados do mockup/prompt — nada inventado:
    - passo 01: título e texto exatos do prompt (correções 2 e 7);
    - passo 02: texto do mockup mobile com a correção 5 aplicada
      ("ligas competitivas toda semana" → "Ligas competitivas e
      ranking semanal");
    - passo 03: título e texto exatos do mockup desktop.
    Server Component, nos mesmos tokens da MethodologySection. */}
import React from 'react';

export const HowItWorksSection: React.FC = () => (
  <>
  {/* 2. COMO FUNCIONA (3 PASSOS) — seção do mockup v2 */}
  <section id="como-funciona" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="text-center max-w-2xl mx-auto mb-16">
      <span className="font-mono text-xs text-brand-purple-light uppercase tracking-widest font-bold block mb-2">
        Metodologia prática
      </span>
      <h2 className="text-3xl sm:text-5xl font-heading font-black text-ink-heading tracking-tight mb-4">
        Como você aprende de verdade
      </h2>
      <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
        Chega de passar horas travado em videoaulas teóricas. Na Nexus Code você constrói memória muscular de dev desde o primeiro minuto.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* PASSO 01 */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-purple"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-purple-light mb-5">
            01
          </div>
          <span className="font-mono text-xs text-brand-purple-light font-bold block mb-1">PASSO 01</span>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Sua trilha, sugerida pela IA</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Responda sobre seu nível e seus objetivos e a IA investiga seu perfil, o mercado e as vagas para sugerir a trilha ideal — em até 2 dias. E você já começa na hora: a trilha inicial e os desafios ficam liberados no cadastro.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-purple-light">
          ✔ Trilha estruturada para o seu nível
        </div>
      </div>

      {/* PASSO 02 */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-cyan-neon"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-cyan-neon mb-5">
            02
          </div>
          <span className="font-mono text-xs text-brand-cyan-neon font-bold block mb-1">PASSO 02</span>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Aprenda jogando</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Fases com código real, XP por acerto, streaks diários e Ligas competitivas e ranking semanal.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-cyan-neon">
          ✔ XP, streaks e ranking semanal
        </div>
      </div>

      {/* PASSO 03 */}
      <div className="p-7 rounded-2xl bg-surface-1 border border-border-2 relative flex flex-col justify-between">
        <div className="top-laser-beam bg-brand-green-neon"></div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-background border border-border-2 flex items-center justify-center font-mono font-bold text-lg text-brand-green-neon mb-5">
            03
          </div>
          <span className="font-mono text-xs text-brand-green-neon font-bold block mb-1">PASSO 03</span>
          <h3 className="text-lg font-heading font-bold text-ink-heading mb-2.5">Conquiste a vaga</h3>
          <p className="text-body-sm sm:text-sm text-ink-body leading-relaxed font-sans">
            Com projetos concretos no portfólio, treino no simulador de entrevista e seu certificado verificado, você se conecta a empresas no Talent Match.
          </p>
        </div>
        <div className="mt-5 pt-3 border-t border-border-2 text-body-sm font-mono text-brand-green-neon">
          ✔ Conexão direta com recrutadores
        </div>
      </div>
    </div>
  </section>
  </>
);
