'use client';

import React from 'react';
import { BadgeItem, DigitalCertificate } from '../types';

interface AchievementsTabProps {
  badges: BadgeItem[];
  certificates: DigitalCertificate[];
  onOpenCertificate: (cert: DigitalCertificate) => void;
}

export function AchievementsTab({ badges, certificates, onOpenCertificate }: AchievementsTabProps) {
  return (
    <div>
      {/* BADGES SECTION */}
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>
        Vitrine de Badges & Conquistas de Elite ({badges.filter((b) => b.isUnlocked).length} Desbloqueadas)
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '36px'
        }}
      >
        {badges.map((badge) => {
          const isLegendary = badge.tier === 'legendary';
          const isEpic = badge.tier === 'epic';

          return (
            <div
              key={badge.id}
              style={{
                background: '#101015',
                border: `1px solid ${
                  badge.isUnlocked
                    ? isLegendary
                      ? 'rgba(255, 161, 22, 0.4)'
                      : isEpic
                      ? 'rgba(130, 87, 229, 0.4)'
                      : 'rgba(0, 229, 255, 0.4)'
                    : '#262630'
                }`,
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                opacity: badge.isUnlocked ? 1 : 0.55,
                filter: badge.isUnlocked ? 'none' : 'grayscale(0.8)',
                transition: 'transform 0.2s'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0,
                  background: badge.isUnlocked
                    ? isLegendary
                      ? 'rgba(255, 161, 22, 0.15)'
                      : 'rgba(130, 87, 229, 0.2)'
                    : '#1F1F28',
                  border: `1px solid ${
                    badge.isUnlocked
                      ? isLegendary
                        ? 'rgba(255, 161, 22, 0.5)'
                        : 'rgba(130, 87, 229, 0.5)'
                      : '#262630'
                  }`,
                  boxShadow: badge.isUnlocked
                    ? isLegendary
                      ? '0 0 15px rgba(255, 161, 22, 0.3)'
                      : '0 0 15px rgba(130, 87, 229, 0.3)'
                    : 'none'
                }}
              >
                {badge.icon}
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', margin: '0 0 2px 0' }}>{badge.name}</h4>
                <p style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.4, margin: 0 }}>{badge.description}</p>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '4px',
                    display: 'inline-block',
                    color: badge.isUnlocked
                      ? isLegendary
                        ? '#FFA116'
                        : isEpic
                        ? '#996DFF'
                        : '#00E5FF'
                      : '#71717A'
                  }}
                >
                  {badge.isUnlocked
                    ? isLegendary
                      ? 'Tier Lendário'
                      : isEpic
                      ? 'Tier Épico'
                      : 'Tier Raro'
                    : `Bloqueada (${badge.progressText})`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CERTIFICATES SECTION */}
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>
        Certificados Digitais Oficiais NEXUS CODE (Verificados SHA-256)
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        }}
      >
        {certificates.map((cert) => (
          <div
            key={cert.id}
            style={{
              background: '#101015',
              border: '1px solid #262630',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div
              style={{
                height: '130px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderBottom: '1px solid #262630'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#996DFF', letterSpacing: '1px' }}>
                  NEXUS CERTIFICATE
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(4, 211, 97, 0.2)',
                    border: '1px solid #04D361',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#04D361'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>{cert.title}</div>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
                {cert.trackName}
              </div>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '12px' }}>
                Emitido em {cert.issueDate} • {cert.hours}
              </div>

              <div
                style={{
                  background: '#16161D',
                  border: '1px dashed #262630',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '11px',
                  color: '#00E5FF',
                  marginBottom: '16px',
                  wordBreak: 'break-all'
                }}
              >
                SHA256: {cert.hashSha256}
              </div>

              <button
                onClick={() => onOpenCertificate(cert)}
                style={{
                  width: '100%',
                  background: '#16161D',
                  border: '1px solid #262630',
                  color: '#EDEDED',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Visualizar Certificado Oficial
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
