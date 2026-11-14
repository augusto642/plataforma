'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '../Logo';
import { MaterialIcon } from '../MaterialIcon';
import { moveCommandSelection } from './commandPalette';
import { captureUtmFromUrl } from '../../lib/attribution';
import { track, trackPageview } from '../../lib/analytics';
import {
  IconBolt,
  IconCard,
  IconChart,
  IconClose,
  IconKey,
  IconMenu,
  IconSearch,
} from './icons';

export const LandingChrome: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    captureUtmFromUrl();
    trackPageview();
  }, []);

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
    { label: 'Explorar Cursos Avulsos', href: '/courses', icon: <IconCard className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Acessar Dashboard do Aluno', href: '/dashboard', icon: <IconChart className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Entrar na Minha Conta', href: '/login', icon: <IconKey className="w-5 h-5" />, category: 'Navegação' },
    { label: 'Ver Planos & Preços', href: '#planos', icon: <IconCard className="w-5 h-5" />, category: 'Navegação' },
  ];

  const filteredCommands = commandItems.filter((cmd) =>
    cmd.label.toLowerCase().includes(commandSearchQuery.toLowerCase()),
  );

  useEffect(() => {
    if (isCommandPaletteOpen) setSelectedCommandIndex(0);
  }, [isCommandPaletteOpen]);

  const activeCommandIndex =
    filteredCommands.length === 0
      ? -1
      : Math.min(selectedCommandIndex, filteredCommands.length - 1);

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
    } else if (e.key === 'Enter' && activeCommandIndex >= 0) {
      e.preventDefault();
      commandItemRefs.current[activeCommandIndex]?.click();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-dark-surface/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo Oficial */}
          <Logo size="lg" theme="dark" href="/" subtitle="PLATAFORMA GAMIFICADA" />

          {/* Desktop Nav Links (exato Stitch Home) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-body-sm text-dark-on-surface-variant font-label">
            <a href="#como-funciona" className="hover:text-white transition-colors whitespace-nowrap">
              Como funciona
            </a>
            <Link href="/courses" className="hover:text-white transition-colors whitespace-nowrap">
              Cursos avulsos
            </Link>
            <a href="#o-jogo" className="hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <span>O jogo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/15 text-secondary border border-secondary/30 font-code font-bold">
                XP
              </span>
            </a>
            <a href="#recursos" className="hover:text-white transition-colors whitespace-nowrap">
              Tutora de IA
            </a>
            <a href="#planos" className="hover:text-white transition-colors whitespace-nowrap">
              Planos
            </a>
          </nav>

          {/* Nav CTAs */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center text-body-sm font-label text-dark-on-surface hover:text-white transition-colors whitespace-nowrap"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              data-cta-id="nav_primary"
              onClick={() => track('nav_cta', 'nav_primary')}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-primary hover:bg-dark-primary text-on-primary font-label text-label-sm sm:text-label-md rounded transition-all duration-state-change shadow-lg shadow-primary/25 active:scale-[0.98] whitespace-nowrap"
            >
              <span>Começar grátis</span>
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded text-dark-on-surface-variant hover:text-white bg-dark-surface-container border border-border-subtle md:hidden transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <IconClose className="w-5 h-5" />
              ) : (
                <IconMenu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle px-6 py-5 bg-dark-surface-container-low flex flex-col gap-3">
            <a
              href="#como-funciona"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-body-sm font-label text-dark-on-surface-variant hover:text-white py-2"
            >
              Como funciona
            </a>
            <Link
              href="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-body-sm font-label text-dark-on-surface-variant hover:text-white py-2"
            >
              Cursos avulsos
            </Link>
            <a
              href="#o-jogo"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-body-sm font-label text-dark-on-surface-variant hover:text-white py-2 flex items-center gap-1.5"
            >
              <span>O jogo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/15 text-secondary border border-secondary/30 font-code font-bold">
                XP
              </span>
            </a>
            <a
              href="#recursos"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-body-sm font-label text-dark-on-surface-variant hover:text-white py-2"
            >
              Tutora de IA
            </a>
            <a
              href="#planos"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-body-sm font-label text-dark-on-surface-variant hover:text-white py-2"
            >
              Planos
            </a>
            <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-body-sm font-label text-dark-on-surface hover:text-white py-2"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                data-cta-id="nav_mobile_register"
                onClick={() => {
                  track('nav_cta', 'nav_mobile_register');
                  setIsMobileMenuOpen(false);
                }}
                className="whitespace-nowrap px-4 py-2 rounded bg-primary text-white text-body-sm font-label font-semibold shadow-md"
              >
                Começar grátis
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* COMMAND PALETTE MODAL (⌘K) */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-28 sm:pt-36 px-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsCommandPaletteOpen(false)}
          />
          <div
            className="relative w-full max-w-xl bg-dark-surface-container-low border border-border-strong rounded-lg shadow-2xl overflow-hidden"
            onKeyDown={handlePaletteKeyDown}
          >
            <div className="flex items-center px-5 py-4 border-b border-border-subtle gap-3">
              <IconSearch className="w-5 h-5 text-primary" />
              <input
                type="text"
                autoFocus
                placeholder="Digite um comando, página ou ação..."
                value={commandSearchQuery}
                onChange={(e) => {
                  setCommandSearchQuery(e.target.value);
                  setSelectedCommandIndex(0);
                }}
                className="w-full bg-transparent text-white text-sm outline-none placeholder:text-dark-on-surface-variant font-body"
              />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-xs font-code bg-dark-surface-container hover:bg-dark-surface-container-high px-2.5 py-1 rounded text-dark-on-surface-variant border border-border-subtle cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-xs text-dark-on-surface-variant font-code">
                  Nenhum comando encontrado para &ldquo;{commandSearchQuery}&rdquo;
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isActive = idx === activeCommandIndex;
                  return (
                    <Link
                      key={cmd.label}
                      ref={(el) => {
                        commandItemRefs.current[idx] = el;
                      }}
                      href={cmd.href}
                      onMouseEnter={() => setSelectedCommandIndex(idx)}
                      onClick={() => {
                        track('nav_cta', 'command_palette', { label: cmd.label, href: cmd.href });
                        setIsCommandPaletteOpen(false);
                      }}
                      aria-current={isActive ? 'true' : undefined}
                      className={`flex items-center justify-between p-3.5 rounded transition-colors group border ${
                        isActive
                          ? 'bg-primary/15 border-primary/40'
                          : 'hover:bg-primary/10 border-transparent hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-primary">{cmd.icon}</span>
                        <span
                          className={`text-sm font-medium transition-colors ${
                            isActive ? 'text-white' : 'text-dark-on-surface group-hover:text-white'
                          }`}
                        >
                          {cmd.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-code px-2 py-0.5 rounded bg-dark-surface-container border border-border-subtle text-dark-on-surface-variant">
                        {cmd.category}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 bg-dark-surface-container border-t border-border-subtle flex items-center justify-between text-[11px] text-dark-on-surface-variant font-code">
              <span>Navegue com ↑ ↓ e pressione Enter</span>
              <span className="text-primary font-bold">NEXUS ENGINE</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
