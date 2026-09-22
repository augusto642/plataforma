'use client';

/**
 * VirtualDPad.tsx
 * NEXUS CODE - Virtual Touch Controller for Mobile & Touchscreens
 * 
 * Controlador virtual com:
 * - touch-action: none estrito (sem zoom, scroll ou gestures intrusivos do SO)
 * - Feedback háptico via navigator.vibrate()
 * - D-Pad direcional responsivo (Up, Down, Left, Right)
 * - Botões de ação estilo console portátil (A, B, START, SELECT)
 * - Emulação simultânea de GameEngine.setKey() e KeyboardEvents globais
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameEngine } from '../engine';

export interface VirtualDPadProps {
  className?: string;
  onActionA?: () => void;
  onActionB?: () => void;
  onMenu?: () => void;
}

type DirectionKey = 'w' | 'a' | 's' | 'd';

export const VirtualDPad: React.FC<VirtualDPadProps> = ({
  className = '',
  onActionA,
  onActionB,
  onMenu,
}) => {
  const [activeKeys, setActiveKeys] = useState<Record<DirectionKey, boolean>>({
    w: false,
    a: false,
    s: false,
    d: false,
  });

  const [activeActions, setActiveActions] = useState<{
    a: boolean;
    b: boolean;
    menu: boolean;
  }>({
    a: false,
    b: false,
    menu: false,
  });

  // Vibração háptica tátil (15ms para direção, 25ms para ação)
  const triggerHaptic = useCallback((duration: number = 15) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Fallback silencioso caso não suportado
      }
    }
  }, []);

  // Helper para obter referência global do motor
  const getEngine = (): GameEngine | null => {
    if (typeof window !== 'undefined') {
      return (window as unknown as { __NEXUS_ENGINE__?: GameEngine }).__NEXUS_ENGINE__ || null;
    }
    return null;
  };

  // Handler ao pressionar uma direção
  const handleDirectionDown = useCallback(
    (key: DirectionKey) => {
      triggerHaptic(15);
      setActiveKeys((prev) => ({ ...prev, [key]: true }));

      const engine = getEngine();
      if (engine) {
        engine.setKey(key, true);
      }

      // Dispara evento de teclado para máxima compatibilidade
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            code:
              key === 'w'
                ? 'KeyW'
                : key === 'a'
                ? 'KeyA'
                : key === 's'
                ? 'KeyS'
                : 'KeyD',
            bubbles: true,
          })
        );
      }
    },
    [triggerHaptic]
  );

  // Handler ao soltar uma direção
  const handleDirectionUp = useCallback((key: DirectionKey) => {
    setActiveKeys((prev) => ({ ...prev, [key]: false }));

    const engine = getEngine();
    if (engine) {
      engine.setKey(key, false);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new KeyboardEvent('keyup', {
          key,
          code:
            key === 'w'
              ? 'KeyW'
              : key === 'a'
              ? 'KeyA'
              : key === 's'
              ? 'KeyS'
              : 'KeyD',
          bubbles: true,
        })
      );
    }
  }, []);

  // Cleanup de teclas pressionadas caso o usuário arraste o dedo para fora da tela
  useEffect(() => {
    const handleGlobalTouchEnd = () => {
      setActiveKeys({ w: false, a: false, s: false, d: false });
      const engine = getEngine();
      if (engine) {
        engine.releaseAllKeys();
      }
    };

    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('mouseup', handleGlobalTouchEnd);
    return () => {
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('mouseup', handleGlobalTouchEnd);
    };
  }, []);

  // Botão A (Confirm / Inspect / Interact)
  const handleActionAPress = () => {
    triggerHaptic(25);
    setActiveActions((p) => ({ ...p, a: true }));
    if (onActionA) {
      onActionA();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })
      );
    }
  };

  const handleActionARelease = () => {
    setActiveActions((p) => ({ ...p, a: false }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })
      );
    }
  };

  // Botão B (Cancel / Sprint)
  const handleActionBPress = () => {
    triggerHaptic(25);
    setActiveActions((p) => ({ ...p, b: true }));
    if (onActionB) {
      onActionB();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', bubbles: true })
      );
    }
  };

  const handleActionBRelease = () => {
    setActiveActions((p) => ({ ...p, b: false }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', bubbles: true })
      );
    }
  };

  return (
    <div
      className={`w-full max-w-[1024px] mx-auto px-4 py-3 flex items-center justify-between select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* 1. D-PAD CRUCIFORME (Lado Esquerdo) */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Base Obsidian D-Pad circular */}
        <div className="absolute inset-0 rounded-full bg-[#070A17] border border-[#19233A] shadow-inner shadow-black/70" />

        {/* CIMA (W / UP) */}
        <button
          type="button"
          onMouseDown={() => handleDirectionDown('w')}
          onMouseUp={() => handleDirectionUp('w')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleDirectionDown('w');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDirectionUp('w');
          }}
          className={`absolute top-1 w-11 h-12 rounded-t-lg flex items-center justify-center transition-all ${
            activeKeys.w
              ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_#00E5FF] translate-y-0.5'
              : 'bg-[#0F172A] text-zinc-300 border border-[#273553] active:bg-[#00E5FF]/40'
          }`}
          style={{ touchAction: 'none' }}
          aria-label="Mover para Cima"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
        </button>

        {/* ESQUERDA (A / LEFT) */}
        <button
          type="button"
          onMouseDown={() => handleDirectionDown('a')}
          onMouseUp={() => handleDirectionUp('a')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleDirectionDown('a');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDirectionUp('a');
          }}
          className={`absolute left-1 w-12 h-11 rounded-l-lg flex items-center justify-center transition-all ${
            activeKeys.a
              ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_#00E5FF] -translate-x-0.5'
              : 'bg-[#0F172A] text-zinc-300 border border-[#273553] active:bg-[#00E5FF]/40'
          }`}
          style={{ touchAction: 'none' }}
          aria-label="Mover para Esquerda"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M4 12l8-8v5h8v6h-8v5z" />
          </svg>
        </button>

        {/* CENTRO NEUTRO DE APOIO */}
        <div className="w-10 h-10 bg-[#0B1020] rounded-sm flex items-center justify-center z-10 pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-[#1A2338] border border-[#2B3B5E]" />
        </div>

        {/* DIREITA (D / RIGHT) */}
        <button
          type="button"
          onMouseDown={() => handleDirectionDown('d')}
          onMouseUp={() => handleDirectionUp('d')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleDirectionDown('d');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDirectionUp('d');
          }}
          className={`absolute right-1 w-12 h-11 rounded-r-lg flex items-center justify-center transition-all ${
            activeKeys.d
              ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_#00E5FF] translate-x-0.5'
              : 'bg-[#0F172A] text-zinc-300 border border-[#273553] active:bg-[#00E5FF]/40'
          }`}
          style={{ touchAction: 'none' }}
          aria-label="Mover para Direita"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M20 12l-8-8v5H4v6h8v5z" />
          </svg>
        </button>

        {/* BAIXO (S / DOWN) */}
        <button
          type="button"
          onMouseDown={() => handleDirectionDown('s')}
          onMouseUp={() => handleDirectionUp('s')}
          onTouchStart={(e) => {
            e.preventDefault();
            handleDirectionDown('s');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDirectionUp('s');
          }}
          className={`absolute bottom-1 w-11 h-12 rounded-b-lg flex items-center justify-center transition-all ${
            activeKeys.s
              ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_#00E5FF] translate-y-0.5'
              : 'bg-[#0F172A] text-zinc-300 border border-[#273553] active:bg-[#00E5FF]/40'
          }`}
          style={{ touchAction: 'none' }}
          aria-label="Mover para Baixo"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 20l8-8h-5V4H9v8H4z" />
          </svg>
        </button>
      </div>

      {/* 2. BOTÕES CENTRAIS (SELECT / START - MENU) */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          {/* BOTÃO SELECT / INFO */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                const engine = getEngine();
                if (engine) engine.debug = !engine.debug;
              }}
              className="w-12 h-5 rounded-full bg-[#12162A] border border-[#25324D] active:bg-[#8257E5]/50 active:scale-95 transition-all"
              style={{ touchAction: 'none' }}
              aria-label="Toggle Debug"
            />
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
              DEBUG
            </span>
          </div>

          {/* BOTÃO START / MENU */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                if (onMenu) onMenu();
              }}
              className="w-12 h-5 rounded-full bg-[#12162A] border border-[#25324D] active:bg-[#04D361]/50 active:scale-95 transition-all"
              style={{ touchAction: 'none' }}
              aria-label="Menu / Inventário"
            />
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
              MENU
            </span>
          </div>
        </div>

        <span className="font-mono text-[9px] text-zinc-600 tracking-widest hidden sm:inline">
          NEXUS D-PAD // V1.0
        </span>
      </div>

      {/* 3. BOTÕES DE AÇÃO A / B (Lado Direito) */}
      <div className="relative w-40 h-36 flex items-center justify-center">
        {/* BOTÃO B (Cancel / Run) */}
        <div className="absolute left-2 bottom-4 flex flex-col items-center gap-1">
          <button
            type="button"
            onMouseDown={handleActionBPress}
            onMouseUp={handleActionBRelease}
            onTouchStart={(e) => {
              e.preventDefault();
              handleActionBPress();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleActionBRelease();
            }}
            className={`w-14 h-14 rounded-full font-heading font-black text-lg flex items-center justify-center transition-all ${
              activeActions.b
                ? 'bg-[#F43F5E] text-white shadow-[0_0_20px_#F43F5E] scale-95'
                : 'bg-[#181524] text-[#F43F5E] border-2 border-[#F43F5E]/60 shadow-lg shadow-black/50 active:scale-95'
            }`}
            style={{ touchAction: 'none' }}
            aria-label="Botão B - Cancelar ou Correr"
          >
            B
          </button>
          <span className="font-mono text-[9px] text-zinc-500 uppercase">RUN</span>
        </div>

        {/* BOTÃO A (Interact / Action) */}
        <div className="absolute right-2 top-2 flex flex-col items-center gap-1">
          <button
            type="button"
            onMouseDown={handleActionAPress}
            onMouseUp={handleActionARelease}
            onTouchStart={(e) => {
              e.preventDefault();
              handleActionAPress();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleActionARelease();
            }}
            className={`w-14 h-14 rounded-full font-heading font-black text-lg flex items-center justify-center transition-all ${
              activeActions.a
                ? 'bg-[#04D361] text-black shadow-[0_0_20px_#04D361] scale-95'
                : 'bg-[#0F1E1A] text-[#04D361] border-2 border-[#04D361]/60 shadow-lg shadow-black/50 active:scale-95'
            }`}
            style={{ touchAction: 'none' }}
            aria-label="Botão A - Ação ou Interagir"
          >
            A
          </button>
          <span className="font-mono text-[9px] text-zinc-500 uppercase">ACTION</span>
        </div>
      </div>
    </div>
  );
};

export default VirtualDPad;
