'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// B40/A4 (Sprint 13) — Topbar do admin com dados REAIS.
// Antes: pill "Piston Engine: 42ms" de um SystemMetric fictício, botão
// "Pool SRE" com ação simulada, central de notificações com alertas
// inventados ("Tentativa de Fork Bomb mitigada", "32/32 nós ativos") e
// menu com o primeiro usuário do mock. Agora:
//  - o pill mostra a saúde REAL da API (GET /admin/health);
//  - o menu mostra o administrador REAL da sessão (AuthContext);
//  - notificações e ações SRE fictícias foram removidas (sem endpoint).

interface AdminTopbarProps {
  currentUserName: string;
  currentUserEmail: string;
  currentUserInitials: string;
  healthStatus: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileMenu: () => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  currentUserName,
  currentUserEmail,
  currentUserInitials,
  healthStatus,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Global hotkey listener (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('admin-global-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthOk = healthStatus === 'healthy';

  return (
    <header className="h-16 bg-[#121217]/90 backdrop-blur-md border-b border-[#27272A] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: Hamburger & API health */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-[#181820] border border-[#27272A] text-[#A1A1AA] hover:text-white"
          aria-label="Abrir Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* API health pill (real — GET /admin/health) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181820] border border-[#27272A] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              healthStatus === null
                ? 'bg-[#71717A]'
                : healthOk
                  ? 'bg-[#04D361] animate-pulse shadow-[0_0_8px_#04D361]'
                  : 'bg-[#FFA116]'
            }`}
          />
          <span className="font-mono text-[#EDEDED] font-medium">API:</span>
          <span
            className={`font-mono font-semibold ${
              healthStatus === null ? 'text-[#71717A]' : healthOk ? 'text-[#04D361]' : 'text-[#FFA116]'
            }`}
          >
            {healthStatus === null ? 'não consultada' : healthOk ? 'saudável' : healthStatus}
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FFA116]/10 border border-[#FFA116]/30 text-xs text-[#FFA116] font-mono">
          <span>👑</span>
          <span className="font-semibold uppercase tracking-wide">Área Administrativa</span>
        </div>
      </div>

      {/* Middle section: Global Search with keyboard hint */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative flex items-center">
          <svg
            className="w-4 h-4 text-[#71717A] absolute left-3 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="admin-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar usuários por nome ou e-mail..."
            className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl pl-9 pr-14 py-1.5 text-xs text-[#EDEDED] placeholder-[#71717A] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(130,87,229,0.25)]"
          />
          <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#27272A] text-[#A1A1AA] rounded border border-[#3F3F46]">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section: Admin profile (real session user) */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl bg-[#181820] hover:bg-[#1F1F28] border border-[#27272A] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8257E5] to-[#FFA116] flex items-center justify-center font-bold text-white text-xs shadow-[0_0_10px_rgba(130,87,229,0.3)]">
              {currentUserInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white tracking-tight leading-tight">
                {currentUserName}
              </span>
              <span className="text-[10px] font-mono text-[#FFA116] uppercase font-bold">
                Administrador
              </span>
            </div>
            <svg className="w-3.5 h-3.5 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#181820] border border-[#27272A] rounded-2xl p-2 shadow-2xl z-50">
              <div className="p-2.5 border-b border-[#27272A] mb-1">
                <p className="text-xs font-semibold text-white">{currentUserName}</p>
                <p className="text-[11px] text-[#71717A] truncate font-mono">{currentUserEmail}</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors"
              >
                <span>🚀</span>
                <span>Visão de Estudante</span>
              </Link>
              <Link
                href="/ide"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors"
              >
                <span>💻</span>
                <span>Editor Monaco IDE</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors"
              >
                <span>⚙️</span>
                <span>Configurações</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
