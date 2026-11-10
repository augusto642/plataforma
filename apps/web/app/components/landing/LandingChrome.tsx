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
  IconBolt, IconCard, IconChart, IconClose,
  IconKey, IconMenu, IconSearch,
} from './icons';

/* Sprint 10 · B34 — ilha client da landing: navbar, drawer mobile,
   command palette (⌘K) e os efeitos de chegada (UTM + pageview). É
   TUDO o que a casca da página precisa de estado; o restante virou
   Server Component. Central 218 (D1) — nav com os 5 itens do
   protótipo; sem dropdown "Jogo". */
export const LandingChrome: React.FC = () => {
  // Command Palette & Mobile State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  // B46 (Sprint 15) — seleção ativa da palette (setas ↑/↓ + Enter)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { label: 'Acessar Dashboard do Aluno', href: '/dashboard', icon: <IconChart className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Entrar na Minha Conta', href: '/login', icon: <IconKey className="w-5 h-5" />, category: 'Navegação' },
    // Central 218 (D1) — sem as 4 "trilhas no radar": o radar saiu
    // da home; a palette não promete matrícula em trilha inexistente.
    { label: 'Ver Planos & Preços', href: '#planos', icon: <IconCard className="w-5 h-5" />, category: 'Navegação' },
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

          {/* Central 218 (D1) — nav do protótipo Stitch v2: os 5
              itens, nesta ordem — Como funciona · Trilhas · O jogo
              (selo XP) · Recursos & IA · Planos. Saíram Terminal
              Prático/IDE, Dúvidas e o dropdown "Jogo". */}
          <nav className="hidden md:flex items-center justify-center gap-4 lg:gap-5 xl:gap-6 text-sm font-semibold text-ink-body whitespace-nowrap">
            <a href="#como-funciona" className="hover:text-ink-heading transition-colors">Como funciona</a>
            <a href="#trilhas" className="hover:text-ink-heading transition-colors">Trilhas</a>
            <a href="#o-jogo" className="hover:text-ink-heading transition-colors flex items-center gap-1.5">
              <span>O jogo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/15 text-secondary border border-secondary/30 font-code font-bold">XP</span>
            </a>
            <a href="#recursos" className="hover:text-ink-heading transition-colors">Recursos &amp; IA</a>
            <a href="#planos" className="hover:text-ink-heading transition-colors">Planos</a>
          </nav>

          {/* Botões do Navbar na Direita */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Central 216 (checagem visual) — a 390px "Entrar" + CTA +
                hambúrguer não cabiam e o CTA era cortado na borda. O
                "Entrar" some abaixo de sm (já existe no drawer). */}
            <Link href="/login" className="hidden sm:inline text-sm font-semibold text-ink-body hover:text-ink-heading px-3 py-2 transition-colors">
              Entrar
            </Link>

            {/* Sprint 5 — primário unificado: roxo sólido + rótulo único (o
                gradiente verde com glow foi aposentado dos CTAs de conta) */}
            {/* Central 216 (auditoria do Designer, item 5) — a 390px o
                rótulo quebrava em 3 linhas dentro do botão (linha
                estreita demais: "Entrar" + CTA + hambúrguer). Rótulo
                curto no mobile ("Começar grátis", como o protótipo) e
                sem quebra em nenhuma largura. */}
            <Link
              href="/register"
              data-cta-id="nav_primary"
              onClick={() => track('nav_cta', 'nav_primary')}
              className="inline-flex shrink-0 whitespace-nowrap items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark text-white text-body-sm sm:text-sm font-heading font-black tracking-tight transition-all duration-200 cursor-pointer active:scale-95 shadow-lg shadow-brand-purple/30 group"
            >
              <span className="sm:hidden">Começar grátis</span>
              <span className="hidden sm:inline">Começar grátis agora</span>
              <span className="hidden sm:inline group-hover:translate-x-1 transition-transform font-bold">→</span>
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
            {/* Central 218 (D1) — drawer com os mesmos 5 itens do
                protótipo, na mesma ordem do desktop. */}
            <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Como funciona
            </a>
            <a href="#trilhas" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Trilhas
            </a>
            <a href="#o-jogo" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2 flex items-center gap-1.5">
              <span>O jogo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/15 text-secondary border border-secondary/30 font-code font-bold">XP</span>
            </a>
            <a href="#recursos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Recursos &amp; IA
            </a>
            <a href="#planos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-ink-body hover:text-ink-heading py-2">
              Planos
            </a>
            <div className="pt-3 border-t border-border-1 flex items-center justify-between gap-3">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-body-sm font-semibold text-ink-body hover:text-ink-heading py-2">
                Entrar
              </Link>
              <Link href="/register" data-cta-id="nav_mobile_register" onClick={() => { track('nav_cta', 'nav_mobile_register'); setIsMobileMenuOpen(false); }} className="whitespace-nowrap px-4 py-2 rounded-xl bg-brand-purple text-white text-body-sm font-bold shadow-md">
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
