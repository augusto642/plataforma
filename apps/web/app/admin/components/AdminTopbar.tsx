'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminUser, SystemMetric } from '../types';

interface AdminTopbarProps {
  currentUser: AdminUser;
  metrics: SystemMetric;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileMenu: () => void;
  onQuickAction?: (action: string) => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  currentUser,
  metrics,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  onQuickAction,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
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

  return (
    <header className="h-16 bg-[#121217]/90 backdrop-blur-md border-b border-[#27272A] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: Hamburger & Status indicators */}
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

        {/* Live Cluster Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181820] border border-[#27272A] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse shadow-[0_0_8px_#04D361]" />
          <span className="font-mono text-[#EDEDED] font-medium">Piston Engine:</span>
          <span className="font-mono text-[#04D361] font-semibold">{metrics.pistonLatencyMs}ms</span>
          <span className="text-[#71717A]">•</span>
          <span className="text-[#A1A1AA] text-[11px] font-mono">{metrics.cpuLoad}</span>
        </div>

        {/* Master Badge */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FFA116]/10 border border-[#FFA116]/30 text-xs text-[#FFA116] font-mono">
          <span>👑</span>
          <span className="font-semibold uppercase tracking-wide">Admin Master Mode</span>
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
            placeholder="Buscar usuários, trilhas, logs, hashes..."
            className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl pl-9 pr-14 py-1.5 text-xs text-[#EDEDED] placeholder-[#71717A] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(130,87,229,0.25)]"
          />
          <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#27272A] text-[#A1A1AA] rounded border border-[#3F3F46]">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section: Quick action & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Quick SRE flush button */}
        {onQuickAction && (
          <button
            onClick={() => onQuickAction('flush_pool')}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8257E5]/10 hover:bg-[#8257E5]/20 border border-[#8257E5]/30 text-xs font-semibold text-[#8257E5] hover:text-white transition-all shadow-[0_0_10px_rgba(130,87,229,0.15)]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Pool SRE</span>
          </button>
        )}

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-[#181820] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#8257E5] transition-all relative"
            aria-label="Notificações do Sistema"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="w-2 h-2 rounded-full bg-[#F43F5E] absolute top-1.5 right-1.5 shadow-[0_0_6px_#F43F5E]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#181820] border border-[#27272A] rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A] mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Alertas do Cluster
                </span>
                <span className="text-[10px] text-[#04D361] font-mono">32/32 nós ativos</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E]">
                  <p className="font-semibold">Tentativa de Fork Bomb mitigada</p>
                  <p className="text-[11px] text-[#A1A1AA]">cgroups v2 limitou processo do nó 03.</p>
                </div>
                <div className="p-2 rounded-xl bg-[#04D361]/10 border border-[#04D361]/20 text-[#04D361]">
                  <p className="font-semibold">Pool Piston Reciclado</p>
                  <p className="text-[11px] text-[#A1A1AA]">Latência média normalizada em 42ms.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Admin Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl bg-[#181820] hover:bg-[#1F1F28] border border-[#27272A] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8257E5] to-[#FFA116] flex items-center justify-center font-bold text-white text-xs shadow-[0_0_10px_rgba(130,87,229,0.3)]">
              {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white tracking-tight leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-mono text-[#FFA116] uppercase font-bold">
                {currentUser.role}
              </span>
            </div>
            <svg className="w-3.5 h-3.5 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#181820] border border-[#27272A] rounded-2xl p-2 shadow-2xl z-50">
              <div className="p-2.5 border-b border-[#27272A] mb-1">
                <p className="text-xs font-semibold text-white">{currentUser.name}</p>
                <p className="text-[11px] text-[#71717A] truncate font-mono">{currentUser.email}</p>
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
