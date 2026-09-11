'use client';

import React, { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface StudentRow {
  userId: string;
  name: string;
  email: string;
  enrolledAt: string;
}

interface ActivityReport {
  activityId: string;
  title: string;
  status: string;
  attempts: number;
  bestScore: number | null;
  lastAttemptAt: string | null;
}

interface StudentReport {
  student: { id: string; name: string; email: string };
  courseTitle: string;
  submissionsTotal: number;
  passedTotal: number;
  avgScore: number;
  totalDurationMs: number;
  activities: ActivityReport[];
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string; background: string }> = {
  passed: { label: 'Aprovada', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)' },
  failed: { label: 'Reprovada', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)' },
  error: { label: 'Erro', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)' },
  none: { label: 'Não iniciada', color: '#64748b', background: '#0b1120' },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}min ${seconds % 60}s`;
}

export default function ReportModal({ isOpen, onClose, courseId }: ReportModalProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/students`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStudents(
          (Array.isArray(data) ? data : []).map((e: any) => ({
            userId: e.user?.id ?? e.userId,
            name: e.user?.name ?? '—',
            email: e.user?.email ?? '—',
            enrolledAt: e.createdAt,
          })),
        );
      } else {
        setLoadError('Não foi possível carregar a lista de alunos.');
      }
    } catch {
      setLoadError('Não foi possível carregar a lista de alunos.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [courseId]);

  const openReport = async (studentId: string) => {
    setIsLoadingReport(true);
    setReportError(null);
    setReport(null);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/students/${studentId}/report`, {
        credentials: 'include',
      });
      if (res.ok) {
        setReport(await res.json());
      } else {
        setReportError('Não foi possível carregar o relatório deste aluno.');
      }
    } catch {
      setReportError('Não foi possível carregar o relatório deste aluno.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setReport(null);
      setReportError(null);
      loadStudents();
    }
  }, [isOpen, loadStudents]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Relatórios Pedagógicos"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 640, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
            {report ? `📊 Relatório — ${report.student.name}` : '📊 Relatórios do Curso'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {report ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button
              onClick={() => setReport(null)}
              style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              ← Voltar para a lista de alunos
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>{report.submissionsTotal}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Submissões</div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{report.passedTotal}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Aprovadas</div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>{report.avgScore}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Nota média</div>
              </div>
              <div style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{formatDuration(report.totalDurationMs)}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Tempo total</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#64748b' }}>
              {report.student.email} • {report.courseTitle}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {report.activities.map((act) => {
                const style = STATUS_STYLES[act.status] ?? STATUS_STYLES.none;
                return (
                  <div key={act.activityId} style={{ background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {act.attempts} tentativa(s){act.bestScore !== null ? ` • melhor nota: ${act.bestScore}` : ''}
                        {act.lastAttemptAt ? ` • última: ${new Date(act.lastAttemptAt).toLocaleString('pt-BR')}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, color: style.color, background: style.background, whiteSpace: 'nowrap' }}>
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isLoadingStudents ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Carregando alunos...</div>
        ) : loadError ? (
          <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{loadError}</div>
        ) : students.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nenhum aluno matriculado neste curso.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isLoadingReport && (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>Carregando relatório...</div>
            )}
            {reportError && (
              <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{reportError}</div>
            )}
            {students.map((student) => (
              <div key={student.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#131c2e', border: '1px solid #1e293b', borderRadius: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.email}</div>
                </div>
                <button
                  onClick={() => openReport(student.userId)}
                  disabled={isLoadingReport}
                  style={{ padding: '6px 12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: 6, color: '#38bdf8', cursor: isLoadingReport ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Ver Relatório
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
