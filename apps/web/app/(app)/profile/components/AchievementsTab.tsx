'use client';

import React, { useState } from 'react';
import { BadgeItem } from '../types';

interface AchievementsTabProps {
  badges: BadgeItem[];
}

export function AchievementsTab({ badges }: AchievementsTabProps) {
  const [tierFilter, setTierFilter] = useState<'all' | 'legendary' | 'epic' | 'rare'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const filteredBadges = badges.filter((b) => {
    const matchesTier = tierFilter === 'all' || b.tier === tierFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'unlocked' && b.isUnlocked) ||
      (statusFilter === 'locked' && !b.isUnlocked);
    return matchesTier && matchesStatus;
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div>
      {/* HEADER DA ABA DE CONQUISTAS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                background: 'rgba(255, 161, 22, 0.15)',
                border: '1px solid #FFA116',
                color: '#FFA116',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}
            >
              GAMIFICAÇÃO DE ELITE
            </span>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>
              • {unlockedCount} de {badges.length} Desbloqueadas ({Math.round((unlockedCount / badges.length) * 100)}%)
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.3px' }}>
            Insígnias &amp; Conquistas Gamificadas
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Cada badge representa um marco de dedicação, superação de desafios Hard e consistência na plataforma.
          </p>
        </div>

        {/* FILTROS DE RARIDADE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'legendary', 'epic', 'rare'] as const).map((tier) => {
            const isActive = tierFilter === tier;
            const label =
              tier === 'all'
                ? 'Todas as Raridades'
                : tier === 'legendary'
                ? '👑 Lendárias'
                : tier === 'epic'
                ? '⚡ Épicas'
                : '🛡️ Raras';

            return (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                style={{
                  background: isActive ? 'rgba(130, 87, 229, 0.2)' : '#16161D',
                  border: `1px solid ${isActive ? '#8257E5' : '#262630'}`,
                  color: isActive ? '#FFF' : '#A1A1AA',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID DE BADGES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {filteredBadges.map((badge) => {
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
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                opacity: badge.isUnlocked ? 1 : 0.55,
                filter: badge.isUnlocked ? 'none' : 'grayscale(0.85)',
                transition: 'transform 0.2s, border-color 0.2s',
                boxShadow: badge.isUnlocked ? '0 4px 16px rgba(0,0,0,0.5)' : 'none'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
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
                      ? '0 0 18px rgba(255, 161, 22, 0.35)'
                      : '0 0 18px rgba(130, 87, 229, 0.35)'
                    : 'none'
                }}
              >
                {badge.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: '0 0 2px 0' }}>
                    {badge.name}
                  </h4>
                  {badge.isUnlocked && (
                    <span style={{ fontSize: '12px', color: '#04D361' }} title="Desbloqueada">
                      ✓
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4, margin: '2px 0 6px 0' }}>
                  {badge.description}
                </p>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    color: badge.isUnlocked
                      ? isLegendary
                        ? '#FFA116'
                        : isEpic
                        ? '#A379FF'
                        : '#00E5FF'
                      : '#71717A'
                  }}
                >
                  {badge.isUnlocked
                    ? isLegendary
                      ? '★ Tier Lendário'
                      : isEpic
                      ? '⚡ Tier Épico'
                      : '🛡️ Tier Raro'
                    : `🔒 Em Progresso (${badge.progressText})`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
