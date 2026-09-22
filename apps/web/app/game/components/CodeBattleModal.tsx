'use client';

/**
 * CodeBattleModal.tsx
 * NEXUS CODE - Arena de Batalha Pokémon com Editor Monaco Embutido (v2.0)
 * 
 * Layout e Mecânica Clássica de RPG Pokémon:
 * - Boss / Bug no canto superior direito com Barra de HP e Ghost Bar de dano
 * - Starter do Aluno no canto inferior esquerdo com HP dinâmico e XP
 * - Editor Monaco embutido com syntax highlighting da trilha
 * - Botão "Executar Ataque de Código" com integração a POST /submissions/battle-run (e fallback local)
 * - Animação de screen shake, dano numérico flutuante e disparo do modal de evolução ao vencer
 */

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BattleChallenge, getChallengeForSkill } from '../engine/BattleChallenges';
import { CodeSandboxEvaluator, ExecutionOutcome } from '../engine/CodeSandboxEvaluator';
import { Skill, useGameStore } from '../stores/useGameStore';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';
import { apiFetch } from '../../lib/apiClient';

// Importação dinâmica do Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center bg-[#050A19] font-mono text-xs text-cyan-400">
      <span className="animate-pulse">CARREGANDO MONACO EDITOR // DARK OBSIDIAN...</span>
    </div>
  ),
});

interface CodeBattleModalProps {
  skill: Skill;
  onAttackSuccess: (damage: number, logMsg: string) => void;
  onAttackFailed: (damageReceived: number, errorLog: string) => void;
  onClose: () => void;
}

export const CodeBattleModal: React.FC<CodeBattleModalProps> = ({
  skill,
  onAttackSuccess,
  onAttackFailed,
  onClose,
}) => {
  const challenge: BattleChallenge = getChallengeForSkill(skill.id);
  const [code, setCode] = useState<string>(challenge.starterCode);
  const [outcome, setOutcome] = useState<ExecutionOutcome | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Estados dinâmicos de batalha na arena
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const currentBattle = useGameStore((s) => s.currentBattle);
  const currentHp = useGameStore((s) => s.currentHp);
  const maxHp = useGameStore((s) => s.maxHp);
  const addBits = useGameStore((s) => s.addBits);
  const addPetXp = useGameStore((s) => s.addPetXp);
  const setCatMood = useGameStore((s) => s.setCatMood);
  const setCatMessage = useGameStore((s) => s.setCatMessage);

  // HP do Boss local para animação fluida de Ghost Bar
  const enemyMaxHp = currentBattle?.enemy.maxHp || 100;
  const [enemyHp, setEnemyHp] = useState<number>(currentBattle?.enemy.hp || 100);
  const [enemyGhostHp, setEnemyGhostHp] = useState<number>(currentBattle?.enemy.hp || 100);

  // Efeitos visuais
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [floatingDamage, setFloatingDamage] = useState<{ amount: number; isCrit: boolean } | null>(null);
  const [isVictorious, setIsVictorious] = useState<boolean>(false);

  const audio = AudioSynthesizer.getInstance();

  // Executa validação inicial automática
  useEffect(() => {
    let isCancelled = false;
    void CodeSandboxEvaluator.evaluateAsync(challenge.starterCode, challenge).then((res) => {
      if (!isCancelled) {
        setOutcome(res);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [challenge]);

  // Efeito Ghost Bar do HP do Boss: após 400ms do dano, a ghost bar alcança o novo HP
  useEffect(() => {
    if (enemyGhostHp > enemyHp) {
      const timer = setTimeout(() => {
        setEnemyGhostHp(enemyHp);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [enemyHp, enemyGhostHp]);

  const handleRunCode = async () => {
    if (isExecuting || isVictorious) return;
    setIsExecuting(true);
    void audio.playTone({ frequency: 800, duration: 0.08, type: 'square' });

    let finalOutcome: ExecutionOutcome;

    // 1. Tenta submissão ao backend /submissions/battle-run
    try {
      const response = await apiFetch('/submissions/battle-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: challenge.language,
          challengeId: challenge.id,
          skillId: skill.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        finalOutcome = {
          allPassed: data.allPassed,
          testsPassed: data.testsPassed || (data.allPassed ? challenge.testCases.length : 0),
          totalTests: challenge.testCases.length,
          executionTimeMs: data.durationMs || 45,
          testResults: data.testResults || [],
          stdout: data.stdout || '',
          syntaxError: data.syntaxError,
        };
      } else {
        // Fallback local caso a API retorne status não 2xx
        finalOutcome = await CodeSandboxEvaluator.evaluateAsync(code, challenge, 1500);
      }
    } catch {
      // Fallback transparente para o sandbox local offline
      finalOutcome = await CodeSandboxEvaluator.evaluateAsync(code, challenge, 1500);
    }

    setOutcome(finalOutcome);
    setIsExecuting(false);

    if (finalOutcome.allPassed) {
      // Dano Crítico de Código
      const baseDamage = Math.round(skill.power * challenge.damageMultiplier);
      const newHp = Math.max(0, enemyHp - baseDamage);
      setEnemyHp(newHp);

      // Gatilho de Screen Shake e Dano Flutuante
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setFloatingDamage({ amount: baseDamage, isCrit: true });
      setTimeout(() => setFloatingDamage(null), 1200);

      addBits(35);
      void audio.playHit();
      setCatMood('celebrate');

      if (newHp <= 0) {
        // Boss Derrotado!
        setIsVictorious(true);
        void audio.playEvolutionFanfare();
        setCatMessage(`INCRÍVEL! ${currentBattle?.enemy.name || 'O Bug'} foi derrotado! Você conquistou 150 XP!`);

        // Concede XP e dispara evolução se atingir o limiar
        setTimeout(() => {
          addPetXp(150);
          onAttackSuccess(
            baseDamage,
            `VITÓRIA TOTAL! ${skill.name} aniquilou ${currentBattle?.enemy.name || 'o Bug'} com ${baseDamage} de dano crítico! (+35 Bits / +150 XP)`
          );
        }, 1200);
      } else {
        onAttackSuccess(
          baseDamage,
          `COMPILAÇÃO IMPECÁVEL! ${skill.name} desferiu um GOLPE CRÍTICO de ${baseDamage} de dano! (+35 Bits)`
        );
      }
    } else {
      // Falha: Contra-ataque
      const recoilDamage = 8;
      void audio.playTone({ frequency: 220, duration: 0.2, type: 'sawtooth' });
      setCatMood('alert');
      setCatMessage('Fsssh! Ocorreu um erro de sintaxe ou falha de teste! Inspecione os casos de teste com calma!');

      onAttackFailed(
        recoilDamage,
        finalOutcome.syntaxError
          ? `ERRO DE COMPILAÇÃO: O bug adversário aproveitou o erro e causou ${recoilDamage} de contra-ataque!`
          : `FALHA DE TESTES: ${finalOutcome.testsPassed}/${finalOutcome.totalTests} passaram. O bug causou ${recoilDamage} de dano!`
      );
    }
  };

  const enemyHpPercent = Math.max(0, Math.min(100, Math.round((enemyHp / enemyMaxHp) * 100)));
  const enemyGhostHpPercent = Math.max(0, Math.min(100, Math.round((enemyGhostHp / enemyMaxHp) * 100)));
  const playerHpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-fadeIn select-none">
      <div
        className={`relative flex max-h-[96vh] w-full max-w-5xl flex-col rounded-3xl border-2 border-[#00E5FF]/60 bg-[#060D1E] shadow-2xl shadow-cyan-950/80 overflow-hidden transition-transform ${
          isShaking ? 'translate-x-1.5 translate-y-1' : ''
        }`}
      >
        {/* Header do Combate com Transição Pokémon */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 bg-[#0A1428] px-5 py-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-lg">
              ⚔️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-mono text-sm sm:text-base font-black text-white">
                  ARENA DE COMBATE // {skill.name.toUpperCase()}
                </h3>
                <span className="rounded-md bg-cyan-950 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00E5FF] border border-cyan-800">
                  {skill.type} &bull; PWR {skill.power}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">{challenge.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-700 transition"
          >
            ✕ RECUAR
          </button>
        </div>

        {/* 1. ARENA POKÉMON CLÁSSICA (BOSS TOPO-DIREITA vs STARTER BASE-ESQUERDA) */}
        <div className="relative bg-gradient-to-b from-[#030612] via-[#081024] to-[#040816] p-4 border-b border-cyan-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center max-w-4xl mx-auto">
            {/* Lado Esquerdo: Starter do Jogador (Base) */}
            <div className="order-2 md:order-1 flex items-center gap-4 bg-[#070D1E]/90 border border-cyan-900/60 p-3.5 rounded-2xl shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-[#091D1A] border border-[#04D361]/40 flex items-center justify-center text-4xl shadow-inner relative">
                <span className="animate-bounce" style={{ animationDuration: '3s' }}>
                  {selectedStarter.icon}
                </span>
                <span className="absolute -bottom-1 -right-1 text-[9px] font-mono font-bold bg-cyan-950 px-1.5 py-0.2 rounded-full border border-cyan-500/40 text-[#00E5FF]">
                  Nv.{selectedStarter.level}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-heading font-black text-sm text-white">{selectedStarter.name}</span>
                  <span className="text-[10px] font-mono text-[#04D361] font-bold">
                    {currentHp} / {maxHp} HP
                  </span>
                </div>
                {/* Barra de HP do Jogador */}
                <div className="w-full h-2.5 bg-[#12182B] rounded-full overflow-hidden border border-[#203055]">
                  <div
                    className="h-full bg-gradient-to-r from-[#00E5FF] to-[#04D361] transition-all duration-300"
                    style={{ width: `${playerHpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Lado Direito: Boss Inimigo (Topo) com Ghost Bar */}
            <div className="order-1 md:order-2 flex items-center gap-4 bg-[#070D1E]/90 border border-rose-900/60 p-3.5 rounded-2xl shadow-lg relative">
              {/* Dano Flutuante */}
              {floatingDamage && (
                <div className="absolute -top-6 right-16 font-mono text-sm font-black text-rose-400 animate-bounce">
                  💥 -{floatingDamage.amount} HP!
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-heading font-black text-sm text-rose-300">
                    {currentBattle?.enemy.name || 'Indentation Beast'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    {enemyHp} / {enemyMaxHp} HP
                  </span>
                </div>

                {/* Barra de HP do Inimigo com Efeito "Ghost Bar" */}
                <div className="relative w-full h-3 bg-[#160B12] rounded-full overflow-hidden border border-rose-950">
                  {/* Ghost Bar (atrasa 400ms) */}
                  <div
                    className="absolute top-0 left-0 h-full bg-rose-400/50 transition-all duration-700 ease-out"
                    style={{ width: `${enemyGhostHpPercent}%` }}
                  />
                  {/* Barra Principal de HP */}
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FFA116] to-[#F43F5E] transition-all duration-200 ease-out"
                    style={{ width: `${enemyHpPercent}%` }}
                  />
                </div>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-[#1C0F1A] border border-[#F43F5E]/40 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse">
                👾
              </div>
            </div>
          </div>
        </div>

        {/* 2. CORPO: EDITOR MONACO + PAINEL DE CASOS DE TESTE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Editor Monaco Embutido (7 Colunas) */}
          <div className="lg:col-span-7 border-r border-cyan-950 flex flex-col h-[320px] sm:h-[360px]">
            <div className="flex items-center justify-between bg-[#070E1F] px-4 py-2 border-b border-cyan-950 font-mono text-[11px] text-slate-400">
              <span className="text-cyan-300">code_attack.{challenge.language === 'javascript' ? 'js' : 'ts'}</span>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-amber-400 hover:underline font-bold"
              >
                {showHint ? '▲ ESCONDER DICA' : '💡 DICA SOCRÁTICA'}
              </button>
            </div>

            {showHint && (
              <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 font-mono text-[11px] text-amber-300">
                <strong>Dica:</strong> {challenge.hint}
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language={challenge.language}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'monospace',
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Painel de Resultados dos Casos de Teste (5 Colunas) */}
          <div className="lg:col-span-5 flex flex-col bg-[#030611] h-[320px] sm:h-[360px] overflow-y-auto p-4 font-mono text-xs">
            <div className="mb-2.5 flex items-center justify-between border-b border-cyan-950 pb-2">
              <span className="text-slate-300 font-bold">VALIAÇÃO DE IMPACTO:</span>
              {outcome && (
                <span
                  className={`rounded px-2 py-0.5 font-bold ${
                    outcome.allPassed
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  {outcome.testsPassed}/{outcome.totalTests} PASSARAM
                </span>
              )}
            </div>

            {/* Lista de Testes */}
            <div className="space-y-2 flex-1">
              {outcome?.testResults.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className={`rounded-xl border p-2.5 transition ${
                    t.passed
                      ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300'
                      : 'border-red-900/60 bg-red-950/20 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-0.5">
                    <span className="flex items-center gap-1.5">
                      <span>{t.passed ? '✓' : '✕'}</span>
                      <span>{t.name}</span>
                    </span>
                    <span
                      className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded ${
                        t.passed ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
                      }`}
                    >
                      {t.passed ? 'Aprovado' : 'Falha'}
                    </span>
                  </div>

                  {!t.passed && (
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-white/5 pt-1 space-y-0.5">
                      <div>Esperado: <code className="text-emerald-400">{JSON.stringify(t.expected)}</code></div>
                      <div>Recebido: <code className="text-red-400">{JSON.stringify(t.actual)}</code></div>
                    </div>
                  )}
                </div>
              ))}

              {outcome?.syntaxError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-2.5 text-red-300">
                  <div className="font-bold text-[11px] mb-1">ERRO DE COMPILAÇÃO:</div>
                  <pre className="whitespace-pre-wrap text-[10px] text-red-200 font-mono">
                    {outcome.syntaxError}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. RODAPÉ COM BOTÃO DE ATAQUE */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-cyan-900/60 bg-[#0A1428] px-6 py-3.5 gap-3">
          <div className="font-mono text-xs text-slate-300">
            {outcome?.allPassed ? (
              <span className="text-[#04D361] font-bold">
                ✓ Testes validados! Clique para desferir o ataque de código do {selectedStarter.name}!
              </span>
            ) : (
              <span className="text-amber-400">
                Corrija a lógica do código para compilar e desferir o golpe.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRunCode}
            disabled={isExecuting || isVictorious}
            className={`flex items-center gap-2 rounded-xl border px-8 py-3 font-mono text-xs font-black shadow-xl transition active:scale-95 cursor-pointer ${
              isExecuting
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 cursor-wait'
                : isVictorious
                ? 'border-[#04D361] bg-[#04D361] text-black'
                : outcome?.allPassed
                ? 'border-[#04D361] bg-[#04D361] hover:bg-emerald-400 text-black shadow-emerald-950/60'
                : 'border-cyan-500/60 bg-[#00E5FF]/20 hover:bg-[#00E5FF] hover:text-black text-[#00E5FF]'
            }`}
          >
            {isExecuting && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            )}
            <span>
              {isExecuting
                ? 'AVALIANDO SANDBOX...'
                : isVictorious
                ? '🏆 BOSS DERROTADO!'
                : '⚡ EXECUTAR ATAQUE DE CÓDIGO'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
