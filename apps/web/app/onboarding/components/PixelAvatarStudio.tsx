'use client';

/**
 * PixelAvatarStudio.tsx
 * NEXUS CODE - Pixel Art Character Creator Studio
 * 
 * Estúdio de personalização de personagem Pixel Art no estilo RPG retrô 16-bit:
 * - Preview interativo em Canvas 2D em 4 direções (Frente, Costas, Esquerda, Direita)
 * - Micro-animação de respiração/passo (idle bounce)
 * - Paletas de cor de pele, cabelo, roupas e acessórios holográficos
 * - Gerador aleatório ("🎲 GERAR ALEATÓRIO")
 * - Sincronização direta com Zustand useGameStore
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore, AvatarConfig } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';
import { useNicknameDebounce } from '../../hooks/useNicknameDebounce';

export const SKIN_TONES = [
  { id: '#FFDFBA', label: 'Cyber Light' },
  { id: '#E0AC69', label: 'Warm Beige' },
  { id: '#C68642', label: 'Deep Bronze' },
  { id: '#8D5524', label: 'Obsidian Warm' },
  { id: '#3A2E39', label: 'Midnight Cyber' },
  { id: '#00E5FF', label: 'Neon Android' },
];

export const HAIR_STYLES = [
  { id: 'spikes', label: 'Cyber Spikes' },
  { id: 'undercut', label: 'Hacker Undercut' },
  { id: 'afro', label: 'Retro Afro' },
  { id: 'ponytail', label: 'Quantum Braid' },
  { id: 'bob', label: 'Matrix Bob' },
  { id: 'beanie', label: 'Terminal Beanie' },
];

export const HAIR_COLORS = [
  { id: '#00E5FF', label: 'Neon Cyan' },
  { id: '#04D361', label: 'Matrix Green' },
  { id: '#8257E5', label: 'Plasma Purple' },
  { id: '#FFA116', label: 'Solar Amber' },
  { id: '#FF0055', label: 'Cyber Magenta' },
  { id: '#FFFFFF', label: 'Ghost White' },
  { id: '#1E293B', label: 'Midnight Black' },
];

export const OUTFITS = [
  { id: 'hoodie', label: 'Terminal Hoodie' },
  { id: 'jacket', label: 'Overclock Techwear' },
  { id: 'armor', label: 'Cyber Armor Plate' },
  { id: 'trenchcoat', label: 'Matrix Trenchcoat' },
  { id: 'tee', label: 'Vintage 8-Bit Tee' },
];

export const OUTFIT_COLORS = [
  { id: '#0B1021', label: 'Dark Obsidian' },
  { id: '#1E293B', label: 'Slate Grey' },
  { id: '#8257E5', label: 'Royal Violet' },
  { id: '#04D361', label: 'Emerald Cyber' },
  { id: '#0070F3', label: 'Electric Blue' },
  { id: '#E11D48', label: 'Crimson Crash' },
];

export const ACCESSORIES = [
  { id: 'none', label: 'Nenhum' },
  { id: 'visor', label: 'AR Cyber Visor' },
  { id: 'glasses', label: 'Retro 90s Wireframe' },
  { id: 'neural_jack', label: 'Neural Jack Port' },
  { id: 'headphones', label: 'Lo-Fi Studio Headset' },
];

export const BACKDROP_COLORS = [
  { id: '#00E5FF', label: 'Cyan Cyber' },
  { id: '#04D361', label: 'Matrix Green' },
  { id: '#8257E5', label: 'Plasma Purple' },
  { id: '#FFA116', label: 'Solar Amber' },
  { id: '#F43F5E', label: 'Crimson Rose' },
  { id: '#0070F3', label: 'Electric Blue' },
  { id: '#EC4899', label: 'Neon Pink' },
  { id: '#0B1021', label: 'Void Obsidian' },
];

interface PixelAvatarStudioProps {
  onComplete?: () => void;
  submitLabel?: string;
}

export const PixelAvatarStudio: React.FC<PixelAvatarStudioProps> = ({ onComplete, submitLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audio = AudioSynthesizer.getInstance();

  // Zustand Store
  const player = useGameStore((s) => s.player);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const updatePlayerAvatar = useGameStore((s) => s.updatePlayerAvatar);

  // Estados locais do Avatar
  const [avatar, setAvatar] = useState<AvatarConfig>({
    ...player.avatar,
    backdropColor: player.avatar.backdropColor || '#00E5FF',
  });
  const [characterName, setCharacterName] = useState<string>(player.name);
  const [direction, setDirection] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [animFrame, setAnimFrame] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'skin' | 'hair' | 'outfit' | 'backdrop' | 'accessory'>('skin');

  // Hook de validação de nickname com debounce de 350ms
  const { isChecking, isAvailable, error: nicknameError, validateNickname } = useNicknameDebounce(player.name, 350);

  // Loop de animação de respiração (Idle tick)
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimFrame((f) => (f === 0 ? 1 : 0));
    }, 450);
    return () => clearInterval(timer);
  }, []);

  // Sincroniza estado local com store ao alterar
  useEffect(() => {
    updatePlayerAvatar(avatar);
  }, [avatar, updatePlayerAvatar]);

  // Renderizador do Canvas Pixel Art
  const drawPixelAvatar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Escala de pixels (cada pixel virtual tem 4x4 ou 5x5 no canvas de 160x160)
    const pSize = 5;
    const startX = 8;
    const bounceOffset = animFrame === 1 ? pSize : 0;
    const startY = 6 + (animFrame === 1 ? 1 : 0);

    // 0. Halo / Aura de Fundo Holográfica (Backdrop Aura)
    const haloColor = avatar.backdropColor || '#00E5FF';
    ctx.fillStyle = haloColor + '18';
    ctx.beginPath();
    ctx.arc(80, 78, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = haloColor + '44';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 1. Sombra circular nos pés
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(80, 140, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pernas e Calças
    ctx.fillStyle = '#080E1E';
    // Perna Esquerda
    ctx.fillRect((startX + 3) * pSize, (startY + 19) * pSize, 3 * pSize, 6 * pSize);
    // Perna Direita
    ctx.fillRect((startX + 8) * pSize, (startY + 19) * pSize, 3 * pSize, 6 * pSize);
    // Botas Neon
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect((startX + 2) * pSize, (startY + 24) * pSize, 4 * pSize, 2 * pSize);
    ctx.fillRect((startX + 8) * pSize, (startY + 24) * pSize, 4 * pSize, 2 * pSize);

    // 3. Tronco e Roupa
    ctx.fillStyle = avatar.outfitColor;
    ctx.fillRect((startX + 2) * pSize, (startY + 10) * pSize + bounceOffset, 10 * pSize, 9 * pSize);

    // Detalhe da Roupa (zíper ou logo néon)
    ctx.fillStyle = '#04D361';
    ctx.fillRect((startX + 6) * pSize, (startY + 11) * pSize + bounceOffset, 2 * pSize, 7 * pSize);

    // Braços
    ctx.fillStyle = avatar.skinColor;
    if (direction === 'left') {
      ctx.fillRect((startX + 1) * pSize, (startY + 11) * pSize + bounceOffset, 3 * pSize, 7 * pSize);
    } else if (direction === 'right') {
      ctx.fillRect((startX + 10) * pSize, (startY + 11) * pSize + bounceOffset, 3 * pSize, 7 * pSize);
    } else {
      ctx.fillRect((startX + 0) * pSize, (startY + 11) * pSize + bounceOffset, 2 * pSize, 7 * pSize);
      ctx.fillRect((startX + 12) * pSize, (startY + 11) * pSize + bounceOffset, 2 * pSize, 7 * pSize);
    }

    // 4. Cabeça e Pele
    ctx.fillStyle = avatar.skinColor;
    ctx.fillRect((startX + 3) * pSize, (startY + 2) * pSize + bounceOffset, 8 * pSize, 8 * pSize);

    // 5. Rosto / Olhos (se não estiver de costas)
    if (direction !== 'up') {
      // Olhos
      ctx.fillStyle = '#020617';
      if (direction === 'down') {
        ctx.fillRect((startX + 4) * pSize, (startY + 5) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
        ctx.fillRect((startX + 8) * pSize, (startY + 5) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
        // Brilho da íris neon
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect((startX + 5) * pSize, (startY + 5) * pSize + bounceOffset, pSize, pSize);
        ctx.fillRect((startX + 9) * pSize, (startY + 5) * pSize + bounceOffset, pSize, pSize);
      } else if (direction === 'left') {
        ctx.fillRect((startX + 3) * pSize, (startY + 5) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect((startX + 3) * pSize, (startY + 5) * pSize + bounceOffset, pSize, pSize);
      } else if (direction === 'right') {
        ctx.fillRect((startX + 9) * pSize, (startY + 5) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect((startX + 10) * pSize, (startY + 5) * pSize + bounceOffset, pSize, pSize);
      }
    }

    // 6. Cabelo e Estilo
    ctx.fillStyle = avatar.hairColor;
    if (avatar.hairStyle === 'spikes') {
      ctx.fillRect((startX + 2) * pSize, (startY + 0) * pSize + bounceOffset, 10 * pSize, 3 * pSize);
      ctx.fillRect((startX + 3) * pSize, (startY - 2) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
      ctx.fillRect((startX + 6) * pSize, (startY - 3) * pSize + bounceOffset, 2 * pSize, 3 * pSize);
      ctx.fillRect((startX + 9) * pSize, (startY - 2) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
    } else if (avatar.hairStyle === 'undercut') {
      ctx.fillRect((startX + 3) * pSize, (startY + 0) * pSize + bounceOffset, 9 * pSize, 3 * pSize);
      ctx.fillRect((startX + 3) * pSize, (startY - 1) * pSize + bounceOffset, 7 * pSize, 2 * pSize);
    } else if (avatar.hairStyle === 'afro') {
      ctx.fillRect((startX + 1) * pSize, (startY - 2) * pSize + bounceOffset, 12 * pSize, 6 * pSize);
    } else if (avatar.hairStyle === 'ponytail') {
      ctx.fillRect((startX + 2) * pSize, (startY + 0) * pSize + bounceOffset, 10 * pSize, 3 * pSize);
      ctx.fillRect((startX + 11) * pSize, (startY + 2) * pSize + bounceOffset, 3 * pSize, 7 * pSize);
    } else if (avatar.hairStyle === 'bob') {
      ctx.fillRect((startX + 2) * pSize, (startY + 0) * pSize + bounceOffset, 10 * pSize, 3 * pSize);
      ctx.fillRect((startX + 2) * pSize, (startY + 3) * pSize + bounceOffset, 2 * pSize, 5 * pSize);
      ctx.fillRect((startX + 10) * pSize, (startY + 3) * pSize + bounceOffset, 2 * pSize, 5 * pSize);
    } else if (avatar.hairStyle === 'beanie') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect((startX + 2) * pSize, (startY - 2) * pSize + bounceOffset, 10 * pSize, 5 * pSize);
      ctx.fillStyle = '#00E5FF';
      ctx.fillRect((startX + 2) * pSize, (startY + 2) * pSize + bounceOffset, 10 * pSize, 1 * pSize);
    }

    // 7. Acessórios
    if (avatar.accessory === 'visor' && direction !== 'up') {
      ctx.fillStyle = '#FF0055';
      ctx.fillRect((startX + 3) * pSize, (startY + 4) * pSize + bounceOffset, 8 * pSize, 2 * pSize);
      ctx.fillStyle = '#00E5FF';
      ctx.fillRect((startX + 4) * pSize, (startY + 4) * pSize + bounceOffset, 6 * pSize, 1 * pSize);
    } else if (avatar.accessory === 'glasses' && direction !== 'up') {
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      ctx.strokeRect((startX + 3) * pSize, (startY + 4) * pSize + bounceOffset, 3 * pSize, 3 * pSize);
      ctx.strokeRect((startX + 8) * pSize, (startY + 4) * pSize + bounceOffset, 3 * pSize, 3 * pSize);
    } else if (avatar.accessory === 'headphones') {
      ctx.fillStyle = '#8257E5';
      ctx.fillRect((startX + 1) * pSize, (startY + 3) * pSize + bounceOffset, 2 * pSize, 4 * pSize);
      ctx.fillRect((startX + 11) * pSize, (startY + 3) * pSize + bounceOffset, 2 * pSize, 4 * pSize);
      ctx.fillRect((startX + 2) * pSize, (startY - 1) * pSize + bounceOffset, 10 * pSize, 1 * pSize);
    } else if (avatar.accessory === 'neural_jack') {
      ctx.fillStyle = '#04D361';
      ctx.fillRect((startX + 11) * pSize, (startY + 5) * pSize + bounceOffset, 2 * pSize, 2 * pSize);
    }
  }, [avatar, direction, animFrame]);

  useEffect(() => {
    drawPixelAvatar();
  }, [drawPixelAvatar]);

  // Função para Gerar Avatar Aleatório
  const handleRandomize = () => {
    void audio.playTone({ frequency: 950, duration: 0.08, type: 'triangle' });
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id;
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomOutfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id;
    const randomOutfitColor = OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)].id;
    const randomBackdrop = BACKDROP_COLORS[Math.floor(Math.random() * BACKDROP_COLORS.length)].id;
    const randomAccessory = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id;

    setAvatar({
      skinColor: randomSkin,
      hairStyle: randomHair,
      hairColor: randomHairColor,
      outfit: randomOutfit,
      outfitColor: randomOutfitColor,
      backdropColor: randomBackdrop,
      accessory: randomAccessory,
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl rounded-3xl border border-cyan-900/60 bg-[#070D1E]/95 p-6 md:p-8 shadow-2xl backdrop-blur-md">
      {/* Header do Customizador */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-950 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-[#00E5FF]">⚡</span> CUSTOMIZADOR DE PERSONAGEM
          </h2>
          <p className="font-mono text-xs text-slate-400">
            Forje sua identidade pixel art no universo NEXUS.
          </p>
        </div>

        {/* Input de Nome do Jogador com Validação Debounce */}
        <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
          <div className="flex items-center space-x-3">
            <label className="font-mono text-xs text-cyan-400 font-semibold">CODENAME:</label>
            <div className="relative">
              <input
                type="text"
                value={characterName}
                onChange={(e) => {
                  setCharacterName(e.target.value);
                  setPlayerName(e.target.value);
                  validateNickname(e.target.value);
                }}
                placeholder="Seu codename hacker..."
                maxLength={16}
                className={`rounded-lg border px-4 py-1.5 font-mono text-sm text-white focus:outline-none transition-all ${
                  isChecking
                    ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 animate-pulse'
                    : isAvailable === true
                    ? 'border-[#04D361] bg-emerald-950/20 text-[#04D361] ring-1 ring-[#04D361]'
                    : isAvailable === false
                    ? 'border-[#F43F5E] bg-rose-950/20 text-[#F43F5E] ring-1 ring-[#F43F5E]'
                    : 'border-cyan-800 bg-[#030712] focus:border-[#00E5FF]'
                }`}
              />
              {isChecking && (
                <span className="absolute right-2.5 top-2 text-xs text-cyan-400 animate-spin">⏳</span>
              )}
              {isAvailable === true && (
                <span className="absolute right-2.5 top-2 text-xs text-[#04D361] font-bold">✓</span>
              )}
              {isAvailable === false && (
                <span className="absolute right-2.5 top-2 text-xs text-[#F43F5E] font-bold">✕</span>
              )}
            </div>
          </div>
          {/* Mensagem de Feedback do Debounce */}
          <div className="mt-1 font-mono text-[10px] h-3.5">
            {isChecking && <span className="text-cyan-400">Verificando disponibilidade na rede...</span>}
            {isAvailable === true && <span className="text-[#04D361]">✓ Codename disponível para registro!</span>}
            {isAvailable === false && <span className="text-[#F43F5E]">{nicknameError || 'Codename indisponível'}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel Esquerdo: Canvas Preview e Controles de Rotação */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {/* Box Holográfica de Exibição */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-cyan-500/50 bg-[#030611] p-6 shadow-2xl shadow-cyan-950/60">
            {/* Hologram Scan Grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  'radial-gradient(#00E5FF 1px, transparent 1px), radial-gradient(#00E5FF 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* Badge de Nível / Codename */}
            <div className="mb-3 rounded-full bg-cyan-950/80 px-4 py-1 border border-cyan-800 font-mono text-xs text-cyan-300 font-bold">
              LVL. 01 // {characterName.toUpperCase() || 'ANONYMOUS'}
            </div>

            {/* Canvas 2D Pixel-Art Preview */}
            <canvas
              ref={canvasRef}
              width={160}
              height={160}
              className="relative z-10 h-48 w-48 rounded-xl border border-cyan-900/60 bg-[#050A19] shadow-inner"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Seletor de Rotação (Direção 4-Way) */}
            <div className="mt-4 flex items-center space-x-2">
              <span className="font-mono text-[11px] text-slate-400 mr-1">VISÃO:</span>
              {(['down', 'up', 'left', 'right'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => {
                    setDirection(dir);
                    void audio.playTone({ frequency: 540, duration: 0.05, type: 'sine' });
                  }}
                  className={`rounded-md px-3 py-1 font-mono text-xs font-bold transition ${
                    direction === dir
                      ? 'bg-[#00E5FF] text-black shadow-md shadow-cyan-400/30'
                      : 'bg-[#0A1428] text-slate-400 hover:text-white'
                  }`}
                >
                  {dir === 'down' ? 'Frente' : dir === 'up' ? 'Costas' : dir === 'left' ? 'Esq.' : 'Dir.'}
                </button>
              ))}
            </div>

            {/* Botão Randomize */}
            <button
              type="button"
              onClick={handleRandomize}
              className="mt-5 w-full flex items-center justify-center space-x-2 rounded-xl border border-amber-500/50 bg-amber-500/10 py-2.5 font-mono text-xs font-bold text-amber-400 transition hover:bg-amber-500 hover:text-black shadow-lg shadow-amber-950/40"
            >
              <span>🎲 GERAR ALEATÓRIO</span>
            </button>
          </div>
        </div>

        {/* Painel Direito: Abas e Opções de Customização */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Barra de Abas de Categoria */}
          <div className="flex border-b border-cyan-950 space-x-2">
            {[
              { id: 'skin', label: '1. Pele' },
              { id: 'hair', label: '2. Cabelo' },
              { id: 'outfit', label: '3. Traje' },
              { id: 'backdrop', label: '4. Fundo' },
              { id: 'accessory', label: '5. Gadgets' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as typeof activeTab);
                  void audio.playTone({ frequency: 620, duration: 0.04, type: 'sine' });
                }}
                className={`pb-3 px-4 font-mono text-xs font-bold transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#00E5FF] text-[#00E5FF]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo da Aba 1: Pele */}
          {activeTab === 'skin' && (
            <div className="space-y-4">
              <label className="font-mono text-xs text-slate-300 font-semibold block">
                SELECIONE O TOM DE PELE:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => {
                      setAvatar((a) => ({ ...a, skinColor: tone.id }));
                      void audio.playTone({ frequency: 600, duration: 0.03, type: 'sine' });
                    }}
                    className={`flex items-center space-x-3 rounded-xl border p-3 transition ${
                      avatar.skinColor === tone.id
                        ? 'border-[#00E5FF] bg-cyan-950/40 shadow-md shadow-cyan-900/30'
                        : 'border-cyan-950 bg-[#0A1324] hover:border-cyan-800'
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: tone.id }}
                    />
                    <span className="font-mono text-xs text-slate-300 font-medium">
                      {tone.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 2: Cabelo */}
          {activeTab === 'hair' && (
            <div className="space-y-5">
              <div>
                <label className="font-mono text-xs text-slate-300 font-semibold block mb-3">
                  ESTILO DO CABELO:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setAvatar((a) => ({ ...a, hairStyle: style.id }));
                        void audio.playTone({ frequency: 650, duration: 0.03, type: 'sine' });
                      }}
                      className={`rounded-xl border py-2.5 px-3 font-mono text-xs transition ${
                        avatar.hairStyle === style.id
                          ? 'border-[#00E5FF] bg-cyan-950/50 text-[#00E5FF] font-bold shadow-md shadow-cyan-900/40'
                          : 'border-cyan-950 bg-[#0A1324] text-slate-400 hover:text-white'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-xs text-slate-300 font-semibold block mb-3">
                  COR DO CABELO:
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setAvatar((a) => ({ ...a, hairColor: color.id }));
                        void audio.playTone({ frequency: 700, duration: 0.03, type: 'sine' });
                      }}
                      className={`flex items-center space-x-2 rounded-xl border p-2.5 transition ${
                        avatar.hairColor === color.id
                          ? 'border-[#00E5FF] bg-cyan-950/40'
                          : 'border-cyan-950 bg-[#0A1324]'
                      }`}
                    >
                      <div
                        className="h-5 w-5 rounded-full border border-white/20"
                        style={{ backgroundColor: color.id }}
                      />
                      <span className="font-mono text-xs text-slate-300">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 3: Traje */}
          {activeTab === 'outfit' && (
            <div className="space-y-5">
              <div>
                <label className="font-mono text-xs text-slate-300 font-semibold block mb-3">
                  MODELO DE TRAJE:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {OUTFITS.map((outfit) => (
                    <button
                      key={outfit.id}
                      type="button"
                      onClick={() => {
                        setAvatar((a) => ({ ...a, outfit: outfit.id }));
                        void audio.playTone({ frequency: 620, duration: 0.03, type: 'sine' });
                      }}
                      className={`rounded-xl border py-2.5 px-3 font-mono text-xs transition ${
                        avatar.outfit === outfit.id
                          ? 'border-[#04D361] bg-emerald-950/40 text-[#04D361] font-bold shadow-md shadow-emerald-900/30'
                          : 'border-cyan-950 bg-[#0A1324] text-slate-400 hover:text-white'
                      }`}
                    >
                      {outfit.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-xs text-slate-300 font-semibold block mb-3">
                  COR DO TRAJE:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {OUTFIT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setAvatar((a) => ({ ...a, outfitColor: color.id }));
                        void audio.playTone({ frequency: 680, duration: 0.03, type: 'sine' });
                      }}
                      className={`flex items-center space-x-2 rounded-xl border p-2.5 transition ${
                        avatar.outfitColor === color.id
                          ? 'border-[#04D361] bg-emerald-950/40'
                          : 'border-cyan-950 bg-[#0A1324]'
                      }`}
                    >
                      <div
                        className="h-5 w-5 rounded-full border border-white/20"
                        style={{ backgroundColor: color.id }}
                      />
                      <span className="font-mono text-xs text-slate-300">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 4: Cor de Fundo / Moldura Holográfica */}
          {activeTab === 'backdrop' && (
            <div className="space-y-4">
              <label className="font-mono text-xs text-slate-300 font-semibold block">
                SELECIONE O TOM RETRÔ DA MOLDURA HOLOGRÁFICA (8 CORES):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BACKDROP_COLORS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => {
                      setAvatar((a) => ({ ...a, backdropColor: bg.id }));
                      void audio.playTone({ frequency: 720, duration: 0.03, type: 'sine' });
                    }}
                    className={`flex items-center space-x-3 rounded-xl border p-3 transition ${
                      avatar.backdropColor === bg.id
                        ? 'border-[#00E5FF] bg-cyan-950/50 shadow-md shadow-cyan-900/40 ring-1 ring-[#00E5FF]'
                        : 'border-cyan-950 bg-[#0A1324] hover:border-cyan-800'
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: bg.id }}
                    />
                    <span className="font-mono text-xs text-slate-300 font-medium">
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 5: Acessórios */}
          {activeTab === 'accessory' && (
            <div className="space-y-4">
              <label className="font-mono text-xs text-slate-300 font-semibold block">
                GADGETS & ACESSÓRIOS HACKER:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setAvatar((a) => ({ ...a, accessory: acc.id }));
                      void audio.playTone({ frequency: 750, duration: 0.04, type: 'sine' });
                    }}
                    className={`rounded-xl border p-3 font-mono text-xs transition text-left ${
                      avatar.accessory === acc.id
                        ? 'border-[#8257E5] bg-purple-950/40 text-[#8257E5] font-bold shadow-md shadow-purple-900/30'
                        : 'border-cyan-950 bg-[#0A1324] text-slate-400 hover:text-white'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botão de Conclusão de Customização */}
          {onComplete && (
            <div className="pt-4 flex items-center justify-between">
              <div className="font-mono text-xs text-slate-400">
                {isAvailable === false && (
                  <span className="text-[#F43F5E]">Defina um codename válido e disponível para prosseguir.</span>
                )}
              </div>
              <button
                type="button"
                disabled={isChecking || isAvailable === false || characterName.trim().length < 3}
                onClick={() => {
                  void audio.playTone({ frequency: 880, duration: 0.1, type: 'square' });
                  onComplete();
                }}
                className="flex items-center space-x-2 rounded-xl border border-[#04D361] bg-[#04D361] px-8 py-3 font-mono text-xs font-bold text-black shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span>{submitLabel || 'FINALIZAR & ENTRAR NO JOGO →'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
