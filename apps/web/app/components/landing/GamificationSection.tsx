import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

const MAP_PHASES = [
  {
    n: '01',
    state: 'concluida' as const,
    stateLabel: 'FASE CONCLUÍDA • 3\u00a0ESTRELAS',
    stateLabelShort: 'CONCLUÍDA • 3\u00a0ESTRELAS',
    title: '01. O Desafio das Variáveis Mágicas',
    xp: '+200 XP',
    connectorClass: 'w-0.5 h-6 bg-secondary ml-6',
  },
  {
    n: '02',
    state: 'concluida' as const,
    stateLabel: 'FASE CONCLUÍDA • 3\u00a0ESTRELAS',
    stateLabelShort: 'CONCLUÍDA • 3\u00a0ESTRELAS',
    title: '02. Portas Lógicas e Condicionais IF/ELSE',
    xp: '+250 XP',
    connectorClass: 'w-0.5 h-6 bg-primary ml-6 animate-pulse',
  },
  {
    n: '03',
    state: 'atual' as const,
    stateLabel: 'FASE ATUAL • DESAFIO DE CÓDIGO',
    stateLabelShort: 'ATUAL • DESAFIO',
    title: '03. O Guardião dos Loops e Arrays',
    xp: '+450 XP',
    connectorClass: 'w-0.5 h-6 bg-border-strong ml-6',
  },
  {
    n: '04',
    state: 'bloqueada' as const,
    stateLabel: 'BLOQUEADO',
    stateLabelShort: 'BLOQUEADO',
    title: '04. Recursão e Árvores de Decisão',
    xp: '+600 XP',
    connectorClass: null,
  },
];

export const GamificationSection: React.FC = () => (
  <section id="o-jogo" className="py-24 border-b border-border-subtle bg-dark-surface code-grid">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-code text-code-sm text-tertiary uppercase tracking-widest font-semibold block mb-2">
          Gamificação de verdade
        </span>
        <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg font-bold text-white tracking-tight mb-4">
          Aprender programando vicia quando parece um RPG
        </h2>
        <p className="font-body text-body-lg text-dark-on-surface-variant">
          Você não estuda por obrigação. Cada linha de código correta acumula XP, desbloqueia
          novas fases e coloca você nas melhores divisões de desenvolvedores.
        </p>
      </div>

      {/* Game Interface Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-8">
        {/* Trail Path Visualization */}
        <div className="lg:col-span-7 bg-dark-surface-container-low border border-border-strong rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <MaterialIcon name="map" className="text-primary text-[28px]" />
              <div>
                <h3 className="font-headline font-bold text-white text-headline-sm">
                  Mapa da Trilha: Reino dos Algoritmos
                </h3>
                <p className="text-body-sm text-dark-on-surface-variant font-code">
                  Mundo 2 • Capítulo: Estruturas Dinâmicas
                </p>
              </div>
            </div>
            <span className="shrink-0 px-3 py-1 bg-secondary/15 border border-secondary/30 text-secondary font-code text-code-sm rounded-full font-bold whitespace-nowrap">
              2/4 Concluídos
            </span>
          </div>

          {/* Path Nodes Sequence */}
          <div className="relative py-4 space-y-6">
            {MAP_PHASES.map((phase) => (
              <div key={phase.n}>
                <div
                  className={`flex items-center gap-4 ${
                    phase.state === 'bloqueada' ? 'opacity-50' : ''
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-code font-bold shrink-0 ${
                      phase.state === 'concluida'
                        ? 'bg-secondary/20 border-2 border-secondary text-secondary'
                        : phase.state === 'atual'
                          ? 'bg-primary border-2 border-white text-white shadow-lg shadow-primary/40 animate-bounce'
                          : 'bg-dark-surface-container-high border border-border-strong text-dark-on-surface-variant'
                    }`}
                  >
                    <MaterialIcon
                      name={
                        phase.state === 'concluida'
                          ? 'check'
                          : phase.state === 'atual'
                            ? 'swords'
                            : 'lock'
                      }
                      className={phase.state === 'bloqueada' ? 'text-[20px]' : 'text-[22px]'}
                    />
                  </div>

                  <div
                    className={`flex-1 p-4 rounded flex items-center justify-between gap-3 ${
                      phase.state === 'atual'
                        ? 'bg-primary/10 border border-primary/50'
                        : 'bg-dark-surface-container border border-border-subtle'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`text-[10px] sm:text-[11px] font-code block ${
                          phase.state === 'concluida'
                            ? 'text-secondary'
                            : phase.state === 'atual'
                              ? 'text-dark-primary font-bold'
                              : 'text-dark-on-surface-variant'
                        }`}
                      >
                        <span className="sm:hidden">{phase.stateLabelShort}</span>
                        <span className="hidden sm:inline">{phase.stateLabel}</span>
                      </span>
                      <h4
                        className={`font-headline text-body-md truncate ${
                          phase.state === 'concluida'
                            ? 'text-white font-semibold'
                            : phase.state === 'atual'
                              ? 'text-white font-bold'
                              : 'text-dark-on-surface font-medium'
                        }`}
                      >
                        {phase.title}
                      </h4>
                    </div>
                    <span
                      className={
                        phase.state === 'atual'
                          ? 'px-3 py-1 bg-primary text-white font-code text-code-sm rounded font-bold shrink-0'
                          : 'font-code text-code-sm text-dark-on-surface-variant shrink-0'
                      }
                    >
                      {phase.xp}
                    </span>
                  </div>
                </div>

                {phase.connectorClass && <div className={phase.connectorClass} />}
              </div>
            ))}
          </div>
        </div>

        {/* Ligas e Ranking Lateral */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Ranking da Liga */}
          <div className="bg-dark-surface-container-low border border-border-strong rounded-lg p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <MaterialIcon name="emoji_events" className="text-yellow-400 text-[22px]" />
                <h3 className="font-headline font-bold text-white text-body-lg">
                  Liga Prata #2
                </h3>
              </div>
              <span className="text-body-sm font-code text-dark-on-surface-variant">
                Termina em 2d 14h
              </span>
            </div>

            <p className="text-body-sm text-dark-on-surface-variant mb-4">
              Os 10 primeiros sobem para a Liga Mestre no domingo. Ligas reais na plataforma: Bronze,
              Prata e Ouro.
            </p>

            {/* Ranking List */}
            <div className="space-y-2 font-code text-code-sm">
              <div className="flex items-center justify-between p-2.5 rounded bg-dark-surface-container border border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-yellow-400 w-5">#1</span>
                  <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-white">
                    LF
                  </div>
                  <span className="text-white font-medium">Lucas F.</span>
                </div>
                <span className="text-yellow-400 font-bold">4.820 XP</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-primary/15 border border-primary/40">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary w-5">#2</span>
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                    VC
                  </div>
                  <span className="text-white font-bold">Você (Nexus)</span>
                </div>
                <span className="text-white font-bold">4.410 XP</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-dark-surface-container border border-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-dark-on-surface-variant w-5">#3</span>
                  <div className="w-7 h-7 rounded-full bg-dark-surface-container-high flex items-center justify-center text-xs text-dark-on-surface">
                    MS
                  </div>
                  <span className="text-dark-on-surface">Mariana S.</span>
                </div>
                <span className="text-dark-on-surface-variant">4.190 XP</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-dark-surface-container border border-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-dark-on-surface-variant w-5">#4</span>
                  <div className="w-7 h-7 rounded-full bg-dark-surface-container-high flex items-center justify-center text-xs text-dark-on-surface">
                    RO
                  </div>
                  <span className="text-dark-on-surface">Rafael O.</span>
                </div>
                <span className="text-dark-on-surface-variant">3.950 XP</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-body-sm text-secondary font-code">
              <span className="flex items-center gap-1">
                <MaterialIcon name="arrow_upward" className="text-[16px]" />
                Zona de Promoção para Liga Mestre
              </span>
              <span>Top 5%</span>
            </div>
          </div>

          {/* Gamification Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-surface-container-low border border-border-subtle p-4 rounded-lg">
              <div className="flex items-center gap-2 text-warning mb-1">
                <MaterialIcon name="local_fire_department" className="text-[20px]" />
                <span className="font-code font-bold text-code-sm">Streak Ativo</span>
              </div>
              <div className="text-headline-sm font-code font-bold text-white">14 Dias</div>
              <p className="text-[12px] text-dark-on-surface-variant">
                Constância diária multiplica ganho de XP.
              </p>
            </div>

            <div className="bg-dark-surface-container-low border border-border-subtle p-4 rounded-lg">
              <div className="flex items-center gap-2 text-tertiary mb-1">
                <MaterialIcon name="military_tech" className="text-[20px]" />
                <span className="font-code font-bold text-code-sm">Badges Dev</span>
              </div>
              <div className="text-headline-sm font-code font-bold text-white">12 Conquistas</div>
              <p className="text-[12px] text-dark-on-surface-variant">
                Mostre suas medalhas no seu perfil público.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
