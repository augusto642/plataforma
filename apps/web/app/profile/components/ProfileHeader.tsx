'use client';

import React from 'react';
import { UserProfile } from '../types';

interface ProfileHeaderProps {
  profile: UserProfile;
  onShare: () => void;
  onEdit: () => void;
}

export function ProfileHeader({ profile, onShare, onEdit }: ProfileHeaderProps) {
  return (
    <section
      style={{
        marginTop: '24px',
        marginBottom: '24px',
        background: '#101015',
        border: '1px solid #262630',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        position: 'relative'
      }}
    >
      {/* COVER BANNER */}
      <div
        style={{
          height: '190px',
          background: 'linear-gradient(135deg, #18112e 0%, #0d1e2e 50%, #09211d 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.4,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, #8257E5 0%, transparent 40%), radial-gradient(circle at 80% 30%, #00E5FF 0%, transparent 35%), radial-gradient(circle at 50% 80%, #04D361 0%, transparent 30%)',
            filter: 'blur(40px)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            fontFamily: 'ui-monospace, monospace',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.08)',
            lineHeight: 1.5,
            padding: '16px',
            overflow: 'hidden',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {`const architect = new DeveloperProfile({ name: "${profile.name}", role: "${profile.role}" });`}
          <br />
          {`await architect.deployMastery(["Rust", "TypeScript", "Distributed Systems", "WASM", "Autonomous Agents"]);`}
          <br />
          {`// NEXUS CODE VERIFIED PROFILE ID: ${profile.id}`}
        </div>

        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(8, 8, 11, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#00E5FF',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            letterSpacing: '0.5px'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00E5FF',
              boxShadow: '0 0 8px #00E5FF',
              display: 'inline-block'
            }}
          />
          {profile.status}
        </div>
      </div>

      {/* BODY INFO */}
      <div
        style={{
          padding: '0 32px 28px 32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '24px',
          position: 'relative'
        }}
      >
        {/* AVATAR */}
        <div
          style={{
            marginTop: '-65px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}
        >
          <div
            style={{
              width: '128px',
              height: '128px',
              borderRadius: '28px',
              background: '#16161D',
              padding: '4px',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              border: '2px solid rgba(130, 87, 229, 0.6)'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '24px',
                background: '#181822',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#8257E5" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                right: '-8px',
                background: 'linear-gradient(135deg, #8257E5, #4e19b8)',
                border: '2px solid #101015',
                color: '#FFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '9999px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                letterSpacing: '0.5px'
              }}
            >
              LVL {profile.level}
            </div>
          </div>
        </div>

        {/* DETAILS */}
        <div style={{ flex: 1, minWidth: '280px', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.5px', margin: 0 }}>
              {profile.name}
            </h1>
            <span
              style={{
                background: 'rgba(130, 87, 229, 0.18)',
                border: '1px solid #8257E5',
                color: '#996DFF',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.5px'
              }}
            >
              GRANDMASTER ARCHITECT
            </span>
            <span
              style={{
                background: 'rgba(255, 161, 22, 0.15)',
                border: '1px solid rgba(255, 161, 22, 0.4)',
                color: '#FFA116',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFA116">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              {profile.streakDays} Dias Seguidos
            </span>
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#A1A1AA',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <span>{profile.role}</span>
            <span style={{ color: '#262630' }}>/</span>
            <span>{profile.specialty}</span>
            <span style={{ color: '#262630' }}>/</span>
            <span style={{ color: '#04D361', fontWeight: 600 }}>Global Rank #{profile.globalRank}</span>
          </div>

          <p style={{ fontSize: '14px', color: '#D4D4D8', maxWidth: '680px', lineHeight: 1.6, marginBottom: '14px' }}>
            {profile.bio}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#A1A1AA',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid #262630'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              {profile.handle}
            </a>

            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#A1A1AA',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid #262630'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              LinkedIn
            </a>

            <a
              href={profile.twitterUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#A1A1AA',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid #262630'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
              </svg>
              Twitter/X
            </a>

            <span
              style={{
                color: '#996DFF',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {profile.location}
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '6px' }}>
          <button
            onClick={onEdit}
            style={{
              background: '#16161D',
              border: '1px solid #262630',
              color: '#F4F4F5',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Editar Perfil
          </button>

          <button
            onClick={onShare}
            style={{
              background: 'linear-gradient(135deg, #8257E5, #632cd6)',
              border: 'none',
              color: '#FFF',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(130, 87, 229, 0.35)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Copiar Link
          </button>
        </div>
      </div>

      {/* STRIP STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1px',
          background: '#262630',
          borderTop: '1px solid #262630'
        }}
      >
        <div style={{ background: '#101015', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(130, 87, 229, 0.15)',
              color: '#996DFF',
              border: '1px solid rgba(130, 87, 229, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>{profile.totalContributions.toLocaleString('pt-BR')}</div>
            <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Contribuições (Ano)</div>
          </div>
        </div>

        <div style={{ background: '#101015', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(0, 229, 255, 0.15)',
              color: '#00E5FF',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>{profile.currentXp.toLocaleString('pt-BR')} XP</div>
            <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Experiência Total</div>
          </div>
        </div>

        <div style={{ background: '#101015', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(4, 211, 97, 0.15)',
              color: '#04D361',
              border: '1px solid rgba(4, 211, 97, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>{profile.completedChallenges}</div>
            <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Desafios Concluídos</div>
          </div>
        </div>

        <div style={{ background: '#101015', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255, 161, 22, 0.15)',
              color: '#FFA116',
              border: '1px solid rgba(255, 161, 22, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>{profile.verifiedCertificatesCount} Certificados</div>
            <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Verificados SHA-256</div>
          </div>
        </div>
      </div>
    </section>
  );
}
