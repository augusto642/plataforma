'use client';

/**
 * FirstMissionStep — Missão 1 do prólogo /onboarding (Sprint 6, Fase 1
 * do plano nota 10: "primeira vitória antes da conta").
 *
 * Até a Sprint 5, o prólogo era só teatro pré-conta (mascote, nível,
 * starter, avatar) e a primeira atividade real só acontecia depois do
 * cadastro, lá no /game. Agora o visitante JOGA a primeira batalha de
 * verdade antes da etapa de conta — e a conta passa a ser o que SALVA
 * essa vitória, não um pedágio antes dela (padrão "soft wall").
 *
 * Abordagem: a batalha é a REAL do produto, não uma réplica — usa a
 * mesma engine de estado (useGameStore.startBattle/attackEnemy), o
 * mesmo inimigo padrão da primeira batalha do /game (SyntaxBug #404) e
 * o mesmo modal de ataque com código (CodeBattleModal, com os desafios
 * de BattleChallenges e o avaliador local/API). Embutir a etapa aqui —
 * em vez de rotear para /game e voltar — mantém o retorno à etapa de
 * conta garantido e as escolhas do prólogo intactas no store.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore, Skill } from '../../game/stores/useGameStore';
import { CodeBattleModal } from '../../game/components/CodeBattleModal';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface FirstMissionStepProps {
  /** Missão concluída (ou pulada): segue para a etapa de conta. */
  onComplete: () => void;
}

type MissionPhase = 'intro' | 'battle' | 'won' | 'lost';

export const FirstMissionStep: React.FC<FirstMissionStepProps> = ({ onComplete }) => {
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const currentHp = useGameStore((s) => s.currentHp);
  const maxHp = useGameStore((s) => s.maxHp);
  const currentBattle = useGameStore((s) => s.currentBattle);
  const firstMission = useGameStore((s) => s.firstMission);
  const startBattle = useGameStore((s) => s.startBattle);
  const attackEnemy = useGameStore((s) => s.attackEnemy);
  const fleeBattle = useGameStore((s) => s.fleeBattle);
  const restoreHpFull = useGameStore((s) => s.restoreHpFull);
  const updateHp = useGameStore((s) => s.updateHp);
  const setFirstMission = useGameStore((s) => s.setFirstMission);

  const [phase, setPhase] = useState<MissionPhase>(
    firstMission?.completed ? 'won' : 'intro',
  );
  const [activeCodeSkill, setActiveCodeSkill] = useState<Skill | null>(null);
  const skippingRef = useRef(false);

  const audio = AudioSynthesizer.getInstance();

  // Desfecho da batalha vem da engine (store): vitória registra o
  // resultado da Missão 1 (é ele que a etapa de conta resume e salva);
  // derrota oferece nova tentativa com HP restaurado.
  useEffect(() => {
    if (!currentBattle?.isFinished || skippingRef.current) return;
    if (currentBattle.winner === 'player') {
      setFirstMission({
        completed: true,
        xpEarned: currentBattle.enemy.xpReward,
        bitsEarned: currentBattle.enemy.bitsReward,
      });
      setPhase('won');
    } else if (currentBattle.winner === 'enemy') {
      setPhase('lost');
    }
  }, [currentBattle, setFirstMission]);

  // Sair da etapa no meio da batalha não pode deixar o store preso em
  // modo 'battle' para quem depois abrir o /game.
  useEffect(() => {
    return () => {
      const battle = useGameStore.getState().currentBattle;
      if (battle && !battle.isFinished) {
        useGameStore.getState().fleeBattle();
      }
    };
  }, []);

  const handleStartMission = () => {
    skippingRef.current = false;
    restoreHpFull();
    startBattle();
    setPhase('battle');
    void audio.playTone({ frequency: 520, duration: 0.1, type: 'square' });
  };

  const handleSkip = () => {
    skippingRef.current = true;
    if (currentBattle && !currentBattle.isFinished) {
      fleeBattle();
    }
    onComplete();
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  const enemyHpPercent = currentBattle
    ? Math.max(
        0,
        Math.min(100, Math.round((currentBattle.enemy.hp / currentBattle.enemy.maxHp) * 100)),
      )
    : 100;

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0B1021]/90 p-8 shadow-2xl backdrop-blur-md">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#8257E5]">
        Missão 1 · Sua primeira vitória
      </div>

      {phase === 'intro' && (
        <>
          <h2 className="font-mono text-2xl font-black tracking-tight text-white">
            Um bug corrompeu o runtime. Resolva com código.
          </h2>
          <p className="mt-3 font-mono text-xs leading-relaxed text-slate-400">
            Antes de qualquer cadastro: jogue a primeira batalha de verdade. Use as skills do seu
            starter <span className="font-bold text-[#FFA116]">{selectedStarter.name}</span> e
            escreva o código do ataque para derrotar o{' '}
            <span className="font-bold text-rose-300">SyntaxBug #404</span>. Venceu? Aí sim a gente
            salva seu progresso numa conta grátis.
          </p>
          <button
            type="button"
            onClick={handleStartMission}
            className="mt-6 w-full rounded-xl bg-[#8257E5] px-6 py-3.5 font-mono text-sm font-black text-white shadow-lg shadow-[#8257E5]/30 transition hover:bg-[#6D28D9] active:scale-[0.98]"
          >
            Iniciar a Missão 1 →
          </button>
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onComplete}
              className="font-mono text-xs font-bold text-slate-400 underline-offset-4 transition hover:text-slate-200 hover:underline"
            >
              Pular por agora e ir para a conta →
            </button>
          </div>
        </>
      )}

      {phase === 'battle' && currentBattle && (
        <>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-rose-400">
              Combate // Missão 1
            </span>
            <span className="font-mono text-xs text-slate-400">
              Turno:{' '}
              <span className={currentBattle.turn === 'player' ? 'font-bold text-[#04D361]' : 'font-bold text-rose-400'}>
                {currentBattle.turn === 'player' ? 'SEU' : 'DO INIMIGO'}
              </span>
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Inimigo */}
            <div className="rounded-xl border border-rose-500/30 bg-[#1C0F1A] p-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl">👾</span>
                <span className="font-mono text-xs text-[#FFA116]">
                  Nv. {currentBattle.enemy.level}
                </span>
              </div>
              <div className="mt-2 font-mono text-sm font-bold text-white">
                {currentBattle.enemy.name}
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${enemyHpPercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                <span>HP</span>
                <span>
                  {currentBattle.enemy.hp} / {currentBattle.enemy.maxHp}
                </span>
              </div>
            </div>

            {/* Starter do jogador */}
            <div className="rounded-xl border border-[#04D361]/30 bg-[#091D1A] p-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{selectedStarter.icon}</span>
                <span className="font-mono text-xs text-[#04D361]">
                  Nv. {selectedStarter.level}
                </span>
              </div>
              <div className="mt-2 font-mono text-sm font-bold text-white">
                {selectedStarter.name}
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                <div
                  className="h-full bg-[#04D361] transition-all duration-300"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                <span>HP</span>
                <span>
                  {currentHp} / {maxHp}
                </span>
              </div>
            </div>
          </div>

          {/* Log da batalha */}
          <div className="mt-4 h-24 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-[#050812] p-3 font-mono text-xs">
            {currentBattle.log.slice(-5).map((line, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                <span className="text-cyan-400">&gt;</span>
                <span>{line}</span>
              </div>
            ))}
          </div>

          {/* Comandos: cada skill abre o editor de código da batalha */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {selectedStarter.skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                disabled={currentBattle.turn !== 'player' || currentBattle.isFinished}
                onClick={() => {
                  void audio.playTone({ frequency: 720, duration: 0.08, type: 'square' });
                  setActiveCodeSkill(skill);
                }}
                className="rounded-lg border border-cyan-500/40 bg-[#0F1E29] p-2.5 text-left transition-all hover:bg-[#162D3D] active:scale-95 disabled:opacity-50"
              >
                <span className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{skill.name}</span>
                  <span className="font-mono text-[9px] text-cyan-400">Pwr {skill.power}</span>
                </span>
                <span className="mt-0.5 block truncate font-mono text-[9px] text-slate-400">
                  Escreva o código do ataque
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="font-mono text-xs font-bold text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline"
            >
              Pular a missão por agora →
            </button>
          </div>
        </>
      )}

      {phase === 'won' && (
        <>
          <h2 className="font-mono text-2xl font-black tracking-tight text-[#04D361]">
            Vitória! Primeira missão concluída.
          </h2>
          <p className="mt-3 font-mono text-xs leading-relaxed text-slate-400">
            Você derrotou o SyntaxBug #404 com o {selectedStarter.name} e conquistou{' '}
            <span className="font-bold text-slate-200">
              +{firstMission?.xpEarned ?? 0} XP · +{firstMission?.bitsEarned ?? 0} Bits
            </span>
            . Isso já é progresso de verdade — crie sua conta grátis no próximo passo para ele não
            se perder.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 w-full rounded-xl bg-[#8257E5] px-6 py-3.5 font-mono text-sm font-black text-white shadow-lg shadow-[#8257E5]/30 transition hover:bg-[#6D28D9] active:scale-[0.98]"
          >
            Salvar meu progresso →
          </button>
        </>
      )}

      {phase === 'lost' && (
        <>
          <h2 className="font-mono text-2xl font-black tracking-tight text-rose-300">
            Seu starter caiu desta vez. Faz parte.
          </h2>
          <p className="mt-3 font-mono text-xs leading-relaxed text-slate-400">
            Programar é isso: errar, ler o log e tentar de novo. Seu HP foi restaurado — a Missão 1
            continua aqui quando você quiser. Se preferir, siga para a conta e volte à missão
            depois.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleStartMission}
              className="w-full rounded-xl bg-[#8257E5] px-6 py-3.5 font-mono text-sm font-black text-white shadow-lg shadow-[#8257E5]/30 transition hover:bg-[#6D28D9] active:scale-[0.98]"
            >
              Tentar a Missão 1 de novo →
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="font-mono text-xs font-bold text-slate-400 underline-offset-4 transition hover:text-slate-200 hover:underline"
            >
              Continuar para a conta sem concluir →
            </button>
          </div>
        </>
      )}

      {/* O ataque é código de verdade: mesmo modal do /game */}
      {activeCodeSkill && (
        <CodeBattleModal
          skill={activeCodeSkill}
          onAttackSuccess={() => {
            attackEnemy(activeCodeSkill.id);
            setActiveCodeSkill(null);
          }}
          onAttackFailed={(damageReceived) => {
            updateHp(-damageReceived);
            setActiveCodeSkill(null);
            // Recuo do modal pode zerar o HP fora do attackEnemy (que é
            // quem declara derrota): fecha a batalha e oferece retry.
            if (currentHp - damageReceived <= 0) {
              fleeBattle();
              setPhase('lost');
            }
          }}
          onClose={() => setActiveCodeSkill(null)}
        />
      )}
    </div>
  );
};
