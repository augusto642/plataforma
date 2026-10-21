'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AudioSynthesizer } from '../../game/engine/AudioSynthesizer';
// B08 — eventos do funil da landing
import { track } from '../../lib/analytics';
// Frente 3 — ícones SVG únicos da landing
import { IconBolt, IconCards, IconSearch, IconShield, IconSwords } from './icons';

interface TcgCardData {
  id: string;
  name: string;
  classTitle: string;
  lang: string;
  edition: string;
  rarity: 'SECRET RARE' | 'MYTHIC LEGEND' | 'HOLO RARE' | 'ULTRA RARE';
  rarityColor: string;
  badgeGlow: string;
  // Sprint 7 — o avatar da carta é ARTE (ilustração em public/landing/
  // companions), não mais emoji: 🦀/🐹/🐍/⚡ saíram dos cards e do modal
  avatarImage: string;
  avatarAlt: string;
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
    rarityColor: 'text-brand-amber border-brand-amber/40 bg-brand-amber/10',
    badgeGlow: 'rgba(245, 158, 11, 0.35)',
    avatarImage: '/landing/companions/rust-crab.webp',
    avatarAlt: 'Caranguejo paladino de armadura, companion da trilha de Rust',
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
    rarityColor: 'text-brand-cyan-neon border-brand-cyan-neon/40 bg-brand-cyan/10',
    badgeGlow: 'rgba(0, 229, 255, 0.35)',
    avatarImage: '/landing/companions/go-hamster.webp',
    avatarAlt: 'Hamster despachante com mochila de entregas, companion da trilha de Go',
    element: 'MICROSERVICES',
    hp: 440,
    stats: [
      { label: 'Goroutines Flow', value: 99 },
      { label: 'Baixa Latência', value: 98 },
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
    rarityColor: 'text-brand-purple-light border-brand-purple/40 bg-brand-purple-low',
    badgeGlow: 'rgba(168, 85, 247, 0.35)',
    avatarImage: '/landing/companions/python-snake.webp',
    avatarAlt: 'Cobra alquimista com frascos de poções, companion da trilha de Python',
    element: 'ARTIFICIAL INTEL',
    hp: 420,
    stats: [
      { label: 'IA & RAG Fusion', value: 100 },
      { label: 'Expressividade', value: 98 },
      { label: 'Tensores & AST', value: 97 },
    ],
    signatureSpell: 'Transmutação Algorítmica',
    passiveSkill: 'Raciocínio Vetorial de Hiperdimensões',
    lore: 'Molda vetores latentes e tensores matemáticos. Conecta a mentoria da tutora de IA com redes neurais profundas.',
    quote: 'Linhas elegantes que transformam caos em tensores e inteligência viva.',
  },
  {
    id: 'ts-sorcerer',
    name: 'TYPON // FEITICEIRO',
    classTitle: 'Arquiteto de Interfaces Web',
    lang: 'TypeScript 5.4',
    edition: 'NO. 004 // SPECIMEN',
    rarity: 'ULTRA RARE',
    rarityColor: 'text-brand-cyan border-brand-cyan/40 bg-brand-cyan/10',
    badgeGlow: 'rgba(59, 130, 246, 0.35)',
    avatarImage: '/landing/companions/js-lightning.webp',
    avatarAlt: 'Criatura de raio elétrico, companion da trilha de TypeScript',
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-brand-purple/10 via-brand-cyan-neon/10 to-brand-amber/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Título de Seção Assimétrico (Esquerda + Direita) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-2 border border-border-1 text-brand-purple-light text-xs font-mono font-bold mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <IconCards className="w-5 h-5" />
            <span>SÉRIE 01 // CARTAS COLECIONÁVEIS HOLOGRÁFICAS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black text-ink-heading tracking-tight mb-4">
            Suas conquistas viram cards colecionáveis
          </h2>
          <p className="text-base sm:text-lg text-ink-body font-sans leading-relaxed">
            Cada trilha e chefão derrotado desbloqueia cards em 3D com efeito foil holográfico,
            atributos reais de combate e assinatura de validação em código auditável.
            Passe o cursor para inclinar e clique para inspecionar.
          </p>
        </div>

        {/* Deck Collector Stats na Direita */}
        <div className="hidden lg:flex flex-col items-end gap-2 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-brand-purple-low border border-brand-purple/30 text-brand-purple-light flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-brand-purple-light" />
            <span>DECK: 4 CLASSES ELEMENTAIS DISPONÍVEIS</span>
          </div>
          <span className="text-[13px] text-ink-span">PROPORÇÃO 2.5:3.5 // FOIL METÁLICO SHADERS</span>
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
              className="relative rounded-[26px] p-[1px] bg-gradient-to-b from-surface-4 via-surface-3 to-transparent cursor-pointer select-none group transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="relative rounded-[25px] bg-gradient-to-b from-surface-2 via-surface-1 to-background p-5 h-full flex flex-col justify-between overflow-hidden">
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
                    <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border ${card.rarityColor}`}>
                      {card.rarity}
                    </span>
                    <span className="text-xs font-mono font-bold text-ink-span">{card.lang}</span>
                  </div>

                  {/* Arte do Card — Sprint 7: ilustração própria em tela cheia
                      da área de arte (lazy: a seção fica fora da primeira dobra) */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-surface-2 border border-border-1 mb-4 shadow-inner group-hover:border-border-2 transition-colors">
                    <Image
                      src={card.avatarImage}
                      alt={card.avatarAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                      className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-9 pb-2">
                      <div className="text-sm font-mono font-black text-ink-heading tracking-wider text-center">
                        {card.name}
                      </div>
                      <div className="text-[13px] font-sans text-ink-body text-center">
                        {card.classTitle}
                      </div>
                    </div>

                    {/* Badge de HP no Canto */}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-black/70 border border-border-1 text-xs font-mono font-black text-brand-green-neon">
                      HP {card.hp}
                    </div>

                    {/* Badge de Edição (canto superior: o rodapé da arte
                        agora é da legenda nome/classe sobre o degradê) */}
                    <div className="absolute top-2.5 left-2.5 text-xs font-mono text-ink-body tracking-wider bg-black/55 px-1.5 py-0.5 rounded">
                      {card.edition}
                    </div>

                    {/* Indicador de Inspecionar no Hover */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                      <span className="text-xs font-mono font-bold text-brand-cyan-neon bg-black/80 px-3 py-1 rounded-full border border-brand-cyan-neon/40 shadow-lg inline-flex items-center gap-1.5">
                        <IconSearch className="w-3.5 h-3.5" /> Inspecionar Card
                      </span>
                    </div>
                  </div>

                  {/* Atributos / Stats */}
                  <div className="space-y-2 mb-4">
                    {card.stats.map((stat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[13px] font-mono text-ink-body mb-0.5">
                          <span>{stat.label}</span>
                          <span className="font-bold text-brand-cyan-neon">{stat.value}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-2 border border-border-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-cyan-neon via-brand-green-neon to-brand-green"
                            style={{ width: `${stat.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Habilidade Especial & Citação */}
                <div className="pt-3 border-t border-border-1">
                  <div className="text-[13px] font-mono font-bold text-ink-heading flex items-center gap-1.5 mb-1">
                    <IconSwords className="w-4 h-4" />
                    <span>{card.signatureSpell}</span>
                  </div>
                  <p className="text-[13px] text-ink-span italic font-sans leading-relaxed">
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
          data-cta-id="tcg_onboarding"
          onClick={() => track('nav_cta', 'tcg_onboarding')}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-surface-2 hover:bg-surface-3 border border-border-1 text-[13px] font-mono text-brand-cyan-neon hover:text-ink-heading transition-all group"
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
            className="relative w-full max-w-2xl rounded-3xl border border-border-2 bg-gradient-to-br from-surface-2 via-surface-1 to-background p-6 sm:p-8 shadow-[0_0_80px_rgba(0,229,255,0.25)] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setInspectedCard(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-ink-body hover:text-ink-heading transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              {/* Mini Card Holográfico Destaque */}
              <div className="relative w-44 shrink-0 rounded-2xl p-[1px] bg-gradient-to-b from-surface-4 to-surface-3 shadow-2xl">
                <div className="rounded-[15px] bg-background p-4 text-center">
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${inspectedCard.rarityColor} inline-block mb-3`}>
                    {inspectedCard.rarity}
                  </span>
                  <div className="relative w-32 h-32 mx-auto mb-2 rounded-xl overflow-hidden">
                    <Image
                      src={inspectedCard.avatarImage}
                      alt={inspectedCard.avatarAlt}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <div className="text-sm font-mono font-black text-ink-heading">{inspectedCard.name}</div>
                  <div className="text-[13px] text-ink-span font-sans mt-0.5">{inspectedCard.classTitle}</div>
                  <div className="mt-3 px-2 py-1 rounded-md bg-brand-green/15 border border-brand-green/30 text-brand-green-neon font-mono text-xs font-bold">
                    HP {inspectedCard.hp} • {inspectedCard.lang}
                  </div>
                </div>
              </div>

              {/* Detalhes & Lore Completa */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-brand-cyan-neon uppercase font-bold">{inspectedCard.element}</span>
                  <span className="text-ink-span">•</span>
                  <span className="text-xs font-mono text-ink-span">{inspectedCard.edition}</span>
                </div>
                <h3 className="text-2xl font-heading font-black text-ink-heading mb-1">{inspectedCard.name}</h3>
                <p className="text-[13px] text-ink-span font-sans mb-4">{inspectedCard.lore}</p>

                {/* Habilidades */}
                <div className="space-y-2 mb-5">
                  <div className="p-2.5 rounded-xl bg-surface-2 border border-border-1">
                    <div className="text-[13px] font-mono font-bold text-brand-cyan-neon flex items-center gap-1.5 mb-0.5">
                      <span className="inline-flex items-center gap-1"><IconSwords className="w-3.5 h-3.5" /> Habilidade Suprema:</span>
                      <span className="text-ink-heading">{inspectedCard.signatureSpell}</span>
                    </div>
                    <div className="text-[13px] text-ink-span">Desfere dano crítico imediato e valida todas as asserções unitárias.</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-2 border border-border-1">
                    <div className="text-[13px] font-mono font-bold text-brand-purple-light flex items-center gap-1.5 mb-0.5">
                      <span className="inline-flex items-center gap-1"><IconShield className="w-3.5 h-3.5" /> Passiva de Classe:</span>
                      <span className="text-ink-heading">{inspectedCard.passiveSkill}</span>
                    </div>
                    <div className="text-[13px] text-ink-span">Bônus de telemetria contínua contra bugs de concorrência.</div>
                  </div>
                </div>

                {/* Ação de Seleção de Starter */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border-1">
                  {/* Sprint 5 — ação de JOGO (escolha de starter, dentro do
                      prólogo): secundária distinta, sem gradiente de conversão */}
                  <Link
                    href={`/onboarding?starter=${inspectedCard.id}`}
                    data-cta-id="tcg_starter"
                    onClick={() => track('nav_cta', 'tcg_starter', { starter: inspectedCard.id })}
                    className="flex-1 py-3 px-5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border-1 hover:border-brand-cyan-neon/50 text-brand-cyan-neon font-heading font-bold text-[13px] tracking-tight text-center transition-all flex items-center justify-center gap-2"
                  >
                    <IconBolt className="w-4 h-4" />
                    <span>Escolher Como Meu Starter</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setInspectedCard(null)}
                    className="py-3 px-4 rounded-xl bg-surface-2 hover:bg-white/[0.1] text-ink-body text-[13px] font-mono transition-colors"
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

