'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
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
import { SkillRadarTab } from './components/SkillRadarTab';
import { CertificateModal } from './components/CertificateModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Toast } from './components/Toast';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE_DATA);
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
    setProfile((prev) => ({ ...prev, ...updated }));
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
    <div style={{ minHeight: '100vh', background: '#08080B', color: '#F4F4F5', paddingBottom: '90px' }}>
      {/* BACKGROUND TECH GRADIENT */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(130, 87, 229, 0.12) 0%, transparent 60%), radial-gradient(circle at 90% 40%, rgba(0, 229, 255, 0.05) 0%, transparent 40%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* TOAST FEEDBACK */}
      <Toast message={toastMessage} />

      {/* TOP NAVBAR */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(8, 8, 11, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #262630',
          height: '64px'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%'
          }}
        >
          <Logo size="md" href="/" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link
              href="/dashboard"
              style={{
                color: '#A1A1AA',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Dashboard
            </Link>

            <Link
              href="/courses"
              style={{
                color: '#A1A1AA',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Trilhas & Cursos
            </Link>

            <Link
              href="/ide"
              style={{
                color: '#A1A1AA',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              IDE Sandbox
            </Link>

            <Link
              href="/profile"
              style={{
                color: '#996DFF',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Meu Perfil
            </Link>
          </div>

          <div>
            <button
              onClick={handleShare}
              style={{
                background: '#16161D',
                border: '1px solid #262630',
                color: '#EDEDED',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Compartilhar
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {/* HERO PROFILE HEADER */}
        <ProfileHeader profile={profile} onShare={handleShare} onEdit={handleEditProfile} />

        {/* INTERACTIVE TABS BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #262630',
            marginBottom: '24px',
            overflowX: 'auto'
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'overview' ? '#996DFF' : '#A1A1AA',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'overview' ? '#8257E5' : 'transparent'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Visão Geral
          </button>

          <button
            onClick={() => setActiveTab('repos')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'repos' ? '#996DFF' : '#A1A1AA',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'repos' ? '#8257E5' : 'transparent'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            Repositórios Git
            <span
              style={{
                background: activeTab === 'repos' ? 'rgba(130, 87, 229, 0.25)' : '#1F1F28',
                color: activeTab === 'repos' ? '#996DFF' : '#A1A1AA',
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '9999px',
                fontWeight: 700
              }}
            >
              {GIT_REPOSITORIES_DATA.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'achievements' ? '#996DFF' : '#A1A1AA',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'achievements' ? '#8257E5' : 'transparent'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            Conquistas & Badges
            <span
              style={{
                background: activeTab === 'achievements' ? 'rgba(130, 87, 229, 0.25)' : '#1F1F28',
                color: activeTab === 'achievements' ? '#996DFF' : '#A1A1AA',
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '9999px',
                fontWeight: 700
              }}
            >
              {BADGES_DATA.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'radar' ? '#996DFF' : '#A1A1AA',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === 'radar' ? '#8257E5' : 'transparent'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 8.5 2 15.5 12 22 22 15.5 22 8.5 12 2" />
            </svg>
            Radar de Habilidades 6D
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

        {activeTab === 'achievements' && (
          <AchievementsTab
            badges={BADGES_DATA}
            certificates={CERTIFICATES_DATA}
            onOpenCertificate={handleOpenCertificate}
          />
        )}

        {activeTab === 'radar' && (
          <SkillRadarTab skills={skills} onSkillScoreChange={handleSkillScoreChange} />
        )}
      </main>

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
