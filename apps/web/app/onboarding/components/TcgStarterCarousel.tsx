'use client';

/**
 * TcgStarterCarousel.tsx
 * NEXUS CODE - Holographic TCG Starter Selection Carousel
 * 
 * Exibição de cards colecionáveis holográficos 3D em estilo TCG tático:
 * - Efeito 3D tilt sensível à posição do mouse
 * - Brilho iridescente / foil holográfico em movimento
 * - Barras de atributos (HP, ATK, DEF, SPD)
 * - Assinatura de código de cada criatura
 * - Integração direta com Zustand useGameStore.setStarter
 */

import React, { useState } from 'react';
import { useGameStore, StarterCreature } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface TcgStarterCarouselProps {
  onConfirmStarter?: (starter: StarterCreature) => void;
}

export const TcgStarterCarousel: React.FC<TcgStarterCarouselProps> = ({ onConfirmStarter }) => {
  const startersCatalog = useGameStore((s) => s.startersCatalog);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const setStarter = useGameStore((s) => s.setStarter);

  const [activeStarterId, setActiveStarterId] = useState<string>(selectedStarter.id);
  const [tilt, setTilt] = useState<{ id: string; rx: number; ry: number; mx: number; my: number } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const audio = AudioSynthesizer.getInstance();

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rx = ((y - cy) / cy) * -12; // Rotação X
    const ry = ((x - cx) / cx) * 12;  // Rotação Y

    setTilt({
      id,
      rx,
      ry,
      mx: (x / rect.width) * 100,
      my: (y / rect.height) * 100,
    });
  };

  const handleCardMouseLeave = () => {
    setTilt(null);
  };

  const handleSelectStarter = (starter: StarterCreature) => {
    setActiveStarterId(starter.id);
    setStarter(starter.id);
    void audio.playTone({
      frequency: starter.type === 'COMPILER' ? 620 : starter.type === 'NETWORK' ? 740 : 880,
      duration: 0.12,
      type: 'triangle',
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      {/* Título da Seção */}
      <div className="mb-8 text-center">
        <div className="inline-block rounded-full bg-cyan-950/80 px-4 py-1.5 border border-cyan-800 font-mono text-xs text-[#00E5FF] font-bold mb-3">
          FASE 3 // COMPANHEIRO DO SISTEMA
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          ESCOLHA SEU STARTER DE CÓDIGO
        </h2>
        <p className="mt-1 font-mono text-sm text-slate-400">
          Cada companheiro digital possui ataques especializados e afinidade com uma área de engenharia.
        </p>
      </div>

      {/* Grid de 3 Cards TCG Holográficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {startersCatalog.map((starter) => {
          const isSelected = activeStarterId === starter.id;
          const isTilting = tilt && tilt.id === starter.id;

          return (
            <div
              key={starter.id}
              onMouseMove={(e) => handleCardMouseMove(e, starter.id)}
              onMouseLeave={handleCardMouseLeave}
              onClick={() => handleSelectStarter(starter)}
              style={{
                perspective: '1000px',
              }}
              className="cursor-pointer group transition-all duration-300 transform"
            >
              <div
                style={{
                  transform: isTilting
                    ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.02)`
                    : isSelected
                    ? 'scale(1.02)'
                    : 'scale(1)',
                  transition: isTilting ? 'none' : 'transform 0.3s ease-out',
                }}
                className={`relative h-full flex flex-col justify-between rounded-3xl border-2 p-6 overflow-hidden transition-all duration-300 shadow-2xl ${
                  isSelected
                    ? 'border-[#00E5FF] bg-gradient-to-b from-[#09152B] via-[#050B18] to-[#02050D] shadow-cyan-900/50'
                    : 'border-slate-800/80 bg-gradient-to-b from-[#060D1E] via-[#040814] to-[#02040A] hover:border-slate-700'
                }`}
              >
                {/* Camada Holográfica Foil Sheen */}
                {isTilting && (
                  <div
                    className="pointer-events-none absolute inset-0 z-30 opacity-40 mix-blend-color-dodge transition-opacity"
                    style={{
                      background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.8) 0%, rgba(0,229,255,0.5) 25%, rgba(255,0,128,0.3) 50%, transparent 75%)`,
                    }}
                  />
                )}

                {/* Header do Card TCG */}
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{starter.icon}</span>
                      <div>
                        <h3 className="font-mono text-base font-black text-white">
                          {starter.name}
                        </h3>
                        <span className="font-mono text-[10px] text-slate-400">
                          {starter.codeName}
                        </span>
                      </div>
                    </div>

                    {/* Selo do Tipo */}
                    <div
                      className="rounded-full px-3 py-0.5 font-mono text-[10px] font-black tracking-wider uppercase border"
                      style={{
                        backgroundColor: `${starter.color}22`,
                        color: starter.color,
                        borderColor: `${starter.color}66`,
                      }}
                    >
                      {starter.type}
                    </div>
                  </div>

                  {/* Ilustração / Sprite Hero Box */}
                  <div className="relative mb-5 flex h-40 w-full items-center justify-center rounded-2xl border border-white/10 bg-[#02050E] overflow-hidden">
                    {/* Background Radial Glow */}
                    <div
                      className="absolute h-32 w-32 rounded-full opacity-30 blur-2xl"
                      style={{ backgroundColor: starter.color }}
                    />
                    
                    {/* Visual da Criatura */}
                    <div className="relative z-10 text-center">
                      <div className="text-6xl drop-shadow-[0_0_20px_rgba(0,229,255,0.5)] transform group-hover:scale-110 transition duration-300">
                        {starter.icon}
                      </div>
                      <div
                        className="mt-2 font-mono text-xs font-bold"
                        style={{ color: starter.color }}
                      >
                        HP MÁX: {starter.maxHp}
                      </div>
                    </div>
                  </div>

                  {/* Descrição Didática */}
                  <p className="font-mono text-xs text-slate-300 leading-relaxed mb-4">
                    {starter.description}
                  </p>

                  {/* Barras de Estatísticas do Starter */}
                  <div className="space-y-2 mb-4 bg-[#030612] p-3 rounded-xl border border-white/5 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">HP:</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${(starter.hp / 60) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-200">{starter.hp}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ATK:</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${(starter.attack / 70) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-200">{starter.attack}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">DEF:</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${(starter.defense / 70) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-200">{starter.defense}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">SPD:</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${(starter.speed / 80) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-200">{starter.speed}</span>
                    </div>
                  </div>

                  {/* Lista de Ataques / Skills */}
                  <div className="space-y-1.5 mb-4">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase">
                      Habilidades Iniciais:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {starter.skills.slice(0, 2).map((sk) => (
                        <div
                          key={sk.id}
                          className="rounded-lg bg-white/5 px-2 py-1 border border-white/5 font-mono text-[10px] text-slate-200"
                        >
                          <div className="font-bold">{sk.name}</div>
                          <div className="text-[9px] text-slate-400">PWR: {sk.power} | PP: {sk.pp}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Botão de Escolha */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStarter(starter);
                      if (onConfirmStarter) {
                        onConfirmStarter(starter);
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center space-x-2 ${
                      isSelected
                        ? 'bg-[#00E5FF] text-black shadow-lg shadow-cyan-950 font-black'
                        : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>{isSelected ? '✓ STARTER SELECIONADO' : 'ESCOLHER STARTER'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Compartilhamento Viral (PR #07) */}
      <div className="mt-8 rounded-2xl border border-cyan-900/50 bg-[#071124]/90 p-4 text-center max-w-xl mx-auto backdrop-blur-sm shadow-xl shadow-cyan-950/40">
        <div className="font-mono text-xs text-slate-300 mb-2.5 font-semibold flex items-center justify-center gap-2">
          <span>⚡ COMPARTILHE SEU COMPANHEIRO DIGITAL</span>
          <span className="text-[#00E5FF]">[{selectedStarter.name}]</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const text = encodeURIComponent(
                `Acabei de inicializar minha jornada no NEXUS CODE com o meu Starter ${selectedStarter.name} (${selectedStarter.type})! 🚀\nVenha aprender engenharia de software na prática: https://nexuscode.dev #NexusCode #100DaysOfCode #WebDev`
              );
              window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
            }}
            className="rounded-xl border border-sky-500/40 bg-sky-950/40 px-3.5 py-1.5 font-mono text-xs font-bold text-sky-300 hover:bg-sky-500 hover:text-black transition flex items-center gap-1.5"
          >
            <span>🐦 Twitter / X</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const url = encodeURIComponent('https://nexuscode.dev');
              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
            }}
            className="rounded-xl border border-blue-500/40 bg-blue-950/40 px-3.5 py-1.5 font-mono text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5"
          >
            <span>💼 LinkedIn</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const shareSummary = `🎮 NEXUS CODE // Starter: ${selectedStarter.name} | Tipo: ${selectedStarter.type} | ATK: ${selectedStarter.attack} | DEF: ${selectedStarter.defense}`;
              void navigator.clipboard.writeText(shareSummary);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 font-mono text-xs text-slate-300 hover:border-slate-500 transition flex items-center gap-1.5"
          >
            <span>{copied ? '✓ Copiado!' : '📋 Copiar Resumo'}</span>
          </button>
        </div>
      </div>

      {/* Botão Final de Confirmação */}
      {onConfirmStarter && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => {
              const current = startersCatalog.find((s) => s.id === activeStarterId) || startersCatalog[0];
              onConfirmStarter(current);
            }}
            className="rounded-2xl border-2 border-[#04D361] bg-[#04D361] px-10 py-4 font-mono text-sm font-black text-black shadow-2xl shadow-emerald-950/60 transition hover:bg-emerald-400 active:scale-95"
          >
            INICIALIZAR JORNADA NO NEXUS CODE →
          </button>
        </div>
      )}
    </div>
  );
};
