'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Logo from '../../components/Logo';
import { ProfileTab, DigitalCertificate, UserProfile, SkillAxis } from '../types';
import {
  INITIAL_PROFILE_DATA,
  TRACKS_PROGRESS_DATA,
  RECENT_ACTIVITIES_DATA,
  GIT_REPOSITORIES_DATA,
  BADGES_DATA,
  CERTIFICATES_DATA,
  INITIAL_SKILLS_RADAR,
} from '../data';
import { ProfileHeader } from '../components/ProfileHeader';
import { OverviewTab } from '../components/OverviewTab';
import { RepositoriesTab } from '../components/RepositoriesTab';
import { AchievementsTab } from '../components/AchievementsTab';
import { SkillRadarTab } from '../components/SkillRadarTab';
import { CertificateModal } from '../components/CertificateModal';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { Toast } from '../components/Toast';

export default function DynamicProfilePage() {
  const params = useParams();
  const rawUsername = params?.username as string | undefined;
  const username = rawUsername ? decodeURIComponent(rawUsername) : 'augusto';

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<UserProfile>(() => ({
    ...INITIAL_PROFILE_DATA,
    handle: `@${username.replace(/^@/, '')}`,
    name: username.replace(/^@/, '').replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
  const [skills, setSkills] = useState<SkillAxis[]>(INITIAL_SKILLS_RADAR);
  const [selectedCertificate, setSelectedCertificate] = useState<DigitalCertificate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (rawUsername) {
      const cleanHandle = `@${decodeURIComponent(rawUsername).replace(/^@/, '')}`;
      setProfile((prev) => ({
        ...prev,
        handle: cleanHandle,
      }));
    }
  }, [rawUsername]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/profile/${profile.handle.replace(/^@/, '')}`;
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
      const copy = [...prev];
      copy[index] = { ...copy[index], score: newScore };
      return copy;
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0C10',
        color: '#EDEDED',
        fontFamily: 'var(--font-sans, "Geist", "Inter", sans-serif)',
        overflowX: 'hidden',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: '1px solid #1E222D',
          backgroundColor: 'rgba(10, 12, 16, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Logo />
            </Link>

            <nav style={{ display: 'flex', gap: '20px' }}>
              <Link
                href="/dashboard"
                style={{
                  fontSize: '14px',
                  color: '#8A8F98',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
              >
                Dashboard
              </Link>
              <Link
                href="/courses"
                style={{
                  fontSize: '14px',
                  color: '#8A8F98',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
              >
                Cursos
              </Link>
              <Link
                href="/ide"
                style={{
                  fontSize: '14px',
                  color: '#8A8F98',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
              >
                Web IDE
              </Link>
              <span
                style={{
                  fontSize: '14px',
                  color: '#EDEDED',
                  fontWeight: 600,
                  borderBottom: '2px solid #8257E5',
                  paddingBottom: '20px',
                  marginTop: '2px',
                }}
              >
                Perfil Público
              </span>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleShare}
              style={{
                backgroundColor: 'rgba(130, 87, 229, 0.15)',
                border: '1px solid rgba(130, 87, 229, 0.4)',
                color: '#996DFF',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🔗</span> Compartilhar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '32px 24px 64px',
        }}
      >
        <ProfileHeader
          profile={profile}
          onShare={handleShare}
          onEdit={handleEditProfile}
        />

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #1E222D',
            marginTop: '32px',
            marginBottom: '32px',
          }}
        >
          {(
            [
              { id: 'overview', label: 'Visão Geral', icon: '📊' },
              { id: 'repos', label: 'Repositórios & Capstones', icon: '📁', count: GIT_REPOSITORIES_DATA.length },
              { id: 'achievements', label: 'Conquistas & Badges', icon: '🏆', count: CERTIFICATES_DATA.length },
              { id: 'radar', label: 'Radar de Habilidades 6D', icon: '⚡' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #8257E5' : '2px solid transparent',
                color: activeTab === tab.id ? '#EDEDED' : '#8A8F98',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {'count' in tab && (
                <span
                  style={{
                    backgroundColor: '#1E222D',
                    color: '#8A8F98',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <OverviewTab
            tracks={TRACKS_PROGRESS_DATA}
            activities={RECENT_ACTIVITIES_DATA}
            onDayClick={(day) => showToast(`📅 Atividade: ${day.count} contribuições em ${day.formattedDate}`)}
          />
        )}

        {activeTab === 'repos' && <RepositoriesTab repos={GIT_REPOSITORIES_DATA} />}

        {activeTab === 'achievements' && (
          <AchievementsTab
            badges={BADGES_DATA}
            certificates={CERTIFICATES_DATA}
            onOpenCertificate={(cert) => setSelectedCertificate(cert)}
          />
        )}

        {activeTab === 'radar' && (
          <SkillRadarTab
            skills={skills}
            onSkillScoreChange={handleSkillScoreChange}
          />
        )}
      </main>

      {/* Modals & Toasts */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          studentName={profile.name}
          onClose={() => setSelectedCertificate(null)}
          onDownload={() => showToast('Certificado baixado com sucesso.')}
        />
      )}

      {isEditModalOpen && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          profile={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
