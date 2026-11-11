import React from 'react';
import Link from 'next/link';
import { MaterialIcon } from '../MaterialIcon';

// Central 216 retrabalho (D1) — seção "Gamificação de verdade" do
// protótipo Stitch v2 (home-desktop.html): Mapa da Trilha, Liga,
// Streak e Badges. Sem números de aluno (não há aluno logado na
// home pública e os valores do mock — "12/18", "Liga Diamante #12",
// "Streak 14 dias", "28 Conquistas" — são inventados): a seção
// descreve o sistema — tiers reais Bronze, Prata e Ouro — e cada
// card leva à ação real (cadastro / desafios / ligas).
// Central 218 (D1) — o rebuild troca os 4 cards genéricos pela
// estrutura do protótipo: mapa da trilha (fases 01–04) + ranking.
// O mapa é um EXEMPLO rotulado como tal (o mapa real, com o
// progresso do aluno, aparece no painel dele); o XP por fase é a
// regra do jogo, não dado de aluno. O ranking não tem linhas
// inventadas ("Lucas F. 4.820 XP" etc.): mostra as ligas reais e o
// estado vazio honesto. Sem "Liga Diamante" (não existe) e sem
// streak/badges com número fixo.
const MAP_PHASES = [
  {
    n: '01',
    state: 'concluida' as const,
    stateLabel: 'FASE CONCLUÍDA • 3 ESTRELAS',
    // Central 219 (D4 residual) — variante curta SÓ para o mobile
    // (<640px): o rótulo completo a 11px precisa de ~179px e o
    // container do selo no mobile 390px tem ~131px, por isso o selo
    // ocupava 2 linhas mesmo com o NBSP. A variante curta a 10px
    // precisa de 22 × 6,0px = 132px e cabe no container alargado
    // (p-3 + gap-2 no mobile). O desktop mantém o texto literal do
    // protótipo (hidden sm:inline). O NBSP entre "3" e "ESTRELAS"
    // é \u00a0 explícito — nunca quebrar "3 ESTRELAS" ao meio.
    stateLabelShort: 'CONCLUÍDA • 3 ESTRELAS',
    title: 'O Desafio das Variáveis Mágicas',
    xp: '+200 XP',
  },
  {
    n: '02',
    state: 'concluida' as const,
    stateLabel: 'FASE CONCLUÍDA • 3 ESTRELAS',
    stateLabelShort: 'CONCLUÍDA • 3 ESTRELAS',
    title: 'Portas Lógicas e Condicionais IF/ELSE',
    xp: '+250 XP',
  },
  {
    n: '03',
    state: 'atual' as const,
    stateLabel: 'FASE ATUAL • DESAFIO DE CÓDIGO',
    // "FASE ATUAL • DESAFIO DE CÓDIGO" a 10px precisa de ~180px e
    // também ocuparia 2 linhas no mobile — mesma variante curta.
    stateLabelShort: 'ATUAL • DESAFIO',
    title: 'O Guardião dos Loops e Arrays',
    xp: '+450 XP',
  },
  {
    n: '04',
    state: 'bloqueada' as const,
    stateLabel: 'BLOQUEADO',
    stateLabelShort: 'BLOQUEADO',
    title: 'Recursão e Árvores de Decisão',
    xp: '+600 XP',
  },
];

export const GamificationSection: React.FC = () => (
  <section id="o-jogo" className="relative z-10 py-24 px-6 sm:px-8 max-w-7xl mx-auto border-t border-border-2/70">
    <div className="text-center max-w-2xl mx-auto mb-16">
      <span className="font-mono text-xs text-brand-cyan-neon uppercase tracking-widest font-bold block mb-2">
        Gamificação de verdade
      </span>
      <h2 className="text-3xl sm:text-4xl sm:leading-[44px] font-heading font-bold text-ink-heading tracking-tight mb-4">
        Aprender programando vicia quando parece um RPG
      </h2>
      <p className="text-base sm:text-lg text-ink-body leading-relaxed font-sans">
        Você não estuda por obrigação. Cada linha de código correta acumula XP, desbloqueia novas fases e coloca você nas melhores divisões de desenvolvedores.
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
      {/* Mapa da trilha — exemplo do protótipo */}
      <div className="lg:col-span-7 bg-dark-surface-container-low border border-border-subtle rounded-xl p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/40 text-dark-primary">
              <MaterialIcon name="map" className="text-[22px]" />
            </span>
            <div>
              <h3 className="font-headline font-bold text-white text-lg">Mapa da Trilha: Reino dos Algoritmos</h3>
              <p className="text-body-sm text-ink-span font-mono">Mundo 2 • Capítulo: Estruturas Dinâmicas</p>
            </div>
          </div>
          <span className="shrink-0 px-3 py-1 bg-surface-2 border border-border-1 text-ink-span font-mono text-xs rounded-full font-bold">
            Exemplo
          </span>
        </div>

        <div className="relative py-2 space-y-6">
          {MAP_PHASES.map((phase, i) => (
            <div key={phase.n}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-12 h-12 shrink-0 rounded-full border-2 flex items-center justify-center font-code font-bold ${
                    phase.state === 'concluida'
                      ? 'bg-secondary/20 border-secondary text-secondary'
                      : phase.state === 'atual'
                        ? 'bg-brand-purple border-white text-white shadow-lg shadow-brand-purple/40'
                        : 'bg-dark-surface-container-high border-border-strong text-ink-span'
                  }`}
                >
                  {phase.state === 'concluida' ? (
                    <MaterialIcon name="check" className="text-[22px]" />
                  ) : phase.state === 'atual' ? (
                    <MaterialIcon name="swords" className="text-[22px]" />
                  ) : (
                    <MaterialIcon name="lock" className="text-[20px]" />
                  )}
                </div>
                <div
                  className={`flex-1 p-3 sm:p-4 rounded-xl border flex items-center justify-between gap-2 sm:gap-3 ${
                    phase.state === 'atual'
                      ? 'bg-brand-purple/10 border-brand-purple/50'
                      : phase.state === 'bloqueada'
                        ? 'bg-dark-surface-container border-border-subtle opacity-50'
                        : 'bg-dark-surface-container border-border-subtle'
                  }`}
                >
                  <div>
                    <span className={`whitespace-nowrap text-[10px] sm:text-[11px] font-code ${phase.state === 'atual' ? 'text-dark-primary font-bold' : phase.state === 'bloqueada' ? 'text-ink-span' : 'text-secondary'}`}>
                      <span className="sm:hidden">{phase.stateLabelShort}</span>
                      <span className="hidden sm:inline">{phase.stateLabel}</span>
                    </span>
                    <h4 className={`font-headline font-semibold text-body-md ${phase.state === 'bloqueada' ? 'text-ink-span' : 'text-white'}`}>
                      {phase.n}. {phase.title}
                    </h4>
                  </div>
                  <span className={`font-code text-code-sm shrink-0 ${phase.state === 'atual' ? 'px-3 py-1 bg-brand-purple text-white rounded font-bold' : 'text-ink-span'}`}>
                    {phase.xp}
                  </span>
                </div>
              </div>
              {i < MAP_PHASES.length - 1 && (
                <div className={`w-0.5 h-6 ml-6 ${phase.state === 'concluida' ? 'bg-secondary' : phase.state === 'atual' ? 'bg-brand-purple' : 'bg-border-strong'}`} />
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 pt-4 border-t border-border-subtle text-body-sm text-ink-span font-sans leading-relaxed">
          Exemplo de como o mapa funciona: cada fase concluída abre a próxima, e o guardião da fase testa o que você aprendeu. O seu mapa, com o seu progresso real, aparece no seu painel.
        </p>
        <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
          Ver meu mapa
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      {/* Ligas e ranking */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-dark-surface-container-low border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MaterialIcon name="emoji_events" className="text-[22px] text-brand-amber" />
            <h3 className="font-headline font-bold text-white text-lg">Ligas Bronze, Prata e Ouro</h3>
          </div>
          <p className="text-body-sm text-ink-body leading-relaxed mb-4">
            Semanalmente você compete na sua liga — Bronze, Prata ou Ouro, conforme o seu nível. Os primeiros sobem de divisão; o ranking é por nível, nunca uma liga única global.
          </p>
          <p className="text-body-sm text-ink-span leading-relaxed">
            O ranking semanal aparece aqui quando você joga — sem ranking inventado: só alunos reais, com XP real.
          </p>
          <Link href="/leaderboard" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark-primary hover:underline">
            Ver ligas e ranking
            <MaterialIcon name="arrow_forward" className="text-[16px]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-surface-container-low border border-border-subtle p-4 rounded-xl">
            <div className="flex items-center gap-2 text-brand-amber mb-1">
              <MaterialIcon name="local_fire_department" className="text-[20px]" />
              <span className="font-code font-bold text-code-sm">Streak diário</span>
            </div>
            <p className="text-xs text-ink-span leading-relaxed">Constância diária multiplica ganho de XP. Seu streak aparece no painel.</p>
            <Link href="/desafios" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-dark-primary hover:underline">
              Resolver o desafio de hoje
              <MaterialIcon name="arrow_forward" className="text-[14px]" />
            </Link>
          </div>

          <div className="bg-dark-surface-container-low border border-border-subtle p-4 rounded-xl">
            <div className="flex items-center gap-2 text-brand-cyan-neon mb-1">
              <MaterialIcon name="military_tech" className="text-[20px]" />
              <span className="font-code font-bold text-code-sm">Badges Dev</span>
            </div>
            <p className="text-xs text-ink-span leading-relaxed">Conquistas pelo que você realmente fez. Mostre suas medalhas no perfil público.</p>
            <Link href="/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-dark-primary hover:underline">
              Ver meu perfil
              <MaterialIcon name="arrow_forward" className="text-[14px]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);
