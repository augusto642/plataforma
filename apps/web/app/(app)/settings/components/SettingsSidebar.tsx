'use client';

import React from 'react';
import { SettingsTab } from '../types';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  /**
   * B43 (Sprint 15) — plano REAL da conta (GET /users/me → `plan`,
   * via AuthContext). É a única fonte de selo da sidebar: o selo de
   * Assinatura exibe o plano de verdade ou não exibe nada.
   */
  // Fase 2 (resíduo da Fase 1): AuthContext já expõe 'career' desde a
  // Fase 1, mas o tipo daqui não — o build do web falhava nisso.
  plan?: 'free' | 'pro' | 'career';
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onTabChange,
  plan,
}) => {
  // B43 (Sprint 15) — fim dos selos fabricados. A sidebar exibia para
  // QUALQUER usuário "2 ativas" (Chaves Git & SSH), "PRO" (Assinatura)
  // e "2FA On" (Segurança), sem nenhuma fonte de dados — contradizendo
  // as próprias abas, honestas desde a Sprint 12 (B39): a API não tem
  // listagem de chaves SSH nem registros de 2FA. Os três selos saíram.
  // O único selo restante é o do plano, derivado do dado real da
  // conta: 'pro' → "PRO", 'free' → "Explorer" (os mesmos nomes da
  // BillingTab); sem plano identificado, nenhum selo aparece.
  const planBadge =
    plan === 'pro' ? 'PRO' : plan === 'free' ? 'Explorer' : plan === 'career' ? 'Carreira' : undefined;

  const tabs: { id: SettingsTab; label: string; icon: string; badge?: string }[] = [
    { id: 'profile', label: 'Perfil Público', icon: '👤' },
    { id: 'git-ssh', label: 'Chaves Git & SSH', icon: '🔑' },
    { id: 'tutor', label: 'Tutor Socrático IA', icon: '🧠' },
    { id: 'billing', label: 'Assinatura & Faturamento', icon: '💳', badge: planBadge },
    { id: 'security', label: 'Segurança & 2FA', icon: '🛡️' },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto shadow-sm">
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
                  : 'text-zinc-400 hover:text-white hover:bg-[#121624]'
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
                      : 'bg-[#121624] text-zinc-400 border border-[#1C2338]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden md:block mt-4 bg-[#0C0F17] border border-[#1C2338] rounded-2xl p-4 text-xs text-zinc-400 shadow-sm">
        <div className="flex items-center gap-2 text-white font-bold mb-1">
          <span>⚡</span>
          <span>Estado real da conta</span>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Cada aba mostra o estado real da sua conta sincronizado com a plataforma. Preferências de IA e dados de perfil são atualizados em tempo real.
        </p>
      </div>
    </aside>
  );
};
