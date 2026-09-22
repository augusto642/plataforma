'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';

interface TcgCardData {
  id: string;
  name: string;
  classTitle: string;
  lang: string;
  edition: string;
  rarity: 'SECRET RARE' | 'MYTHIC LEGEND' | 'HOLO RARE' | 'ULTRA RARE';
  rarityColor: string;
  badgeGlow: string;
  avatarIcon: string;
  element: string;
  hp: number;
  stats: { label: string; value: number }[];
  signatureSpell: string;
  passiveSkill: string;
  lore: string;
  quote: string;
}

const TCG_CARDS: TcgCardData[] = [
  {
    id: 'rust-paladin',
    name: 'FERROX // PALADINO',
    classTitle: 'Guardião da Memória Segura',
    lang: 'Rust 1.78',
    edition: 'NO. 001 // SPECIMEN',
    rarity: 'MYTHIC LEGEND',
    rarityColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
    badgeGlow: 'rgba(245, 158, 11, 0.35)',
    avatarIcon: '🦀',
    element: 'CORINGA SÉRIE 01',
    hp: 480,
    stats: [
      { label: 'Memory Safety', value: 100 },
      { label: 'Zero Cost Abstr.', value: 98 },
      { label: 'Concurrency Sync', value: 96 },
    ],
    signatureSpell: 'Aegis do Borrow Checker',
    passiveSkill: 'Imunidade a Data Races e Ponteiros Nulos',
    lore: 'Nascido nos núcleos do silício de alta precisão. Ferrox governa o tempo de vida e ownership de cada byte com exatidão implacável.',
    quote: 'Zero segfaults em produção. O compilador é seu mestre mais impiedoso.',
  },
  {
    id: 'go-swarm',
    name: 'GOPHER // DISPATCHER',
    classTitle: 'Mestre da Concorrência Paralela',
    lang: 'Go 1.22',
    edition: 'NO. 002 // SPECIMEN',
    rarity: 'HOLO RARE',
    rarityColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
    badgeGlow: 'rgba(0, 229, 255, 0.35)',
    avatarIcon: '🐹',
    element: 'MICROSERVICES',
    hp: 440,
    stats: [
      { label: 'Goroutines Flow', value: 99 },
      { label: 'Low Latency P99', value: 98 },
      { label: 'Throughput OPS', value: 95 },
    ],
    signatureSpell: 'Canal de Concorrência Paralela',
    passiveSkill: 'Orquestração de 100k Goroutines Concorrentes',
    lore: 'Comanda frotas massivas de microsserviços com canais CSP atômicos e coletor de lixo em sub-milissegundos.',
    quote: 'Não comunique compartilhando memória. Compartilhe memória comunicando.',
  },
  {
    id: 'python-alchemist',
    name: 'PYRALIS // ALQUIMISTA',
    classTitle: 'Mago dos Dados & LLMs Socráticos',
    lang: 'Python 3.12',
    edition: 'NO. 003 // SPECIMEN',
    rarity: 'SECRET RARE',
    rarityColor: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
    badgeGlow: 'rgba(168, 85, 247, 0.35)',
    avatarIcon: '🐍',
    element: 'ARTIFICIAL INTEL',
    hp: 420,
    stats: [
      { label: 'IA & RAG Fusion', value: 100 },
      { label: 'Expressividade', value: 98 },
      { label: 'Tensores & AST', value: 97 },
    ],
    signatureSpell: 'Transmutação Algorítmica',
    passiveSkill: 'Raciocínio Vetorial de Hiperdimensões',
    lore: 'Molda vetores latentes e tensores matemáticos. Conecta a mentoria de Lumi com redes neurais profundas.',
    quote: 'Linhas elegantes que transformam caos em tensores e inteligência viva.',
  },
  {
    id: 'ts-sorcerer',
    name: 'TYPON // FEITICEIRO',
    classTitle: 'Arquiteto de Interfaces Web',
    lang: 'TypeScript 5.4',
    edition: 'NO. 004 // SPECIMEN',
    rarity: 'ULTRA RARE',
    rarityColor: 'text-blue-300 border-blue-500/40 bg-blue-950/40',
    badgeGlow: 'rgba(59, 130, 246, 0.35)',
    avatarIcon: '⚡',
    element: 'FRONTEND ARCH',
    hp: 410,
    stats: [
      { label: 'Type Soundness', value: 98 },
      { label: 'Developer Exp.', value: 99 },
      { label: 'Reatividade UI', value: 97 },
    ],
    signatureSpell: 'Escudo de Generics Estritos',
    passiveSkill: 'Validação em Tempo de Compilação Zero-Any',
    lore: 'Conjura árvores DOM hiper-reativas com renderização em 120 FPS e tipagem estrita inviolável.',
    quote: 'Se o sistema de tipos aprovou sem coerções, seu usuário jamais verá crash.',
  },
];

export const TcgCardsShowcase: React.FC = () => {
  const [activeTilt, setActiveTilt] = useState<{ id: string; rx: number; ry: number; mx: number; my: number } | null>(null);
  const [inspectedCard, setInspectedCard] = useState<TcgCardData | null>(null);
  const lastSoundTimeRef = useRef<number>(0);

  const playInteractiveSound = (type: 'flip' | 'holo') => {
    const now = Date.now();
    if (now - lastSoundTimeRef.current > 150) {
      lastSoundTimeRef.current = now;
      const audio = AudioSynthesizer.getInstance();
      void audio.resume();
      if (type === 'holo') {
        audio.playHoloHover();
      } else {
        audio.playCardFlip();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rx = ((y - cy) / cy) * -12;
    const ry = ((x - cx) / cx) * 12;

    setActiveTilt({
      id,
      rx,
      ry,
      mx: (x / rect.width) * 100,
      my: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = (id: string) => {
    playInteractiveSound('holo');
  };

  const handleMouseLeave = () => {
    setActiveTilt(null);
  };

  const handleInspectCard = (card: TcgCardData) => {
    playInteractiveSound('flip');
    setInspectedCard(card);
  };

  // Fechar modal com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectedCard(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section id="colecionaveis" className="relative py-28 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Título de Seção Assimétrico (Esquerda + Direita) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-purple-300 text-xs font-mono font-bold mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <span className="text-base">🃏</span>
            <span>SÉRIE 01 // CARTAS COLECIONÁVEIS HOLOGRÁFICAS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-white tracking-tight mb-4">
            Colecione sua Maestria Técnica
          </h2>
          <p className="text-base sm:text-lg text-zinc-300 font-sans leading-relaxed">
            Cada trilha e chefão derrotado desbloqueia cards em 3D com efeito foil holográfico,
            atributos reais de combate e assinatura de validação em código auditável.
            Passe o cursor para inclinar e clique para inspecionar.
          </p>
        </div>

        {/* Deck Collector Stats na Direita */}
        <div className="hidden lg:flex flex-col items-end gap-2 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>DECK: 4 CLASSES ELEMENTAIS DISPONÍVEIS</span>
          </div>
          <span className="text-[11px] text-zinc-500">PROPORÇÃO 2.5:3.5 // FOIL METÁLICO SHADERS</span>
        </div>
      </div>

      {/* Grid de 4 Cards TCG de Luxo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TCG_CARDS.map((card) => {
          const isTilted = activeTilt?.id === card.id;
          const transformStyle = isTilted
            ? {
                transform: `perspective(1000px) rotateX(${activeTilt.rx}deg) rotateY(${activeTilt.ry}deg) scale3d(1.03, 1.03, 1.03)`,
                transition: 'transform 0.08s ease-out',
              }
            : {
                transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transition: 'transform 0.4s ease-out',
              };

          return (
            <div
              key={card.id}
              onClick={() => handleInspectCard(card)}
              onMouseEnter={() => handleMouseEnter(card.id)}
              onMouseMove={(e) => handleMouseMove(e, card.id)}
              onMouseLeave={handleMouseLeave}
              style={transformStyle}
              className="relative rounded-[26px] p-[1px] bg-gradient-to-b from-white/[0.2] via-white/[0.05] to-transparent cursor-pointer select-none group transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="relative rounded-[25px] bg-gradient-to-b from-[#0C1226] via-[#060914] to-[#04060E] p-5 h-full flex flex-col justify-between overflow-hidden">
                {/* Efeito Holográfico Reforçado com Prisma e Luz Arco-Íris */}
                {isTilted && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 mix-blend-color-dodge opacity-75 z-20 rounded-[25px]"
                      style={{
                        background: `radial-gradient(circle at ${activeTilt.mx}% ${activeTilt.my}%, rgba(255,255,255,0.85) 0%, rgba(0,229,255,0.5) 25%, rgba(168,85,247,0.4) 50%, rgba(245,158,11,0.3) 75%, transparent 100%)`,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-40 z-20 rounded-[25px]"
                      style={{
                        background: `linear-gradient(${activeTilt.rx * 12 + 45}deg, rgba(255,0,128,0.3), rgba(0,229,255,0.3), rgba(245,158,11,0.3))`,
                      }}
                    />
                  </>
                )}

                {/* Cabeçalho do Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border ${card.rarityColor}`}>
                      {card.rarity}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-zinc-400">{card.lang}</span>
                  </div>

                  {/* Arte / Avatar do Card com Fundo Metálico */}
                  <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-[#121A33] via-[#080E21] to-[#04060E] border border-white/[0.08] flex flex-col items-center justify-center p-3 mb-4 shadow-inner group-hover:border-white/20 transition-colors">
                    <div className="text-5xl mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.35)] transform group-hover:scale-110 transition-transform duration-300">
                      {card.avatarIcon}
                    </div>
                    <div className="text-xs font-mono font-black text-white tracking-wider text-center">
                      {card.name}
                    </div>
                    <div className="text-[10px] font-sans text-zinc-400 text-center">
                      {card.classTitle}
                    </div>

                    {/* Badge de HP no Canto */}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-black/70 border border-white/10 text-[10px] font-mono font-black text-emerald-400">
                      HP {card.hp}
                    </div>

                    {/* Badge de Edição */}
                    <div className="absolute bottom-2 left-2.5 text-[9px] font-mono text-zinc-500 tracking-wider">
                      {card.edition}
                    </div>

                    {/* Indicador de Inspecionar no Hover */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                      <span className="text-[11px] font-mono font-bold text-cyan-300 bg-black/80 px-3 py-1 rounded-full border border-cyan-500/40 shadow-lg">
                        🔍 Inspecionar Card
                      </span>
                    </div>
                  </div>

                  {/* Atributos / Stats */}
                  <div className="space-y-2 mb-4">
                    {card.stats.map((stat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-300 mb-0.5">
                          <span>{stat.label}</span>
                          <span className="font-bold text-[#00E5FF]">{stat.value}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00E5FF] via-[#04D361] to-[#00E58F]"
                            style={{ width: `${stat.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Habilidade Especial & Citação */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 mb-1">
                    <span>⚔️</span>
                    <span>{card.signatureSpell}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 italic font-sans leading-relaxed">
                    "{card.quote}"
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Inferior de Coleção */}
      <div className="mt-12 text-center">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-cyan-300 hover:text-white transition-all group"
        >
          <span>Escolha seu primeiro Card Starter no Onboarding</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>

      {/* MODAL DE INSPEÇÃO ULTRA DETALHADA DO CARD */}
      {inspectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setInspectedCard(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-gradient-to-br from-[#0D1326] via-[#070A18] to-[#04060E] p-6 sm:p-8 shadow-[0_0_80px_rgba(0,229,255,0.25)] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setInspectedCard(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              {/* Mini Card Holográfico Destaque */}
              <div className="relative w-44 shrink-0 rounded-2xl p-[1px] bg-gradient-to-b from-white/30 to-white/5 shadow-2xl">
                <div className="rounded-[15px] bg-[#050814] p-4 text-center">
                  <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${inspectedCard.rarityColor} inline-block mb-3`}>
                    {inspectedCard.rarity}
                  </span>
                  <div className="text-6xl mb-2">{inspectedCard.avatarIcon}</div>
                  <div className="text-xs font-mono font-black text-white">{inspectedCard.name}</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">{inspectedCard.classTitle}</div>
                  <div className="mt-3 px-2 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                    HP {inspectedCard.hp} • {inspectedCard.lang}
                  </div>
                </div>
              </div>

              {/* Detalhes & Lore Completa */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[#00E5FF] uppercase font-bold">{inspectedCard.element}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs font-mono text-zinc-400">{inspectedCard.edition}</span>
                </div>
                <h3 className="text-2xl font-heading font-black text-white mb-1">{inspectedCard.name}</h3>
                <p className="text-xs text-zinc-400 font-sans mb-4">{inspectedCard.lore}</p>

                {/* Habilidades */}
                <div className="space-y-2 mb-5">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5 mb-0.5">
                      <span>⚔️ Habilidade Suprema:</span>
                      <span className="text-white">{inspectedCard.signatureSpell}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">Desfere dano crítico imediato e valida todas as asserções unitárias.</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="text-[11px] font-mono font-bold text-purple-300 flex items-center gap-1.5 mb-0.5">
                      <span>🛡️ Passiva de Classe:</span>
                      <span className="text-white">{inspectedCard.passiveSkill}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">Bônus de telemetria contínua contra bugs de concorrência.</div>
                  </div>
                </div>

                {/* Ação de Seleção de Starter */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/[0.08]">
                  <Link
                    href={`/onboarding?starter=${inspectedCard.id}`}
                    className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#04D361] hover:from-[#04D361] hover:to-[#00E5FF] text-black font-heading font-black text-xs uppercase tracking-wider text-center transition-all shadow-[0_0_25px_rgba(0,229,255,0.4)] flex items-center justify-center gap-2"
                  >
                    <span>⚡ Escolher Como Meu Starter</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setInspectedCard(null)}
                    className="py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

