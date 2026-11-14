import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

export const HowItWorksSection: React.FC = () => (
  <section id="como-funciona" className="py-24 border-b border-border-subtle bg-dark-surface">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-code text-code-sm text-primary uppercase tracking-widest font-semibold block mb-2">
          Metodologia prática
        </span>
        <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg font-bold text-white tracking-tight mb-4">
          Como você aprende de verdade
        </h2>
        <p className="font-body text-body-lg text-dark-on-surface-variant">
          Chega de passar horas travado em videoaulas teóricas. Na Nexus Code você constrói memória
          muscular de dev desde o primeiro minuto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Step 1 */}
        <div className="bg-dark-surface-container-low border border-border-subtle rounded-lg p-8 relative flex flex-col justify-between hover:border-border-strong transition-all duration-state-change">
          <div>
            <div className="w-12 h-12 rounded bg-primary/10 border border-primary/30 text-primary flex items-center justify-center mb-6">
              <MaterialIcon name="account_tree" className="text-[26px]" />
            </div>
            <span className="font-code text-code-sm text-primary font-bold block mb-1">
              PASSO 01
            </span>
            <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
              Sua trilha, sugerida pela IA
            </h3>
            <p className="font-body text-body-md text-dark-on-surface-variant leading-relaxed">
              Escolha entre as trilhas Iniciante, Júnior e Pleno, cada uma com conteúdo progressivo,
              projetos práticos e desafios em formato de jogo.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-border-subtle flex items-center gap-2 text-dark-on-surface-variant text-body-sm font-code">
            <MaterialIcon name="verified" className="text-secondary text-[18px]" />
            <span>Trilha estruturada para o seu nível</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-dark-surface-container-low border border-border-subtle rounded-lg p-8 relative flex flex-col justify-between hover:border-primary/50 transition-all duration-state-change">
          <div>
            <div className="w-12 h-12 rounded bg-secondary/10 border border-secondary/30 text-secondary flex items-center justify-center mb-6">
              <MaterialIcon name="sports_esports" className="text-[26px]" />
            </div>
            <span className="font-code text-code-sm text-secondary font-bold block mb-1">
              PASSO 02
            </span>
            <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
              Aprenda jogando
            </h3>
            <p className="font-body text-body-md text-dark-on-surface-variant leading-relaxed">
              Avance por fases, derrote bugs reais e suba nas ligas semanais. Cada linha de código
              roda em testes automáticos no seu próprio navegador.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-border-subtle flex items-center gap-2 text-dark-on-surface-variant text-body-sm font-code">
            <MaterialIcon name="bolt" className="text-secondary text-[18px]" />
            <span>XP, streaks e ranking semanal</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-dark-surface-container-low border border-border-subtle rounded-lg p-8 relative flex flex-col justify-between hover:border-border-strong transition-all duration-state-change">
          <div>
            <div className="w-12 h-12 rounded bg-tertiary/10 border border-tertiary/30 text-tertiary flex items-center justify-center mb-6">
              <MaterialIcon name="workspace_premium" className="text-[26px]" />
            </div>
            <span className="font-code text-code-sm text-tertiary font-bold block mb-1">
              PASSO 03
            </span>
            <h3 className="font-headline text-headline-sm text-white font-bold mb-3">
              Conquiste a vaga
            </h3>
            <p className="font-body text-body-md text-dark-on-surface-variant leading-relaxed">
              Com projetos concretos no portfólio, treino no simulador de entrevista e seu
              certificado verificado, você se conecta a empresas no Talent Match.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-border-subtle flex items-center gap-2 text-dark-on-surface-variant text-body-sm font-code">
            <MaterialIcon name="handshake" className="text-secondary text-[18px]" />
            <span>Conexão direta com recrutadores</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
