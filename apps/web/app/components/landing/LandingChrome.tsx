'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '../Logo';
import { moveCommandSelection } from './commandPalette';
// B11 — captura de atribuição na chegada (a porta de cadastro lê da lib)
import { captureUtmFromUrl } from '../../lib/attribution';
// B08 — eventos do funil da landing (+ pageview na Sprint 5)
import { track, trackPageview } from '../../lib/analytics';
// Frente 3 — ícones SVG únicos da landing
import {
  IconBolt, IconCard, IconCards, IconChart, IconChevronDown, IconClose,
  IconCode, IconGamepad, IconGear, IconKey, IconMenu, IconNodes,
  IconSearch, IconSparkle, IconTerminal,
} from './icons';

/* Sprint 10 · B34 — ilha client da landing: navbar, drawer mobile,
   dropdown "Jogo", command palette (⌘K) e os efeitos de chegada
   (UTM + pageview). É TUDO o que a casca da página precisa de estado;
   o restante virou Server Component. */
export const LandingChrome: React.FC = () => {
  // Command Palette & Mobile State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  // B46 (Sprint 15) — seleção ativa da palette (setas ↑/↓ + Enter)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Sprint 9 — dropdown "Jogo" da navbar enxuta (desktop)
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  // B11 — a atribuição nasce na chegada: UTMs da URL da landing são
  // persistidos aqui, para qualquer porta de cadastro (register ou
  // onboarding) herdá-los depois, mesmo sem UTM na URL final.
  // Sprint 5 — a landing também emite o pageview do funil (topo do funil).
  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
  }, []);

  // Global Command Palette Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commandItems = [
    { label: 'Iniciar Cadastro Gratuito', href: '/register', icon: <IconBolt className="w-5 h-5" />, category: 'Ações Rápidas' },
    { label: 'Abrir Terminal & Playground de Código', href: '/ide', icon: <IconTerminal className="w-5 h-5" />, category: 'Ações Rápidas' },
    { label: 'Acessar Dashboard do Aluno', href: '/dashboard', icon: <IconChart className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Entrar na Minha Conta', href: '/login', icon: <IconKey className="w-5 h-5" />, category: 'Navegação' },
    // B64 (Sprint 18 · Volta 3 · QA A3) — as 4 "trilhas" da palette
    // são as trilhas do RADAR (não são cursos abertos): ganham a
    // marcação de roadmap no rótulo e o destino vira a seção de
    // trilhas, onde mora a lista de espera de cada uma — não o
    // /register seco, que prometia matrícula numa trilha inexistente.
    { label: 'Rust — Lógica & Alta Performance (no radar: lista de espera)', href: '/#trilhas', icon: <IconGear className="w-5 h-5" />, category: 'Trilhas no radar' },
    { label: 'Go — APIs & Backend Moderno (no radar: lista de espera)', href: '/#trilhas', icon: <IconNodes className="w-5 h-5" />, category: 'Trilhas no radar' },
    { label: 'React & Next.js — Desenvolvimento Web (no radar: lista de espera)', href: '/#trilhas', icon: <IconBolt className="w-5 h-5" />, category: 'Trilhas no radar' },
    { label: 'Python & IA (no radar: lista de espera)', href: '/#trilhas', icon: <IconCode className="w-5 h-5" />, category: 'Trilhas no radar' },
    { label: 'Ver Planos & Preços', href: '#precos', icon: <IconCard className="w-5 h-5" />, category: 'Navegação' },
  ];

  const filteredCommands = commandItems.filter((cmd) =>
    cmd.label.toLowerCase().includes(commandSearchQuery.toLowerCase())
  );

  // B46 (Sprint 15) — a seleção sempre aponta para um item existente:
  // ao abrir a palette ela volta ao primeiro item, e o índice usado
  // na renderização é limitado ao tamanho atual da lista filtrada.
  useEffect(() => {
    if (isCommandPaletteOpen) setSelectedCommandIndex(0);
  }, [isCommandPaletteOpen]);

  const activeCommandIndex =
    filteredCommands.length === 0
      ? -1
      : Math.min(selectedCommandIndex, filteredCommands.length - 1);

  // B46 (Sprint 15) — o rodapé da palette sempre anunciou "Navegue
  // com ↑ ↓ e pressione Enter", mas não havia handler de setas: a
  // promessa agora é o comportamento. ↑/↓ movem a seleção (com
  // wrap-around, via moveCommandSelection) e Enter clica no item
  // selecionado — reusando o onClick do próprio link (tracking +
  // fechamento), sem duplicar a lógica de navegação.
  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const next = moveCommandSelection(
        activeCommandIndex < 0 ? 0 : activeCommandIndex,
        delta,
        filteredCommands.length,
      );
      setSelectedCommandIndex(next);
      commandItemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (activeCommandIndex >= 0) {
        e.preventDefault();
        commandItemRefs.current[activeCommandIndex]?.click();
      }
    }
  };

  return (
    <>
      {/* 1. NAVBAR DARK OBSIDIAN LUXURY GLASS */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-background/80 border-b border-border-1 shadow-elev-sm">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-cyan-neon/30 to-transparent pointer-events-none"></div>

        <div className="w-full px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Logo Oficial na Esquerda com tema Dark */}
          <div className="flex items-center gap-4 shrink-0">
            <Logo size="lg" theme="dark" href="/" />
          </div>

          {/* Navegação Central com maior espaçamento */}
          <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 xl:gap-10 text-[15px] font-semibold text-ink-body">
            {/* Sprint 7 — a navbar segue a ORDEM DA OFERTA (a mesma das
                seções da página): Como Funciona → Trilhas → Terminal →
                Planos → Dúvidas.
                Sprint 9 — navbar enxuta: os 3 links do jogo (Modo RPG 2D,
                Criar Avatar, Cards TCG) saíram da barra principal e
                moram num único item "Jogo" (dropdown simples), pra barra
                ter 6 itens e a oferta liderar sozinha */}
            <a href="#metodologia" className="hover:text-ink-heading transition-colors">Como Funciona</a>
            <a href="#trilhas" className="hover:text-ink-heading transition-colors">Trilhas</a>
            <a href="#sandbox" className="hover:text-ink-heading transition-colors flex items-center gap-2">
              <span>Terminal Prático</span>
              <span className="inline-flex items-center gap-1.5 text-body-sm font-mono px-2 py-0.5 rounded-md bg-surface-2 text-brand-cyan-neon border border-border-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green-neon"></span>
                IDE
              </span>
            </a>
            <a href="#precos" className="hover:text-ink-heading transition-colors">Planos</a>
            <a href="#faq" className="hover:text-ink-heading transition-colors">Dúvidas</a>
            <div className="relative" onMouseLeave={() => setIsGameMenuOpen(false)}>
              <button
                type="button"
                onClick={() => setIsGameMenuOpen(!isGameMenuOpen)}
                aria-expanded={isGameMenuOpen}
                aria-haspopup="true"
                className="hover:text-ink-heading transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <IconGamepad className="w-5 h-5" />
                <span>Jogo</span>
                <IconChevronDown className={`w-4 h-4 transition-transform ${isGameMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isGameMenuOpen && (
                <div className="absolute right-0 top-full pt-3 z-50">
                  <div className="w-52 rounded-2xl bg-surface-1 border border-border-1 shadow-elev-sm p-2 flex flex-col">
                    <Link href="/game" onClick={() => setIsGameMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm text-ink-body hover:text-ink-heading hover:bg-surface-2 transition-colors flex items-center gap-2">
                      <IconGamepad className="w-5 h-5 shrink-0" />
                      <span>Modo RPG 2D</span>
                    </Link>
                    <Link href="/onboarding" data-cta-id="nav_avatar" onClick={() => { track('nav_cta', 'nav_avatar'); setIsGameMenuOpen(false); }} className="px-3 py-2.5 rounded-xl text-sm text-ink-body hover:text-ink-heading hover:bg-surface-2 transition-colors flex items-center gap-2">
                      <IconSparkle className="w-5 h-5 shrink-0" />
                      <span>Criar Avatar</span>
                    </Link>
                    <a href="#colecionaveis" onClick={() => setIsGameMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm text-ink-body hover:text-ink-heading hover:bg-surface-2 transition-colors flex items-center gap-2">
                      <IconCards className="w-5 h-5 shrink-0" />
                      <span>Cards TCG</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Botões do Navbar na Direita */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/login" className="text-sm font-semibold text-ink-body hover:text-ink-heading px-3 py-2 transition-colors">
              Entrar
            </Link>

            {/* Sprint 5 — primário unificado: roxo sólido + rótulo único (o
                gradiente verde com glow foi aposentado dos CTAs de conta) */}
            <Link
              href="/onboarding"
              data-cta-id="nav_primary"
              onClick={() => track('nav_cta', 'nav_primary')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm sm:text-sm font-heading font-black tracking-tight transition-all duration-200 cursor-pointer active:scale-95 shadow-lg shadow-brand-purple/30 group"
            >
              <span>Começar grátis agora</span>
              <span className="group-hover:translate-x-1 transition-transform font-bold">→</span>
            </Link>


            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl text-ink-span hover:text-ink-heading bg-surface-1 border border-border-1 md:hidden transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <IconClose className="w-[22px] h-[22px]" />
              ) : (
                <IconMenu className="w-[22px] h-[22px]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border-1 px-6 py-5 bg-surface-1/95 backdrop-blur-xl shadow-2xl flex flex-col gap-3 animate-fadeIn">
            {/* Sprint 7 — drawer na mesma ordem da oferta do desktop */}
            <a href="#metodologia" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Como Funciona
            </a>
            <a href="#trilhas" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              4 Trilhas Práticas
            </a>
            <a href="#sandbox" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2 flex items-center justify-between">
              <span>Terminal Interativo</span>
              <span className="text-body-sm font-mono px-2 py-0.5 rounded bg-brand-purple/15 text-brand-purple-light border border-brand-purple/30">IDE</span>
            </a>
            <a href="#precos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Planos & Preços
            </a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Perguntas Frequentes
            </a>
            {/* Sprint 9 — no drawer, os links do jogo viram um grupo
                rotulado "Jogo" (mesma lógica do dropdown do desktop):
                a oferta lidera e o jogo fica a um nível de distância */}
            <div className="pt-2 mt-1 border-t border-border-1">
              <span className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-span py-1.5">Jogo</span>
              <div className="flex flex-col pl-3">
                <Link href="/game" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
                  Modo RPG 2D
                </Link>
                <Link href="/onboarding" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
                  Criar Avatar
                </Link>
                <a href="#colecionaveis" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
                  Cards TCG
                </a>
              </div>
            </div>
            <div className="pt-3 border-t border-border-1 flex items-center justify-between gap-3">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-body-sm font-semibold text-ink-body hover:text-ink-heading py-2">
                Entrar
              </Link>
              <Link href="/register" data-cta-id="nav_mobile_register" onClick={() => { track('nav_cta', 'nav_mobile_register'); setIsMobileMenuOpen(false); }} className="px-4 py-2 rounded-xl bg-brand-purple text-white text-body-sm font-bold shadow-md">
                Começar grátis agora
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* COMMAND PALETTE MODAL (⌘K) */}
      {isCommandPaletteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-surface-1 border border-border-1 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
          >
            <div className="p-4 border-b border-border-1 flex items-center gap-3 bg-surface-1">
              <span className="text-brand-purple-light shrink-0">
                <IconSearch className="w-[18px] h-[18px]" />
              </span>
              <input
                type="text"
                autoFocus
                placeholder="Digite o que procura (ex: Python, Rust, Go, Terminal, Entrar)..."
                value={commandSearchQuery}
                onChange={(e) => {
                  setCommandSearchQuery(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                onKeyDown={handlePaletteKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-list"
                aria-activedescendant={
                  activeCommandIndex >= 0
                    ? `command-option-${activeCommandIndex}`
                    : undefined
                }
                className="w-full bg-transparent text-sm text-ink-heading placeholder-ink-span outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-body-sm text-ink-span hover:text-ink-heading font-mono px-2 py-1 rounded bg-surface-3/80 cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div
              id="command-palette-list"
              role="listbox"
              aria-label="Comandos"
              className="max-h-80 overflow-y-auto p-2 divide-y divide-border-1/60"
            >
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-body-sm text-ink-span">
                  Nenhum resultado encontrado para "{commandSearchQuery}".
                </div>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <Link
                    key={i}
                    id={`command-option-${i}`}
                    role="option"
                    aria-selected={i === activeCommandIndex}
                    ref={(el) => {
                      commandItemRefs.current[i] = el;
                    }}
                    onMouseEnter={() => setSelectedCommandIndex(i)}
                    href={cmd.href}
                    data-cta-id={cmd.href === '/register' ? 'palette_register' : undefined}
                    onClick={() => {
                      if (cmd.href === '/register') track('nav_cta', 'palette_register');
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl text-body-sm text-ink-body transition-colors group cursor-pointer ${
                      i === activeCommandIndex ? 'bg-surface-2' : 'hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-brand-purple-light flex items-center shrink-0">{cmd.icon}</span>
                      <div>
                        <div className={`font-semibold transition-colors ${
                          i === activeCommandIndex
                            ? 'text-brand-purple-light'
                            : 'text-ink-heading group-hover:text-brand-purple-light'
                        }`}>{cmd.label}</div>
                        <div className="text-body-sm text-ink-span font-mono">{cmd.category}</div>
                      </div>
                    </div>
                    <span className={`font-mono text-body-sm ${
                      i === activeCommandIndex
                        ? 'text-brand-green-neon'
                        : 'text-ink-span group-hover:text-brand-green-neon'
                    }`}>
                      Ir →
                    </span>
                  </Link>
                ))
              )}
            </div>

            <div className="p-3 bg-background border-t border-border-1 text-body-sm text-ink-span flex items-center justify-between font-mono">
              <span>Navegue com ↑ ↓ e pressione Enter</span>
              <span className="text-ink-span">NEXUS CODE v2.4</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
