'use client';

/**
 * StarterCourseCards.tsx
 * NEXUS CODE - Starter Course & Pet Companion Selection
 * 
 * Permite ao desenvolvedor escolher seu curso inicial através dos cards
 * dos monstrinhos colecionáveis (Pythox, Scripty, Gopherus, Rustor),
 * adotando o pet que o acompanhará na jornada e evoluirá conforme ele ganha XP.
 */

import React, { useState } from 'react';
import { useGameStore, StarterCreature } from '../../game/stores/useGameStore';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface StarterCourseCardsProps {
  onConfirmCourseAndPet: (starter: StarterCreature, petNickname: string) => void;
  onBackToTiers: () => void;
}

export const StarterCourseCards: React.FC<StarterCourseCardsProps> = ({
  onConfirmCourseAndPet,
  onBackToTiers,
}) => {
  const startersCatalog = useGameStore((s) => s.startersCatalog);
  const selectedStarter = useGameStore((s) => s.selectedStarter);
  const setStarter = useGameStore((s) => s.setStarter);

  // Filtrar os 4 companheiros oficiais do plano
  const officialPets = startersCatalog.filter((s) =>
    ['pythox', 'scripty', 'gopherus', 'rustor'].includes(s.id)
  );

  // Se por ventura os 4 não existirem, pega os 4 primeiros
  const displayPets = officialPets.length >= 4 ? officialPets : startersCatalog.slice(0, 4);

  const [activeStarterId, setActiveStarterId] = useState<string>(
    displayPets[0]?.id || selectedStarter.id
  );
  const [petNickname, setPetNickname] = useState<string>('');
  const [tilt, setTilt] = useState<{ id: string; rx: number; ry: number; mx: number; my: number } | null>(null);

  const audio = AudioSynthesizer.getInstance();

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rx = ((y - cy) / cy) * -10;
    const ry = ((x - cx) / cx) * 10;

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

  const handleSelectPet = (pet: StarterCreature) => {
    setActiveStarterId(pet.id);
    setStarter(pet.id);
    void audio.playTone({
      frequency: pet.id === 'pythox' ? 620 : pet.id === 'scripty' ? 780 : pet.id === 'gopherus' ? 680 : 880,
      duration: 0.12,
      type: 'triangle',
    });
  };

  const currentPet = displayPets.find((p) => p.id === activeStarterId) || displayPets[0];

  const handleConfirm = () => {
    const finalName = petNickname.trim() || currentPet.name;
    void audio.playVictory();
    onConfirmCourseAndPet(currentPet, finalName);
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 animate-fadeIn">
      {/* Botão Voltar para Tiers */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToTiers}
          className="cursor-pointer text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]"
        >
          <span>←</span>
          <span>Voltar para Seleção de Níveis</span>
        </button>

        <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
          <span>NÍVEL SELECIONADO: INICIANTE</span>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 font-mono text-xs text-[#00E5FF] font-bold mb-3 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          <span>🐾 FASE 2 // ADOTE SEU COMPANION & ESCOLHA A TRILHA</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-heading font-black text-white tracking-tight mb-3">
          Escolha Seu Curso Inicial
        </h2>
        <p className="font-sans text-sm sm:text-base text-zinc-300 leading-relaxed">
          Cada curso é guardado por uma criatura elemental de código. Ao escolher a trilha que deseja aprender, 
          você adota esse <strong className="text-white">Pet Companion</strong>. Ele te acompanhará nas masmorras, 
          ganhará XP junto com você e <strong className="text-[#04D361]">evoluirá fisicamente</strong> conforme você domina a programação!
        </p>
      </div>

      {/* Grid de 4 Cards de Monstrinhos Colecionáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch mb-10">
        {displayPets.map((pet) => {
          const isSelected = activeStarterId === pet.id;
          const isTilting = tilt && tilt.id === pet.id;

          return (
            <div
              key={pet.id}
              onMouseMove={(e) => handleCardMouseMove(e, pet.id)}
              onMouseLeave={handleCardMouseLeave}
              onClick={() => handleSelectPet(pet)}
              style={{ perspective: '1000px' }}
              className="cursor-pointer group transition-all duration-300 transform"
            >
              <div
                style={{
                  transform: isTilting
                    ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(1.02, 1.02, 1.02)`
                    : isSelected
                    ? 'scale3d(1.02, 1.02, 1.02)'
                    : 'none',
                  transition: isTilting ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
                className={`relative rounded-3xl p-[1.5px] h-full flex flex-col justify-between transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#00E5FF] via-[#04D361] to-[#8257E5] shadow-[0_15px_45px_rgba(0,229,255,0.3)] ring-2 ring-[#00E5FF]/60'
                    : 'bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent hover:shadow-xl hover:shadow-cyan-950/40'
                }`}
              >
                {/* Reflexo Foil Holográfico */}
                {isTilting && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-3xl z-20 opacity-30 mix-blend-color-dodge transition-opacity"
                    style={{
                      background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.8), transparent 70%)`,
                    }}
                  />
                )}

                <div className="rounded-[22px] bg-gradient-to-b from-[#0B1021] via-[#080D1D] to-[#050814] p-5 h-full flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
                  {/* Glow etéreo com cor do elemento */}
                  <div
                    className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none"
                    style={{ background: pet.color }}
                  />

                  <div>
                    {/* Topo do Card: Ícone e Trilha */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[#00E5FF]">
                        {pet.languageTrack || pet.type}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-[#04D361]">
                        PET LVL 1
                      </span>
                    </div>

                    {/* Pod Visual do Monstrinho */}
                    <div className="my-3 p-4 rounded-2xl bg-[#04060E] border border-white/[0.08] flex flex-col items-center justify-center relative shadow-inner group-hover:border-cyan-500/40 transition-colors">
                      <div className="text-6xl mb-2 group-hover:scale-110 transition-transform duration-300 select-none animate-bounce" style={{ animationDuration: '3s' }}>
                        {pet.icon}
                      </div>
                      <div className="font-heading font-black text-xl text-white tracking-wide">
                        {pet.name}
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-zinc-400">
                        {pet.codeName}
                      </div>

                      {/* Tag de Estágio de Evolução */}
                      <div className="mt-2 text-[10px] font-mono text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-500/30">
                        Estágio 1: {pet.stageTitle || 'Filhote'}
                      </div>
                    </div>

                    {/* Lore & Descrição */}
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-4 line-clamp-3">
                      {pet.lore || pet.description}
                    </p>

                    {/* Habilidade Passiva */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4 text-[11px] font-sans">
                      <div className="font-mono font-bold text-cyan-400 mb-0.5 flex items-center gap-1.5">
                        <span>✨ Passiva:</span>
                        <span>{pet.passiveName || 'Clean Code'}</span>
                      </div>
                      <p className="text-zinc-400 text-[10px] leading-tight">
                        {pet.passiveDescription || 'Concede bônus de XP ao resolver desafios sem erros.'}
                      </p>
                    </div>

                    {/* Barras de Atributos */}
                    <div className="space-y-1.5 text-[10px] font-mono mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">HP MÁXIMO</span>
                        <span className="text-white font-bold">{pet.hp}</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(pet.hp / 130) * 100}%` }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">ATAQUE (SINTAXE)</span>
                        <span className="text-white font-bold">{pet.attack}</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(pet.attack / 40) * 100}%` }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">DEFESA (LÓGICA)</span>
                        <span className="text-white font-bold">{pet.defense}</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${(pet.defense / 40) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Indicador de Seleção */}
                  <div className="pt-3 border-t border-white/[0.06] text-center">
                    <span
                      className={`text-xs font-mono font-bold block py-1.5 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                          : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}
                    >
                      {isSelected ? '✔ COMPANHEIRO ESCOLHIDO' : 'CLIQUE PARA SELECIONAR'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Caixa de Apelido & Confirmação Final */}
      <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-[#090D1C] border border-[#00E5FF]/30 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <span className="text-4xl p-2.5 rounded-2xl bg-[#04060E] border border-white/10 shadow-inner">
              {currentPet.icon}
            </span>
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
                TRILHA SELECIONADA:
              </div>
              <div className="text-lg font-heading font-black text-white">
                {currentPet.languageTrack}
              </div>
              <div className="text-xs text-zinc-400 font-sans">
                Seu companheiro inicial: <strong className="text-white">{currentPet.name}</strong>
              </div>
            </div>
          </div>

          {/* Campo de Apelido Customizado (Opcional) */}
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
              Apelido do seu Pet (Opcional):
            </label>
            <input
              type="text"
              maxLength={16}
              placeholder={currentPet.name}
              value={petNickname}
              onChange={(e) => setPetNickname(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#050814] border border-white/15 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#00E5FF]"
            />
          </div>
        </div>

        {/* Botão de Confirmação */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full cursor-pointer py-4 px-6 rounded-2xl bg-gradient-to-r from-[#04D361] via-[#00E58F] to-[#04D361] hover:from-[#00E58F] hover:to-[#04D361] text-black font-heading font-black text-sm uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-[0_0_30px_rgba(4,211,97,0.45)] flex items-center justify-center gap-2 group"
        >
          <span>✨ Adotar {petNickname.trim() || currentPet.name} & Iniciar Curso</span>
          <span className="group-hover:translate-x-1 transition-transform font-bold">→</span>
        </button>
      </div>
    </div>
  );
};
