'use client';

import React from 'react';
import { LeaderboardEntry } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  isLoading: boolean;
  courseId: string | null;
  token: string | null;
  currentUserId?: string;
}

export default function LeaderboardModal({ isOpen, onClose, entries, isLoading, courseId, token, currentUserId }: LeaderboardModalProps) {
  if (!isOpen) return null;

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ranking do Curso"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>🏆 Ranking</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {isLoading ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Carregando ranking...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Nenhum ranking disponível ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((entry) => {
              const isCurrent = entry.userId === currentUserId;
              return (
                <div
                  key={entry.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : '#131c2e',
                    border: isCurrent ? '1px solid #38bdf8' : '1px solid #1e293b',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 20, width: 36, textAlign: 'center' }}>
                    {getRankEmoji(entry.rank)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? '#38bdf8' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.name} {isCurrent && '(Você)'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Nível {entry.level} • {entry.completedActivitiesCount} atividades • 🔥 {entry.streakDays}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{entry.xp}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>XP</div>
                  </div>
                  {(entry.badges || []).length > 0 && (
                    <div style={{ fontSize: 14 }} title={entry.badges.map(b => b.title).join(', ')}>
                      {entry.badges[0].icon}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
