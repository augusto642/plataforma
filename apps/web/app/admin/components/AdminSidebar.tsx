'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { AdminTab } from '../types';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  usersCount: number;
  coursesCount: number;
  instructorsCount: number;
  criticalLogsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  usersCount,
  coursesCount,
  instructorsCount,
  criticalLogsCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Visão Geral & SRE',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      badge: 'Live',
      badgeColor: 'bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30',
    },
    {
      id: 'users',
      label: 'Gestão de Usuários',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      badge: usersCount,
      badgeColor: 'bg-[#8257E5]/15 text-[#8257E5] border border-[#8257E5]/30',
    },
    {
      id: 'instructors',
      label: 'Instrutores & Leads',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      ),
      badge: instructorsCount,
      badgeColor: 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30',
    },
    {
      id: 'courses',
      label: 'Cursos & Desafios',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      badge: coursesCount,
      badgeColor: 'bg-[#FFA116]/15 text-[#FFA116] border border-[#FFA116]/30',
    },
    {
      id: 'system',
      label: 'Sandbox & Piston SRE',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      badge: '32 VMs',
      badgeColor: 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30',
    },
    {
      id: 'audit',
      label: 'Auditoria & Certificados',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      badge: criticalLogsCount > 0 ? `${criticalLogsCount} alertas` : undefined,
      badgeColor: 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-[#121217] border-r border-[#27272A] w-64 lg:w-72 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" href="/" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#FFA116]/10 text-[#FFA116] border border-[#FFA116]/30">
              ADMIN
            </span>
          </div>
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#181820]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Master Control Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-[#181820] border border-[#27272A] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFA116]/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFA116] to-[#8257E5] p-[1.5px] shadow-[0_0_15px_rgba(255,161,22,0.3)]">
              <div className="w-full h-full bg-[#121217] rounded-[10px] flex items-center justify-center font-bold text-white text-sm">
                ⚡
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                Admin Master
                <span className="w-2 h-2 rounded-full bg-[#04D361] animate-pulse" />
              </span>
              <span className="text-[11px] text-[#A1A1AA] font-mono">Cluster: us-east-1</span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#71717A] font-semibold">
            Módulos de Controle
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (mobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#8257E5]/15 text-white border border-[#8257E5]/40 shadow-[0_0_15px_rgba(130,87,229,0.2)] font-semibold'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#181820] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-[#8257E5]' : 'text-[#71717A]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-[#27272A] text-[#EDEDED]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Platform Shortcuts */}
      <div className="p-4 border-t border-[#27272A] space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white hover:bg-[#181820] transition-colors"
        >
          <svg className="w-4 h-4 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Painel do Aluno</span>
        </Link>
        <Link
          href="/ide"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white hover:bg-[#181820] transition-colors"
        >
          <svg className="w-4 h-4 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span>Nexus IDE & Sandbox</span>
        </Link>
        <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-[#71717A]">
          <span>NEXUS ENGINE v2.4</span>
          <span className="text-[#04D361] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#04D361]" /> Online
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
