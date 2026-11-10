'use client';

import React from 'react';
import Link from 'next/link';
import { TrackProgress, ActivityTimelineItem } from '../types';
import { ActivityHeatmap } from './ActivityHeatmap';

interface OverviewTabProps {
  tracks: TrackProgress[];
  activities: ActivityTimelineItem[];
  onDayClick: (day: { formattedDate: string; count: number }) => void;
}

export function OverviewTab({ tracks, activities, onDayClick }: OverviewTabProps) {
  return (
    <div>
      {/* 365-DAY HEATMAP */}
      <ActivityHeatmap onDayClick={onDayClick} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px'
        }}
      >
        {/* TRILHAS EM ANDAMENTO */}
        <div
          style={{
            background: '#101015',
            border: '1px solid #262630',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8257E5" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Trilhas de Especialização em Andamento
            </h3>
            <Link
              href="/courses"
              style={{
                background: '#16161D',
                border: '1px solid #262630',
                color: '#EDEDED',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Ver Todas
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                style={{
                  background: '#16161D',
                  border: '1px solid #262630',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#1F1F28',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}
                  >
                    {track.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', margin: '0 0 2px 0' }}>
                      {track.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>{track.moduleInfo}</p>
                  </div>
                </div>

                <div style={{ width: '130px', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#04D361', marginBottom: '4px' }}>
                    {track.progressPercent}% Concluído
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '9999px',
                        width: `${track.progressPercent}%`,
                        background: `linear-gradient(90deg, ${track.color}, #00E5FF)`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FEED DE ATIVIDADES RECENTES */}
        <div
          style={{
            background: '#101015',
            border: '1px solid #262630',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              Feed de Atividades Recentes
            </h3>
          </div>

          <div
            style={{
              position: 'relative',
              paddingLeft: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* LINHA VERTICAL */}
            <div
              style={{
                position: 'absolute',
                left: '7px',
                top: '6px',
                bottom: '6px',
                width: '2px',
                background: '#262630'
              }}
            />

            {activities.map((item) => {
              const dotColor =
                item.type === 'challenge'
                  ? '#8257E5'
                  : item.type === 'pr'
                  ? '#00E5FF'
                  : item.type === 'badge'
                  ? '#FFA116'
                  : '#04D361';

              return (
                <div key={item.id} style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#101015',
                      border: `2px solid ${dotColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
                  </div>

                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', margin: '0 0 2px 0' }}>
                      {item.title}
                    </h5>
                    <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>{item.desc}</p>
                    <span style={{ fontSize: '11px', color: '#71717A', marginTop: '2px', display: 'inline-block' }}>
                      {item.timeAgo} {item.xpBonus ? `• +${item.xpBonus} XP` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
