'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProfileTab, DigitalCertificate, UserProfile, SkillAxis } from './types';
import {
  INITIAL_PROFILE_DATA,
  TRACKS_PROGRESS_DATA,
  RECENT_ACTIVITIES_DATA,
  GIT_REPOSITORIES_DATA,
  BADGES_DATA,
  CERTIFICATES_DATA,
  INITIAL_SKILLS_RADAR
} from './data';
import { ProfileHeader } from './components/ProfileHeader';
import { OverviewTab } from './components/OverviewTab';
import { RepositoriesTab } from './components/RepositoriesTab';
import { AchievementsTab } from './components/AchievementsTab';
import { CertificatesTab } from './components/CertificatesTab';
import { SkillRadarTab } from './components/SkillRadarTab';
import { CertificateModal } from './components/CertificateModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Toast } from './components/Toast';
import { StudentSidebar } from '../../components/StudentSidebar';
import { StudentHeader } from '../../components/StudentHeader';
import { MaterialIcon } from '../../components/MaterialIcon';
import { useSidebar } from '../../context/SidebarContext';

export default function ProfilePage() {
  const { isCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nexus_student_custom_profile');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_PROFILE_DATA;
  });
  const [skills, setSkills] = useState<SkillAxis[]>(INITIAL_SKILLS_RADAR);
  const [selectedCertificate, setSelectedCertificate] = useState<DigitalCertificate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/profile/${profile.handle}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
    }
    showToast('🔗 Link público do perfil copiado para a área de transferência!');
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nexus_student_custom_profile', JSON.stringify(next));
          window.dispatchEvent(new Event('nexus_profile_updated'));
        } catch {}
      }
      return next;
    });
    showToast('✨ Perfil do desenvolvedor atualizado com sucesso!');
  };

  const handleSkillScoreChange = (index: number, newScore: number) => {
    setSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], score: newScore };
      return next;
    });
  };

  const handleDayClick = (day: { formattedDate: string; count: number }) => {
    showToast(`📅 ${day.formattedDate}: ${day.count} commits & desafios resolvidos no repositório.`);
  };

  const handleOpenCertificate = (cert: DigitalCertificate) => {
    setSelectedCertificate(cert);
  };

  const handleDownloadCertificate = () => {
    showToast('📄 Preparando download do certificado oficial em PDF de alta resolução...');
  };

  return (
    <div className="min-h-screen bg-[#07080C] text-[#F1F5F9] font-sans antialiased flex selection:bg-[#8257E5] selection:text-white">
      {/* Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] bg-gradient-to-b from-[#8257E5]/12 via-[#00E5FF]/6 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* TOAST FEEDBACK */}
      <Toast message={toastMessage} />

      {/* Sidebar Lateral Oficial com Suporte a Retrair */}
      <StudentSidebar />

      {/* Área de Conteúdo à Direita com Largura Dinâmica */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Header Superior */}
        <StudentHeader
          title="Perfil & Portfólio"
          subtitle="Identidade Técnica & Certificações Digitais"
          actions={
            <button
              type="button"
              onClick={handleShare}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111420] border border-[#1C2133] hover:border-[#8257E5] text-xs font-mono text-[#94A3B8] hover:text-white transition-colors cursor-pointer shadow-sm"
            >
              <MaterialIcon name="share" className="text-sm text-[#00E5FF]" />
              <span>Compartilhar Perfil</span>
            </button>
          }
        />

        {/* MAIN CONTAINER */}
        <main className="max-w-7xl mx-auto w-full px-5 lg:px-10 py-8 flex-1 pb-20 space-y-8">
          {/* HERO PROFILE HEADER */}
          <ProfileHeader profile={profile} onShare={handleShare} onEdit={handleEditProfile} />

          {/* INTERACTIVE TABS BAR */}
          <div className="flex items-center gap-2 border-b border-[#1C2133] pb-1 overflow-x-auto text-xs font-mono font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-[#8257E5]/20 text-[#A379FF] border border-[#8257E5]/40 shadow-[0_0_12px_rgba(130,87,229,0.2)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#111420]'
              }`}
            >
              <MaterialIcon name="grid_view" className="text-[16px]" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('repos')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'repos'
                  ? 'bg-[#8257E5]/20 text-[#A379FF] border border-[#8257E5]/40 shadow-[0_0_12px_rgba(130,87,229,0.2)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#111420]'
              }`}
            >
              <MaterialIcon name="code" className="text-[16px]" />
              <span>Repositórios Git</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#181C2C] text-[#A379FF] text-[10px]">
                {GIT_REPOSITORIES_DATA.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'achievements'
                  ? 'bg-[#8257E5]/20 text-[#A379FF] border border-[#8257E5]/40 shadow-[0_0_12px_rgba(130,87,229,0.2)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#111420]'
              }`}
            >
              <MaterialIcon name="military_tech" className="text-[16px]" />
              <span>Conquistas</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#181C2C] text-[#A379FF] text-[10px]">
                {BADGES_DATA.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('certificates')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'certificates'
                  ? 'bg-[#8257E5]/20 text-[#A379FF] border border-[#8257E5]/40 shadow-[0_0_12px_rgba(130,87,229,0.2)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#111420]'
              }`}
            >
              <MaterialIcon name="verified" className="text-[16px]" />
              <span>Certificados Oficiais</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#181C2C] text-[#00E5FF] text-[10px]">
                {CERTIFICATES_DATA.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('radar')}
              className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'radar'
                  ? 'bg-[#8257E5]/20 text-[#A379FF] border border-[#8257E5]/40 shadow-[0_0_12px_rgba(130,87,229,0.2)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#111420]'
              }`}
            >
              <MaterialIcon name="radar" className="text-[16px]" />
              <span>Simulador de Atributos</span>
            </button>
          </div>

          {/* TAB CONTENTS */}
          {activeTab === 'overview' && (
            <OverviewTab
              tracks={TRACKS_PROGRESS_DATA}
              activities={RECENT_ACTIVITIES_DATA}
              onDayClick={handleDayClick}
            />
          )}

          {activeTab === 'repos' && <RepositoriesTab repos={GIT_REPOSITORIES_DATA} />}

          {activeTab === 'achievements' && <AchievementsTab badges={BADGES_DATA} />}

          {activeTab === 'certificates' && (
            <CertificatesTab
              certificates={CERTIFICATES_DATA}
              onOpenCertificate={handleOpenCertificate}
            />
          )}

          {activeTab === 'radar' && (
            <SkillRadarTab skills={skills} onSkillScoreChange={handleSkillScoreChange} />
          )}
        </main>

        {/* Rodapé Minimalista */}
        <footer className="h-16 border-t border-[#1C2133] px-8 flex items-center justify-between text-xs font-mono text-[#64748B]">
          <span>© 2026 Nexus Code • Perfil Público do Aluno</span>
          <span>Portfólio verificado por testes automatizados</span>
        </footer>
      </div>

      {/* MODAL DE CERTIFICADO DIGITAL */}
      <CertificateModal
        certificate={selectedCertificate}
        studentName={profile.name}
        onClose={() => setSelectedCertificate(null)}
        onDownload={handleDownloadCertificate}
      />

      {/* MODAL DE EDIÇÃO DE PERFIL */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        profile={profile}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
