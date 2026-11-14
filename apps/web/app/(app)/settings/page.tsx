'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SettingsTab } from './types';
import { SettingsSidebar } from './components/SettingsSidebar';
import { ProfileTab } from './components/ProfileTab';
import { GitKeysTab } from './components/GitKeysTab';
import { TutorPreferencesTab } from './components/TutorPreferencesTab';
import { BillingTab } from './components/BillingTab';
import { SecurityTab } from './components/SecurityTab';
import { ToastNotification } from './components/ToastNotification';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Toast Notification Container */}
      <ToastNotification message={toast?.message ?? null} type={toast?.type ?? 'success'} />

      {/* Sidebar Lateral Retrátil Oficial */}
      <StudentSidebar />

      {/* Conteúdo com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <StudentHeader
          title="Configurações da Conta"
          subtitle="Preferências & Perfil"
        />

        {/* MAIN CONTAINER */}
        <main className="max-w-[1240px] w-full mx-auto px-5 lg:px-8 py-8 flex-1">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121624] border border-[#8257E5]/40 text-[#A379FF] text-xs font-mono font-bold mb-3 shadow-sm">
              <span>⚙️</span>
              <span>PREFERÊNCIAS DA CONTA &amp; AMBIENTE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
              Configurações &amp;{' '}
              <span className="bg-gradient-to-r from-[#996DFF] via-[#00E5FF] to-[#04D361] bg-clip-text text-transparent">
                Infraestrutura
              </span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl mt-1 leading-relaxed">
              Gerencie seu perfil e as preferências do tutor de IA, e consulte o estado real de chaves, segurança e faturamento.
            </p>
          </div>

          {/* Layout: Sidebar Tabs + Active Tab Content */}
          <div className="flex flex-col md:flex-row gap-8">
            <SettingsSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              plan={user?.plan}
            />

            <section className="flex-1 min-w-0">
              {activeTab === 'profile' && (
                <ProfileTab onNotify={(msg, type) => showToast(msg, type)} />
              )}

              {activeTab === 'git-ssh' && <GitKeysTab />}

              {activeTab === 'tutor' && <TutorPreferencesTab />}

              {activeTab === 'billing' && <BillingTab />}

              {activeTab === 'security' && <SecurityTab />}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
