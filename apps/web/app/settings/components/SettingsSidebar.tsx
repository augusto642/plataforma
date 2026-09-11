'use client';

import React from 'react';
import { SettingsTab } from '../types';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: SettingsTab; label: string; icon: string; badge?: string }[] = [
    { id: 'profile', label: 'Perfil Público', icon: '👤' },
    { id: 'git-ssh', label: 'Chaves Git & SSH', icon: '🔑', badge: '2 ativas' },
    { id: 'tutor', label: 'Tutor Socrático IA', icon: '🧠', badge: 'Socrático' },
    { id: 'billing', label: 'Assinatura & Faturamento', icon: '💳', badge: 'PRO' },
    { id: 'security', label: 'Segurança & 2FA', icon: '🛡️', badge: '2FA On' },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left whitespace-nowrap md:whitespace-normal cursor-pointer ${
                isActive
                  ? 'bg-[#8257E5] text-white shadow-md shadow-[#8257E5]/30'
                  : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
              {tab.badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md hidden sm:inline-block ${
                    isActive
                      ? 'bg-black/30 text-white'
                      : 'bg-[#1E1E26] text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper Box */}
      <div className="hidden md:block mt-4 bg-[#121217] border border-[#27272A] rounded-2xl p-4 text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-white font-bold mb-1">
          <span>⚡</span>
          <span>Nexus Cloud Sandbox</span>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Suas chaves SSH e configurações são sincronizadas em tempo real com seu pod isolado Piston Linux.
        </p>
      </div>
    </aside>
  );
};
