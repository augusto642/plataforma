'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface BattleState {
  playerHp: number;
  enemyHp: number;
  isAttacking: boolean;
  isEnemyHit: boolean;
  isPlayerHit: boolean;
  statusText: string;
  hasWon: boolean;
  turnCount: number;
  outputLatency: string;
}

interface SparkParticle {
  id: number;
  color: string;
  tx: number;
  ty: number;
  size: number;
}

interface FloatingDamage {
  id: number;
  text: string;
  type: 'critical' | 'player-damage';
}

export const HeroBattlePreview: React.FC = () => {
  const [code, setCode] = useState(
`// ⚔️ Missão: Expurgar o Bug de Deadlock
// Adquira o mutex e retorne true para liberar o ataque:
fn expurgar_deadlock(lock: &mut Mutex) -> bool {
    let _guard = lock.acquire_guard();
    // Fix: Retorne true para desferir o golpe crítico:
    true
}`
  );

  const [state, setState] = useState<BattleState>({
    playerHp: 100,
    enemyHp: 100,
    isAttacking: false,
    isEnemyHit: false,
    isPlayerHit: false,
    statusText: '👾 Deadlock Chimera detectada na thread #04. Execute o código corrigido para desferir o ataque crítico.',
    hasWon: false,
    turnCount: 1,
    outputLatency: '14.2ms',
  });

  const [floatingDamage, setFloatingDamage] = useState<FloatingDamage | null>(null);
  const [sparks, setSparks] = useState<SparkParticle[]>([]);

  const triggerHaptic = (pattern: number[] = [40, 30, 80]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignora silenciosamente em navegadores restritivos
      }
    }
  };

  const spawnSparks = () => {
    const colors = ['#00E5FF', '#04D361', '#FFA116', '#FF5F56', '#FFFFFF', '#A855F7'];
    const newSparks: SparkParticle[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() * 0.4 - 0.2);
      const distance = 40 + Math.random() * 55;
      newSparks.push({
        id: Date.now() + i,
        color: colors[i % colors.length],
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        size: 4 + Math.floor(Math.random() * 4),
      });
    }
    setSparks(newSparks);
    setTimeout(() => setSparks([]), 800);
  };

  const handleAttack = () => {
    if (state.isAttacking || state.hasWon) return;

    setState((prev) => ({
      ...prev,
      isAttacking: true,
      isEnemyHit: false,
      isPlayerHit: false,
      statusText: '⚡ Compilando em Rust 1.78 release mode via Piston Sandbox isolado...',
    }));

    const audio = AudioSynthesizer.getInstance();
    void audio.resume();
    audio.playTone({ frequency: 650, pitchBendTo: 950, duration: 0.12, type: 'square' });
    triggerHaptic([25]);

    setTimeout(() => {
      const isCorrect = code.includes('true') && !code.includes('false') && code.includes('fn expurgar_deadlock');

      if (isCorrect) {
        audio.playHit();
        triggerHaptic([50, 30, 100]);
        spawnSparks();

        setFloatingDamage({
          id: Date.now(),
          text: '-100 DMG! CRITICAL RUN',
          type: 'critical',
        });
        setTimeout(() => setFloatingDamage(null), 1400);

        setTimeout(() => {
          audio.playVictory();
        }, 150);

        setState((prev) => ({
          ...prev,
          enemyHp: 0,
          isAttacking: false,
          isEnemyHit: true,
          isPlayerHit: false,
          statusText: '💥 CRITICAL HIT! 100 DMG! Deadlock Chimera foi derrotada. Testes unitários 100% aprovados.',
          hasWon: true,
          turnCount: prev.turnCount + 1,
          outputLatency: '8.4ms',
        }));
      } else {
        audio.playTone({ frequency: 220, pitchBendTo: 110, duration: 0.2, type: 'sawtooth' });
        audio.playHit();
        triggerHaptic([80]);

        setFloatingDamage({
          id: Date.now(),
          text: '-25 DMG! DEADLOCK FAILURE',
          type: 'player-damage',
        });
        setTimeout(() => setFloatingDamage(null), 1400);

        setState((prev) => ({
          ...prev,
          playerHp: Math.max(20, prev.playerHp - 25),
          isAttacking: false,
          isEnemyHit: false,
          isPlayerHit: true,
          statusText: '⚠️ Falha no teste de concorrência! O lock não foi liberado adequadamente.',
          turnCount: prev.turnCount + 1,
          outputLatency: '18.1ms',
        }));
      }
    }, 450);
  };

  const handleReset = () => {
    const audio = AudioSynthesizer.getInstance();
    void audio.resume();
    audio.playTone({ frequency: 440, pitchBendTo: 880, duration: 0.1, type: 'sine' });
    triggerHaptic([20]);

    setState({
      playerHp: 100,
      enemyHp: 100,
      isAttacking: false,
      isEnemyHit: false,
      isPlayerHit: false,
      statusText: '👾 Deadlock Chimera reapareceu. Corrija a instrução para atacar novamente.',
      hasWon: false,
      turnCount: 1,
      outputLatency: '14.2ms',
    });
    setFloatingDamage(null);
    setSparks([]);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto group">
      {/* Glow Ambient Lights de Fundo */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-emerald-500/20 rounded-[32px] blur-2xl opacity-70 group-hover:opacity-100 transition duration-1000 -z-10" />

      {/* Moldura Premium de Vidro Obsidian (1px Specular Border) */}
      <div className="relative rounded-[28px] border border-white/[0.12] bg-[#050814]/90 shadow-[0_25px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden">
        {/* Barra Superior da Janela (Hardware Console) */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0B1021] via-[#070A18] to-[#0B1021] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]/90 border border-[#E0443E]/50 shadow-sm inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]/90 border border-[#DEA123]/50 shadow-sm inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]/90 border border-[#1AAB29]/50 shadow-sm inline-block" />
            </div>
            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <span className="text-[#00E5FF]">nexus-arena</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">dungeon-concurrency</span>
              <span className="text-zinc-600">/</span>
              <span className="text-white font-semibold">battle_01.rs</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              CGROUPS-V2 ISOLATED
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              P99: {state.outputLatency}
            </span>
          </div>
        </div>

        {/* HUD de Batalha: Jogador vs Inimigo com Visual de Luxo */}
        <div className="p-5 sm:p-6 border-b border-white/[0.06] bg-gradient-to-b from-[#0B1021]/80 to-transparent relative">
          {/* Keyframes de animação de dano e faíscas */}
          <style>{`
            @keyframes damageFloatAnim {
              0% {
                opacity: 0;
                transform: translateY(14px) scale(0.75);
              }
              18% {
                opacity: 1;
                transform: translateY(-4px) scale(1.18);
              }
              35% {
                transform: translateY(-12px) scale(1.05);
              }
              100% {
                opacity: 0;
                transform: translateY(-50px) scale(0.85);
              }
            }
            @keyframes hitShakeAnim {
              0%, 100% { transform: scale(1.25) rotate(0deg); }
              20% { transform: scale(1.25) translate(-5px, 2px) rotate(-8deg); }
              40% { transform: scale(1.25) translate(5px, -2px) rotate(8deg); }
              60% { transform: scale(1.25) translate(-3px, -2px) rotate(-4deg); }
              80% { transform: scale(1.25) translate(3px, 2px) rotate(4deg); }
            }
            .animate-damage-float {
              animation: damageFloatAnim 1.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-hit-shake {
              animation: hitShakeAnim 0.35s ease-in-out;
            }
          `}</style>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Bloco do Jogador */}
            <div className="flex items-center gap-4 w-full sm:w-auto relative">
              {/* Floating Damage do Jogador (se errar) */}
              {floatingDamage && floatingDamage.type === 'player-damage' && (
                <div
                  key={floatingDamage.id}
                  className="absolute -top-11 left-6 z-40 font-heading font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.85)] animate-damage-float whitespace-nowrap pointer-events-none flex items-center gap-1.5"
                >
                  <span>⚠️</span>
                  <span>{floatingDamage.text}</span>
                </div>
              )}

              <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-950 to-blue-950 border border-cyan-500/40 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.25)] shrink-0 transition-transform ${
                state.isPlayerHit ? 'animate-hit-shake border-red-500' : ''
              }`}>
                <div className="w-full h-full bg-[#050814] rounded-xl flex items-center justify-center text-3xl select-none">
                  🧙‍♂️
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#04D361] text-[9px] font-mono font-black text-black shadow">
                  LVL 14
                </span>
              </div>
              <div className="flex-1 sm:flex-initial">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-white tracking-wide">DEV_OPERATOR</span>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                    SYSTEMS PALADIN
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] font-mono text-zinc-400">HP</span>
                  <div className="w-32 sm:w-44 h-2.5 rounded-full bg-[#0E1528] border border-cyan-900/40 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#04D361] via-[#00E58F] to-[#00E5FF] transition-all duration-500 shadow-[0_0_10px_rgba(4,211,97,0.5)]"
                      style={{ width: `${state.playerHp}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{state.playerHp}/100</span>
                </div>
              </div>
            </div>

            {/* Marcador Central de Turno */}
            <div className="hidden lg:flex flex-col items-center justify-center px-4 py-1.5 rounded-xl bg-black/40 border border-white/[0.08]">
              <span className="text-[10px] font-mono font-black text-zinc-400 tracking-wider">RODADA {state.turnCount}</span>
              <span className="text-xs font-heading font-black text-[#00E5FF]">DUELO DE CÓDIGO</span>
            </div>

            {/* Bloco do Boss */}
            <div className="flex items-center justify-end gap-4 w-full sm:w-auto text-right relative">
              {/* Floating Damage do Boss (-100 DMG! CRITICAL RUN) */}
              {floatingDamage && floatingDamage.type === 'critical' && (
                <div
                  key={floatingDamage.id}
                  className="absolute -top-11 right-6 z-40 font-heading font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-amber-300 text-black border-2 border-white shadow-[0_0_35px_rgba(251,191,36,0.95)] animate-damage-float whitespace-nowrap pointer-events-none flex items-center gap-1.5"
                >
                  <span className="text-sm">💥</span>
                  <span className="tracking-wide uppercase font-extrabold">{floatingDamage.text}</span>
                  <span className="text-sm">⚡</span>
                </div>
              )}

              <div className="flex-1 sm:flex-initial">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/70 px-2 py-0.5 rounded border border-rose-500/30">
                    BOSS DA DUNGEON
                  </span>
                  <span className="text-xs font-mono font-black text-white tracking-wide">DEADLOCK_CHIMERA</span>
                </div>
                <div className="flex items-center justify-end gap-3 mt-1.5">
                  <span className="text-[11px] font-mono font-bold text-rose-400">{state.enemyHp}/100</span>
                  <div className="w-32 sm:w-44 h-2.5 rounded-full bg-[#0E1528] border border-rose-900/40 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      style={{ width: `${state.enemyHp}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">HP</span>
                </div>
              </div>

              <div
                className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-950 to-red-950 border border-rose-500/40 p-0.5 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.3)] shrink-0 transition-transform ${
                  state.isEnemyHit ? 'scale-125 rotate-12 bg-white duration-150 animate-hit-shake' : 'animate-pulse'
                }`}
              >
                {/* Faíscas / Partículas de Impacto Radial */}
                {sparks.map((spark) => (
                  <span
                    key={spark.id}
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      width: `${spark.size}px`,
                      height: `${spark.size}px`,
                      backgroundColor: spark.color,
                      boxShadow: `0 0 8px ${spark.color}, 0 0 16px ${spark.color}`,
                      top: '50%',
                      left: '50%',
                      transform: `translate(calc(-50% + ${spark.tx}px), calc(-50% + ${spark.ty}px))`,
                      transition: 'transform 0.65s cubic-bezier(0.12, 0.9, 0.25, 1), opacity 0.65s ease-out',
                      opacity: 1,
                      zIndex: 50,
                    }}
                  />
                ))}

                <div className="w-full h-full bg-[#050814] rounded-xl flex items-center justify-center text-3xl select-none">
                  {state.hasWon ? '💀' : '👾'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corpo do Terminal: Split Editor & Output Log */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#030712]">
          {/* Editor com Visual Monaco Premium */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#070A18] p-4 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">SRC //</span>
                  <span className="text-zinc-200 font-semibold">fix_concurrency.rs</span>
                </div>
                <span className="text-[#04D361] flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-ping" />
                  RUST 1.78 LIVE
                </span>
              </div>

              <div className="flex gap-3 font-mono text-xs sm:text-[13px] leading-relaxed">
                {/* Linhas de Código Estilizadas */}
                <div className="select-none text-zinc-600 text-right pr-2 border-r border-zinc-800/80 space-y-0.5">
                  <div>01</div>
                  <div>02</div>
                  <div>03</div>
                  <div>04</div>
                  <div>05</div>
                  <div>06</div>
                  <div>07</div>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={state.isAttacking || state.hasWon}
                  className="w-full h-40 bg-transparent text-[#00E5FF] font-mono text-xs sm:text-[13px] leading-relaxed resize-none outline-none selection:bg-cyan-900/60"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Instrução: Retorne `true` e clique em Atacar</span>
              <span className="text-zinc-400">Zero-Config Sandbox</span>
            </div>
          </div>

          {/* Output & Ação de Ataque */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#070A18] p-4 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
                <span>TELEMETRIA & COMBAT OUTPUT</span>
                <span className="text-[#00E5FF] font-bold">SUB-20MS</span>
              </div>

              <div
                className={`p-4 rounded-xl border text-xs sm:text-[13px] font-mono leading-relaxed transition-all duration-300 ${
                  state.hasWon
                    ? 'bg-emerald-950/40 border-[#04D361]/60 text-emerald-300 shadow-[0_0_20px_rgba(4,211,97,0.2)]'
                    : state.isAttacking
                    ? 'bg-cyan-950/40 border-[#00E5FF]/60 text-cyan-300'
                    : 'bg-[#0B1021]/80 border-white/[0.06] text-zinc-300'
                }`}
              >
                {state.statusText}
              </div>

              {state.hasWon && (
                <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-3 animate-fadeIn">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="font-bold text-white">+150 XP • Conquista Desbloqueada!</div>
                    <div className="text-[10px] text-zinc-400">Card TCG 'Paladino Ferrox' liberado no inventário.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-white/[0.06]">
              {!state.hasWon ? (
                <button
                  type="button"
                  onClick={handleAttack}
                  disabled={state.isAttacking}
                  className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-[#00E5FF] via-[#04D361] to-[#00E58F] text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,229,255,0.35)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>⚔️</span>
                  <span>{state.isAttacking ? 'Compilando e Atacando...' : 'Executar Código & Desferir Ataque'}</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Link
                    href="/onboarding"
                    className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#04D361] to-[#00E58F] hover:from-[#00E58F] hover:to-[#04D361] text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-center active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(4,211,97,0.4)] flex items-center justify-center gap-2"
                  >
                    <span>🎉 Salvar Progresso & Criar Personagem</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-3 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-300 font-mono text-xs transition-colors"
                    title="Testar Novamente"
                  >
                    ↺ Rejogar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
