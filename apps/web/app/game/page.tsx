'use client';

/**
 * page.tsx
 * NEXUS CODE - /game Route Page
 * 
 * Página principal do ecossistema de jogo 2D:
 * - HUD Dark Obsidian de alta fidelidade
 * - Status do jogador (nível, XP, bits, passos)
 * - Status do Starter (HP dinâmico com gradiente de alerta, tipo, nível)
 * - GameCanvas 1024x576 com resolução pixel-perfect
 * - Modal de Batalha interativo com comandos de ataque, inventário e fuga
 * - Modal de Inventário & Troca de Starters
 * - VirtualDPad touch responsivo com feedback háptico
 * - Legenda de atalhos e controles de som/debug
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GameCanvas } from './components/GameCanvas';
import { VirtualDPad } from './components/VirtualDPad';
import { CodeBattleModal } from './components/CodeBattleModal';
import { LumiAITutorDrawer } from './components/LumiAITutorDrawer';
import { GitTierModal } from './components/GitTierModal';
import { PetEvolutionModal } from './components/PetEvolutionModal';
import { BlackCatHudWidget } from './components/BlackCatHudWidget';
import { VisualLessonModal } from './components/VisualLessonModal';
import { useGameStore, StarterCreature, GameItem, Skill } from './stores/useGameStore';
import { AudioSynthesizer } from './engine/AudioSynthesizer';

export default function GamePage(): JSX.Element {
  // Estado local da UI
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [showStartersModal, setShowStartersModal] = useState<boolean>(false);
  const [showGitModal, setShowGitModal] = useState<boolean>(false);
  const [showMobileControls, setShowMobileControls] = useState<boolean>(true);
  const [battleSubMenu, setBattleSubMenu] = useState<'main' | 'skills' | 'items'>('main');
  const [activeCodeSkill, setActiveCodeSkill] = useState<Skill | null>(null);

  // Seletores do Zustand Store
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const player = useGameStore((s) => s.player);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const startersCatalog = useGameStore((s) => s.startersCatalog);
  const setStarter = useGameStore((s) => s.setStarter);
  const currentHp = useGameStore((s) => s.currentHp);
  const maxHp = useGameStore((s) => s.maxHp);
  const updateHp = useGameStore((s) => s.updateHp);
  const inventory = useGameStore((s) => s.inventory);
  const consumeItem = useGameStore((s) => s.useItem);
  const currentBattle = useGameStore((s) => s.currentBattle);
  const attackEnemy = useGameStore((s) => s.attackEnemy);
  const fleeBattle = useGameStore((s) => s.fleeBattle);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const volume = useGameStore((s) => s.volume);
  const setVolume = useGameStore((s) => s.setVolume);
  const debugMode = useGameStore((s) => s.debugMode);
  const toggleDebug = useGameStore((s) => s.toggleDebug);
  const resetGame = useGameStore((s) => s.resetGame);

  // Áudio singleton
  const audio = AudioSynthesizer.getInstance();

  // Atalhos de teclado no nível da página (Mute, Debug, Inventário)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInventoryModal((prev) => !prev);
      } else if (e.key === 'p' || e.key === 'P') {
        toggleDebug();
      } else if (e.key === 'Escape') {
        setShowInventoryModal(false);
        setShowStartersModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMute, toggleDebug]);

  // Cálculo da porcentagem de HP
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  const hpColorClass =
    hpPercent > 50
      ? 'bg-[#04D361] shadow-[0_0_10px_#04D361]'
      : hpPercent > 20
      ? 'bg-[#FFA116] shadow-[0_0_10px_#FFA116]'
      : 'bg-[#F43F5E] shadow-[0_0_10px_#F43F5E] animate-pulse';

  // Cálculo de XP
  const xpPercent = Math.max(
    0,
    Math.min(100, Math.round((player.xp / player.maxXp) * 100))
  );

  return (
    <main className="min-h-screen bg-[#050814] text-zinc-100 flex flex-col justify-between selection:bg-[#8257E5] selection:text-white font-sans">
      {/* 1. TOP BAR HUD (Dark Obsidian & Glassmorphism) */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1A2338]/80 bg-[#070A18]/90 backdrop-blur-xl px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Voltar */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition-transform active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0B1021] border border-[#8257E5]/50 flex items-center justify-center shadow-[0_0_12px_rgba(130,87,229,0.35)] group-hover:border-[#00E5FF] transition-colors">
                <span className="font-heading font-black text-xs text-[#00E5FF]">
                  NX
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-bold text-sm tracking-wider text-white">
                    NEXUS<span className="text-[#04D361]">CODE</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#8257E5]/20 text-[#996DFF] border border-[#8257E5]/40 uppercase tracking-wider">
                    2D RPG
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 block -mt-0.5">
                  Setor Laboratório // PR #01
                </span>
              </div>
            </Link>
          </div>

          {/* Player Quick Stats */}
          <div className="flex items-center gap-2 sm:gap-4 bg-[#0B1021]/80 px-3 py-1.5 rounded-lg border border-[#1F293D]">
            {/* Nível & XP */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                <span className="text-[#00E5FF] font-semibold">
                  LVL {player.level}
                </span>
                <span className="text-zinc-400 ml-2">
                  {player.xp}/{player.maxXp} XP
                </span>
              </div>
              <div className="w-24 sm:w-28 h-1.5 bg-[#12182B] rounded-full overflow-hidden border border-[#1E2B47]">
                <div
                  className="h-full bg-gradient-to-r from-[#0070F3] to-[#00E5FF] transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            {/* Créditos / Bits */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#101830] border border-[#203055]">
              <span className="text-xs">💎</span>
              <span className="font-mono text-xs font-bold text-[#04D361]">
                {player.bits}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                Bits
              </span>
            </div>

            {/* Passos */}
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-[#101830] border border-[#203055]">
              <span className="text-xs">👣</span>
              <span className="font-mono text-xs text-zinc-300">
                {player.steps}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                Steps
              </span>
            </div>
          </div>

          {/* Starter Companion HUD */}
          <div
            onClick={() => setShowStartersModal(true)}
            className="flex items-center gap-3 bg-[#0B1021]/80 hover:bg-[#12182E] cursor-pointer px-3 py-1.5 rounded-lg border border-[#1F293D] hover:border-[#8257E5]/60 transition-all active:scale-95 group"
            title="Clique para trocar de Starter"
          >
            <div className="relative">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border"
                style={{
                  backgroundColor: `${selectedStarter.color}15`,
                  borderColor: `${selectedStarter.color}60`,
                }}
              >
                {selectedStarter.icon}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-[#050814] text-[9px] font-mono font-bold px-1 rounded border border-zinc-700 text-zinc-300">
                v{selectedStarter.level}
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                  {selectedStarter.name}
                </span>
                <span
                  className="text-[9px] font-mono px-1 py-0.2 rounded uppercase font-semibold"
                  style={{
                    backgroundColor: `${selectedStarter.color}25`,
                    color: selectedStarter.color,
                  }}
                >
                  {selectedStarter.type}
                </span>
              </div>

              {/* Barra de HP */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-20 sm:w-24 h-2 bg-[#12182B] rounded-full overflow-hidden border border-[#1E2B47] p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${hpColorClass}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-zinc-300">
                  {currentHp}/{maxHp}
                </span>
              </div>
            </div>
          </div>

          {/* Toolbar de Ações & Configurações */}
          <div className="flex items-center gap-2">
            {/* Botão Gitea Real Git (PR #04) */}
            <button
              type="button"
              onClick={() => setShowGitModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#150F28] hover:bg-[#221640] border border-[#8257E5]/50 text-[#C4B5FD] text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Repositório Gitea (Júnior/Pleno)"
            >
              <span>🐙</span>
              <span className="hidden sm:inline">Git CLI</span>
            </button>

            {/* Botão Inventário */}
            <button
              type="button"
              onClick={() => setShowInventoryModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0E152B] hover:bg-[#162244] border border-[#203055] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Abrir Inventário (I)"
            >
              <span>🎒</span>
              <span className="hidden sm:inline">Bag</span>
              <span className="px-1 py-0.2 rounded text-[9px] bg-[#8257E5]/30 text-[#996DFF]">
                {inventory.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </button>

            {/* Botão Áudio Mute / Unmute */}
            <button
              type="button"
              onClick={() => {
                toggleMute();
                void audio.resume();
              }}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-[#1D1316] border-[#F43F5E]/40 text-[#F43F5E]'
                  : 'bg-[#0E1B1E] border-[#04D361]/40 text-[#04D361]'
              }`}
              title={isMuted ? 'Desmutar Som (M)' : 'Silenciar Som (M)'}
            >
              {isMuted ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            {/* Slider de Volume */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (isMuted && v > 0) toggleMute();
              }}
              className="w-16 sm:w-20 accent-[#04D361] h-1.5 bg-[#12182B] rounded-lg cursor-pointer hidden md:inline-block"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />

            {/* Toggle Debug Overlay */}
            <button
              type="button"
              onClick={toggleDebug}
              className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-semibold border transition-colors ${
                debugMode
                  ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                  : 'bg-[#101830] border-[#253556] text-zinc-400 hover:text-zinc-200'
              }`}
              title="Alternar Modo Debug (P)"
            >
              Debug
            </button>

            {/* Toggle Mobile D-Pad */}
            <button
              type="button"
              onClick={() => setShowMobileControls((prev) => !prev)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                showMobileControls
                  ? 'bg-[#8257E5]/20 border-[#8257E5] text-[#996DFF]'
                  : 'bg-[#101830] border-[#253556] text-zinc-400'
              }`}
              title="Exibir/Ocultar Controles Touch"
            >
              🎮
            </button>
          </div>
        </div>
      </header>

      {/* 2. ÁREA CENTRAL DE JOGO (Canvas 1024x576 + Overlays de Batalha) */}
      <section className="relative flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        {/* Frame Holográfico Obsidian */}
        <div className="relative w-full max-w-[1024px] mx-auto group">
          {/* Canvas Component */}
          <GameCanvas className="w-full" />

          {/* OVERLAY DE BATALHA (Disparado quando gameMode === 'battle') */}
          {gameMode === 'battle' && currentBattle && (
            <div className="absolute inset-0 z-30 bg-[#050814]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 rounded-xl border-2 border-[#F43F5E]/60 shadow-[0_0_50px_rgba(244,63,94,0.3)] animate-fadeIn">
              {/* Header do combate com Alerta Neon */}
              <div className="flex items-center justify-between border-b border-[#253556] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] animate-ping" />
                  <span className="font-heading font-black text-sm uppercase tracking-wider text-[#F43F5E]">
                    COMBATE // RUNTIME ANOMALY DETECTED
                  </span>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  Turno:{' '}
                  <span
                    className={
                      currentBattle.turn === 'player'
                        ? 'text-[#04D361] font-bold'
                        : 'text-[#F43F5E] font-bold'
                    }
                  >
                    {currentBattle.turn === 'player'
                      ? 'SEU TURNO'
                      : 'INIMIGO PROCESSANDO...'}
                  </span>
                </span>
              </div>

              {/* Arena de Batalha: Inimigo (Topo Direita) vs Jogador (Base Esquerda) */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 items-center">
                {/* 1. Inimigo (Topo) */}
                <div className="order-1 sm:order-2 flex flex-col items-end">
                  <div className="bg-[#0B1021] border border-[#2B3B5E] p-3 rounded-xl shadow-lg w-full max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading font-bold text-sm text-zinc-100">
                        {currentBattle.enemy.name}
                      </span>
                      <span className="font-mono text-xs text-[#FFA116]">
                        Nv. {currentBattle.enemy.level}
                      </span>
                    </div>
                    {/* Barra de HP do Inimigo */}
                    <div className="w-full h-2.5 bg-[#12182B] rounded-full overflow-hidden border border-[#203055]">
                      <div
                        className="h-full bg-gradient-to-r from-[#F43F5E] to-[#FFA116] transition-all duration-300"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              (currentBattle.enemy.hp / currentBattle.enemy.maxHp) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-1">
                      <span>HP:</span>
                      <span>
                        {currentBattle.enemy.hp} / {currentBattle.enemy.maxHp}
                      </span>
                    </div>
                  </div>

                  {/* Sprite/Ícone do Inimigo */}
                  <div className="mt-3 mr-6 w-20 h-20 rounded-2xl bg-[#1C0F1A] border border-[#F43F5E]/40 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(244,63,94,0.3)] animate-pulse">
                    👾
                  </div>
                </div>

                {/* 2. Companheiro do Jogador (Base) */}
                <div className="order-2 sm:order-1 flex flex-col items-start">
                  {/* Sprite/Ícone do Jogador */}
                  <div className="ml-6 mb-3 w-20 h-20 rounded-2xl bg-[#091D1A] border border-[#04D361]/40 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(4,211,97,0.3)]">
                    {selectedStarter.icon}
                  </div>

                  <div className="bg-[#0B1021] border border-[#2B3B5E] p-3 rounded-xl shadow-lg w-full max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading font-bold text-sm text-zinc-100">
                        {selectedStarter.name}
                      </span>
                      <span className="font-mono text-xs text-[#04D361]">
                        Nv. {selectedStarter.level}
                      </span>
                    </div>
                    {/* Barra de HP do Jogador */}
                    <div className="w-full h-2.5 bg-[#12182B] rounded-full overflow-hidden border border-[#203055]">
                      <div
                        className={`h-full transition-all duration-300 ${hpColorClass}`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-1">
                      <span>HP:</span>
                      <span>
                        {currentHp} / {maxHp}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log de Batalha e Painel de Comandos Inferior */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#253556]">
                {/* Console Terminal de Eventos */}
                <div className="bg-[#050812] border border-[#1F2B47] rounded-lg p-2.5 h-28 overflow-y-auto font-mono text-xs space-y-1">
                  {currentBattle.log.slice(-5).map((logLine, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-zinc-300">
                      <span className="text-[#00E5FF]">&gt;</span>
                      <span>{logLine}</span>
                    </div>
                  ))}
                </div>

                {/* Submenu de Ações */}
                <div className="flex flex-col justify-center">
                  {battleSubMenu === 'main' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          currentBattle.turn !== 'player' || currentBattle.isFinished
                        }
                        onClick={() => {
                          audio.playTone({
                            frequency: 520,
                            duration: 0.08,
                            type: 'square',
                          });
                          setBattleSubMenu('skills');
                        }}
                        className="p-2.5 rounded-lg bg-[#0F261E] hover:bg-[#153B2D] border border-[#04D361]/60 text-[#04D361] font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span>⚔️</span> ATACAR / SKILL
                      </button>

                      <button
                        type="button"
                        disabled={
                          currentBattle.turn !== 'player' || currentBattle.isFinished
                        }
                        onClick={() => {
                          audio.playTone({
                            frequency: 440,
                            duration: 0.08,
                            type: 'triangle',
                          });
                          setBattleSubMenu('items');
                        }}
                        className="p-2.5 rounded-lg bg-[#1F182E] hover:bg-[#2F2148] border border-[#8257E5]/60 text-[#996DFF] font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span>🎒</span> ITEM / BAG
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          audio.playHit();
                          attackEnemy();
                        }}
                        disabled={
                          currentBattle.turn !== 'player' || currentBattle.isFinished
                        }
                        className="p-2.5 rounded-lg bg-[#142338] hover:bg-[#1D3558] border border-[#00E5FF]/60 text-[#00E5FF] font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span>⚡</span> QUICK STRIKE
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          audio.playTone({
                            frequency: 280,
                            duration: 0.1,
                            type: 'sawtooth',
                          });
                          fleeBattle();
                        }}
                        disabled={currentBattle.isFinished}
                        className="p-2.5 rounded-lg bg-[#2B141A] hover:bg-[#3D1A25] border border-[#F43F5E]/60 text-[#F43F5E] font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span>🏃</span> FUGIR / ESC
                      </button>
                    </div>
                  )}

                  {/* Submenu de Skills / Ataques */}
                  {battleSubMenu === 'skills' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {selectedStarter.skills.map((skill) => (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => {
                              void audio.playTone({ frequency: 720, duration: 0.08, type: 'square' });
                              setActiveCodeSkill(skill);
                            }}
                            className="p-2 rounded-lg bg-[#0F1E29] hover:bg-[#162D3D] border border-[#00E5FF]/40 text-left transition-all active:scale-95"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-heading font-bold text-xs text-white">
                                {skill.name}
                              </span>
                              <span className="font-mono text-[9px] text-[#00E5FF]">
                                Pwr {skill.power}
                              </span>
                            </div>
                            <span className="font-mono text-[9px] text-zinc-400 block truncate">
                              {skill.description}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setBattleSubMenu('main')}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white uppercase py-0.5 text-center"
                      >
                        &larr; Voltar
                      </button>
                    </div>
                  )}

                  {/* Submenu de Itens em Batalha */}
                  {battleSubMenu === 'items' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                        {inventory
                          .filter((i) => i.category === 'potion')
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                const used = consumeItem(item.id);
                                if (used) {
                                  audio.playTone({
                                    frequency: 660,
                                    duration: 0.15,
                                    type: 'sine',
                                  });
                                  setBattleSubMenu('main');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1C2542] border border-[#8257E5]/40 text-left flex items-center gap-2"
                            >
                              <span className="text-lg">{item.icon}</span>
                              <div className="flex-1 truncate">
                                <span className="text-xs font-semibold text-white block truncate">
                                  {item.name}
                                </span>
                                <span className="text-[9px] font-mono text-[#04D361]">
                                  +25 HP (x{item.quantity})
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setBattleSubMenu('main')}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white uppercase py-0.5 text-center"
                      >
                        &larr; Voltar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. CONTROLES VIRTUAIS MOBILE (VirtualDPad) */}
      {showMobileControls && (
        <section className="w-full bg-[#070A18]/90 border-t border-[#182138] backdrop-blur-md">
          <VirtualDPad
            onActionA={() => {
              // Interação no jogo
              audio.playTone({ frequency: 440, duration: 0.05, type: 'triangle' });
            }}
            onActionB={() => {
              // Cancelar ou Correr
              audio.playTone({ frequency: 320, duration: 0.05, type: 'square' });
            }}
            onMenu={() => {
              setShowInventoryModal(true);
            }}
          />
        </section>
      )}

      {/* 4. FOOTER COM LEGENDA DE CONTROLES */}
      <footer className="w-full border-t border-[#151D30] bg-[#050814] px-4 py-2 text-center text-zinc-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                W
              </kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                A
              </kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                S
              </kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                D
              </kbd>{' '}
              Mover
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                M
              </kbd>{' '}
              Mute
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                I
              </kbd>{' '}
              Bag
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#10182E] border border-[#203055] text-zinc-300">
                P
              </kbd>{' '}
              Debug
            </span>
          </div>
          <div>
            <span>NEXUS CODE &copy; 2026 // Canvas 2D Engine 60 FPS</span>
          </div>
        </div>
      </footer>

      {/* MODAL 1: INVENTÁRIO (BAG) */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B1021] border border-[#253556] rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1E2B47] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎒</span>
                <h2 className="font-heading font-bold text-base text-white">
                  Inventário de Desenvolvedor
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                className="w-7 h-7 rounded-lg bg-[#141C30] hover:bg-[#1E2B47] text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {inventory.map((item: GameItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#080C1A] border border-[#1A253D] hover:border-[#8257E5]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {item.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#00E5FF] px-1.5 py-0.2 rounded bg-[#00E5FF]/10">
                          x{item.quantity}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {item.category === 'potion' && (
                    <button
                      type="button"
                      onClick={() => {
                        const used = consumeItem(item.id);
                        if (used) {
                          audio.playTone({
                            frequency: 580,
                            duration: 0.12,
                            type: 'sine',
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0F281E] hover:bg-[#173D2F] border border-[#04D361]/60 text-[#04D361] font-mono text-[10px] uppercase font-bold transition-all active:scale-95"
                    >
                      Usar
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2B47] flex justify-between items-center text-xs font-mono text-zinc-400">
              <span>Saldo: 💎 {player.bits} Bits</span>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#141E34] text-white hover:bg-[#1F2E50]"
              >
                Fechar (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SELEÇÃO DE STARTERS */}
      {showStartersModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0B1021] border border-[#253556] rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1E2B47] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧬</span>
                <h2 className="font-heading font-bold text-base text-white">
                  Selecione seu Starter Companheiro
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowStartersModal(false)}
                className="w-7 h-7 rounded-lg bg-[#141C30] hover:bg-[#1E2B47] text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {startersCatalog.map((starter: StarterCreature) => {
                const isSelected = starter.id === selectedStarter.id;
                return (
                  <div
                    key={starter.id}
                    onClick={() => {
                      setStarter(starter.id);
                      audio.playTone({
                        frequency: 600,
                        duration: 0.1,
                        type: 'square',
                      });
                      setShowStartersModal(false);
                    }}
                    className={`p-3 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-[#141C34] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)] scale-102'
                        : 'bg-[#080C1A] border-[#1C2844] hover:border-[#8257E5]/60 hover:bg-[#0E152B]'
                    }`}
                  >
                    <div className="text-3xl mb-2 text-center">{starter.icon}</div>
                    <div className="text-center">
                      <span className="font-heading font-bold text-xs text-white block">
                        {starter.name}
                      </span>
                      <span
                        className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded mt-1 inline-block"
                        style={{
                          backgroundColor: `${starter.color}20`,
                          color: starter.color,
                        }}
                      >
                        {starter.type}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="mt-3 space-y-1 text-[9px] font-mono text-zinc-400">
                      <div className="flex justify-between">
                        <span>HP</span>
                        <span className="text-white">{starter.maxHp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ATK</span>
                        <span className="text-white">{starter.attack}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DEF</span>
                        <span className="text-white">{starter.defense}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SPD</span>
                        <span className="text-white">{starter.speed}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1E2B47] flex justify-end">
              <button
                type="button"
                onClick={() => setShowStartersModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#141E34] text-white hover:bg-[#1F2E50] text-xs font-mono"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONSOLE DE ATAQUE MONACO (PR #03) */}
      {activeCodeSkill && (
        <CodeBattleModal
          skill={activeCodeSkill}
          onAttackSuccess={(damage, logMsg) => {
            attackEnemy(activeCodeSkill.id);
            setActiveCodeSkill(null);
            setBattleSubMenu('main');
          }}
          onAttackFailed={(damageReceived, errorLog) => {
            updateHp(-damageReceived);
            setActiveCodeSkill(null);
            setBattleSubMenu('main');
          }}
          onClose={() => setActiveCodeSkill(null)}
        />
      )}

      {/* MODAL 4: GITEA REAL GIT INTEGRATION (PR #04) */}
      {showGitModal && (
        <GitTierModal onClose={() => setShowGitModal(false)} />
      )}

      {/* WIDGET: LUMI SOCRATIC AI TUTOR (PR #04) */}
      <LumiAITutorDrawer />

      {/* MODAL 5: METAMORFOSE / EVOLUÇÃO DO PET COMPANION */}
      <PetEvolutionModal />

      {/* WIDGET: MASCOTE GATO PRETO NO HUD */}
      <BlackCatHudWidget />

      {/* MODAL: LIÇÃO VISUAL (MODO ZEN) */}
      <VisualLessonModal />
    </main>
  );
}
