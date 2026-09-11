'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { SettingsTab } from './types';
import { SettingsSidebar } from './components/SettingsSidebar';
import { ProfileTab } from './components/ProfileTab';
import { GitKeysTab } from './components/GitKeysTab';
import { TutorPreferencesTab } from './components/TutorPreferencesTab';
import { BillingTab } from './components/BillingTab';
import { SecurityTab } from './components/SecurityTab';
import { ToastNotification } from './components/ToastNotification';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black pb-24">
      {/* Toast Notification Container */}
      <ToastNotification message={toast?.message ?? null} type={toast?.type ?? 'success'} />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/courses" className="text-zinc-400 hover:text-white transition-colors">
                Cursos
              </Link>
              <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                Leaderboard
              </Link>
              <Link href="/ide" className="text-zinc-400 hover:text-white transition-colors">
                IDE Sandbox
              </Link>
              <Link href="/profile" className="text-zinc-400 hover:text-white transition-colors">
                Perfil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8257E5]/15 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold">
              <span>⚙️</span>
              <span>Configurações</span>
            </div>
            <Link
              href="/profile"
              className="w-9 h-9 rounded-xl bg-[#181820] border border-[#27272A] flex items-center justify-center text-xs font-mono font-bold text-white hover:border-[#8257E5] transition-colors"
            >
              AG
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="max-w-[1240px] mx-auto px-5 pt-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8257E5]/10 border border-[#8257E5]/30 text-[#996DFF] text-xs font-mono font-bold mb-3">
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
            Gerencie seu perfil de engenheiro, chaves criptográficas SSH/GPG, modelo pedagógico do tutor de IA e faturamento.
          </p>
        </div>

        {/* Layout: Sidebar Tabs + Active Tab Content */}
        <div className="flex flex-col md:flex-row gap-8">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

          <section className="flex-1 min-w-0">
            {activeTab === 'profile' && <ProfileTab onSave={(msg) => showToast(msg)} />}

            {activeTab === 'git-ssh' && (
              <GitKeysTab onNotify={(msg, type) => showToast(msg, type)} />
            )}

            {activeTab === 'tutor' && (
              <TutorPreferencesTab onSave={(msg) => showToast(msg)} />
            )}

            {activeTab === 'billing' && <BillingTab onNotify={(msg) => showToast(msg)} />}

            {activeTab === 'security' && (
              <SecurityTab onNotify={(msg, type) => showToast(msg, type)} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
