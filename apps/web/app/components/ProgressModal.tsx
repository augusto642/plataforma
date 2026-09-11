'use client';

import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UserBadge {
  id: string;
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  slug: string;
  totalActivities: number;
  completedActivities: number;
  progressPercent: number;
}

interface UserProgress {
  xp?: number;
  level?: number;
  streakDays?: number;
  badges?: UserBadge[];
  completedActivitiesCount: number;
  totalSubmissionsCount: number;
  averageScore: number;
  coursesProgress: CourseProgress[];
}

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress | null;
  token: string | null;
}

export default function ProgressModal({ isOpen, onClose, progress, token }: ProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Meu Desempenho e Progresso"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>📊 Meu Progresso</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {progress ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8' }}>{progress.xp || 0}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>XP Total</div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#a855f7' }}>{progress.level || 1}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Nível</div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{progress.streakDays || 0}🔥</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Dias Seguidos</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{progress.completedActivitiesCount}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Atividades Concluídas</div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>{progress.averageScore}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Média de Nota</div>
              </div>
            </div>

            {progress.badges && progress.badges.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px 0', color: '#f8fafc' }}>🏆 Conquistas</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {progress.badges.map((badge) => (
                    <div key={badge.id} style={{ background: '#1e1b4b', border: '1px solid #818cf8', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{badge.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c7d2fe' }}>{badge.title}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{badge.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px 0', color: '#f8fafc' }}>Progresso por Curso</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {progress.coursesProgress.map((cp) => (
                  <div key={cp.courseId} style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>{cp.courseTitle}</span>
                      <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>{cp.progressPercent}%</span>
                    </div>
                    <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cp.progressPercent}%`, background: 'linear-gradient(to right, #0284c7, #38bdf8)', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      {cp.completedActivities} de {cp.totalActivities} atividades
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Carregando progresso...
          </div>
        )}
      </div>
    </div>
  );
}
