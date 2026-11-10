'use client';

/**
 * GameCanvas.tsx
 * NEXUS CODE - Canvas 2D Game Engine React Component
 * 
 * Componente cliente com montagem segura do Canvas 2D, resolução nativa pixel-perfect
 * de 1024x576 (16:9), sincronização reativa com useGameStore e cleanup estrito
 * de requestAnimationFrame, event listeners e Web Audio API no unmount.
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, Boundary, InteractiveProp } from '../engine';
import { createGeneratedGameWorld } from '../engine/ProceduralAssets';
import { useGameStore } from '../stores/useGameStore';

export interface GameCanvasProps {
  className?: string;
  onEngineReady?: (engine: GameEngine) => void;
  showOverlayControls?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  className = '',
  onEngineReady,
  showOverlayControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeProp, setActiveProp] = useState<InteractiveProp | null>(null);

  // Seletores do Zustand
  const gameMode = useGameStore((s) => s.gameMode);
  const currentBiome = useGameStore((s) => s.currentBiome);
  const setBiome = useGameStore((s) => s.setBiome);
  const isMuted = useGameStore((s) => s.isMuted);
  const volume = useGameStore((s) => s.volume);
  const debugMode = useGameStore((s) => s.debugMode);
  const incrementSteps = useGameStore((s) => s.incrementSteps);
  const setPlayerDirection = useGameStore((s) => s.setPlayerDirection);
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const startBattle = useGameStore((s) => s.startBattle);
  const addBits = useGameStore((s) => s.addBits);

  // 1. Inicialização segura e ciclo de vida do motor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDisposed = false;

    // Resolução física exata do canvas
    canvas.width = 1024;
    canvas.height = 576;

    // Cria assets procedurais do mundo de jogo no bioma ativo
    const { background, foreground, boundaries, battleZones, portals, interactiveProps, player } =
      createGeneratedGameWorld(currentBiome);

    if (isDisposed) return;

    // Instanciação do GameEngine desacoplado do React vDOM
    const engine = new GameEngine({
      canvas,
      player,
      background,
      foreground,
      boundaries,
      battleZones,
      portals,
      interactiveProps,
      speed: 4,
      encounterRate: 0.02,
      debug: debugMode,
      enableAudio: !isMuted,
      onStep: () => {
        incrementSteps();
      },
      onPlayerMove: (dir, hitbox) => {
        setPlayerDirection(dir);
        setPlayerPosition({ x: Math.round(hitbox.x), y: Math.round(hitbox.y) });
      },
      onPropInteract: (prop) => {
        setActiveProp(prop);
        if (prop.category === 'easter_egg' && prop.data?.bitsReward) {
          addBits(Number(prop.data.bitsReward));
        }
      },
      onPortalEnter: (_portal, targetBiome) => {
        const nextBiome = targetBiome as any;
        setBiome(nextBiome);
        const newWorld = createGeneratedGameWorld(nextBiome);
        engine.loadBiome(newWorld);
      },
      onBattleEncounter: (zone: Boundary) => {
        const zoneName = (zone.data?.sectorName as string) || 'Setor Desconhecido';
        startBattle({
          name: zoneName.includes('boss')
            ? 'Big-O Omega Titan'
            : zoneName.includes('matrix') || zoneName.includes('packet')
            ? 'DDOS Worm Cluster'
            : zoneName.includes('alpha')
            ? 'StackOverflow Specter'
            : 'NullPointer Demon',
          level: Math.floor(Math.random() * 3) + 3,
        });
      },
    });

    // Define a primeira aula como alvo do radar com Edge Pinning
    engine.setActiveQuestTarget({
      id: 'term_lesson_01',
      worldX: 10 * 48,
      worldY: 8 * 48,
      type: 'lesson',
      label: 'Terminal 01: Variáveis',
      isPrimaryTarget: true,
    });

    engineRef.current = engine;

    // Aplica volumes e mute iniciais
    engine.audio.setVolume(volume);
    if (isMuted) {
      engine.audio.mute();
    } else {
      engine.audio.unmute();
    }

    // Inicia o loop de animação 60 FPS
    engine.start();
    setIsReady(true);

    if (onEngineReady) {
      onEngineReady(engine);
    }

    // Exporta globalmente para integração com VirtualDPad e debug tools
    if (typeof window !== 'undefined') {
      (window as unknown as { __NEXUS_ENGINE__?: GameEngine }).__NEXUS_ENGINE__ = engine;
    }

    // Cleanup estrito no desmonte do componente
    return () => {
      isDisposed = true;
      setIsReady(false);

      if (typeof window !== 'undefined') {
        delete (window as unknown as { __NEXUS_ENGINE__?: GameEngine }).__NEXUS_ENGINE__;
      }

      if (engineRef.current) {
        engineRef.current.audio.silenceAll();
        engineRef.current.destroy();
        engineRef.current.audio.close();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Monta uma única vez

  // 2. Sincronização do modo de batalha
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (gameMode === 'battle') {
      engine.setBattleMode(true);
    } else if (gameMode === 'exploring') {
      engine.setBattleMode(false);
    }
  }, [gameMode]);

  // 3. Sincronização de Áudio (Mute e Volume)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.audio.setVolume(volume);
    if (isMuted) {
      engine.audio.mute();
    } else {
      engine.audio.unmute();
    }
  }, [isMuted, volume]);

  // 4. Sincronização de Debug
  useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.debug = debugMode;
    }
  }, [debugMode]);

  return (
    <div
      className={`relative w-full aspect-video max-w-[1024px] mx-auto rounded-xl overflow-hidden bg-[#050814] border border-[#1F293D] shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(4,211,97,0.1)] select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Canvas nativo 1024x576 com CSS pixel-perfect rendering */}
      <canvas
        ref={canvasRef}
        width={1024}
        height={576}
        className="w-full h-full block"
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* Loading state sutil antes da primeira inicialização */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050814] z-10 space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#8257E5] border-t-[#00E5FF] animate-spin" />
          <span className="font-mono text-xs text-[#00E5FF] tracking-widest uppercase animate-pulse">
            Carregando Motor 2D...
          </span>
        </div>
      )}

      {/* Scanlines CRT sutis retrô */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] z-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Borda holográfica interna nos cantos */}
      <div className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00E5FF]/60 z-20" />
      <div className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00E5FF]/60 z-20" />
      <div className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00E5FF]/60 z-20" />
      <div className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00E5FF]/60 z-20" />

      {/* HUD do Bioma Ativo (Top-Left) */}
      {isReady && (
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
          <div className="flex items-center gap-2 bg-[#071328]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#00E5FF]/40 shadow-lg">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                currentBiome === 'network_matrix'
                  ? 'bg-amber-400 shadow-[0_0_8px_#FFA116]'
                  : currentBiome === 'algorithm_coliseum'
                  ? 'bg-fuchsia-400 shadow-[0_0_8px_#8257E5]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#00E5FF]'
              }`}
            />
            <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
              {currentBiome === 'network_matrix'
                ? 'Network Matrix'
                : currentBiome === 'algorithm_coliseum'
                ? 'Algorithm Coliseum'
                : 'Circuit Valley'}
            </span>
          </div>
        </div>
      )}

      {/* Overlay de controles rápidos superiores no canvas */}
      {showOverlayControls && isReady && (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20 bg-[#0B1021]/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#1F293D]/80">
          <span className="inline-block w-2 h-2 rounded-full bg-[#04D361] animate-ping" />
          <span className="font-mono text-[10px] text-zinc-400">1024x576 60FPS</span>
        </div>
      )}

      {/* Modal / Card de Interação com Props (Lições, Easter Eggs, Desafios) */}
      {activeProp && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0A1226]/95 border-2 border-[#00E5FF]/60 rounded-2xl p-5 shadow-2xl shadow-cyan-950/80">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {activeProp.category === 'lesson'
                    ? '💻'
                    : activeProp.category === 'challenge'
                    ? '⚡'
                    : activeProp.category === 'easter_egg'
                    ? '🦆'
                    : '🚪'}
                </span>
                <div>
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    {activeProp.title}
                  </h3>
                  {activeProp.subtitle && (
                    <p className="font-mono text-[10px] text-cyan-400">
                      {activeProp.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProp(null)}
                className="text-zinc-400 hover:text-white font-mono text-xs px-2 py-1 rounded bg-slate-800/80 border border-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="font-mono text-xs text-zinc-300 space-y-2 mb-4">
              {activeProp.data?.dialogue ? (
                <p className="p-3 rounded-lg bg-[#060D1E] border border-cyan-950 text-cyan-200">
                  {String(activeProp.data.dialogue)}
                </p>
              ) : activeProp.category === 'lesson' ? (
                <p className="p-3 rounded-lg bg-[#060D1E] border border-cyan-950">
                  Terminal didático pronto para compilação. Pratique lógica algorítmica e ganhe bits!
                </p>
              ) : activeProp.category === 'challenge' ? (
                <p className="p-3 rounded-lg bg-[#060D1E] border border-purple-950/50 text-purple-200">
                  Desafio opcional de alta complexidade. Complete para desbloquear recompensas exclusivas!
                </p>
              ) : (
                <p className="p-3 rounded-lg bg-[#060D1E] border border-cyan-950">
                  Objeto interativo do ecossistema NEXUS CODE.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveProp(null)}
                className="font-mono text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg transition active:scale-95"
              >
                ENTENDIDO [ESC]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
