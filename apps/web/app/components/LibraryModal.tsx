'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LibraryActivity } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onCopied: () => void;
}

export default function LibraryModal({ isOpen, onClose, courseId, onCopied }: LibraryModalProps) {
  const [concepts, setConcepts] = useState<string[]>([]);
  const [activities, setActivities] = useState<LibraryActivity[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setCopyError(null);
    setCopiedId(null);
    try {
      const [conceptsRes, libraryRes] = await Promise.all([
        fetch(`${API_BASE}/activities/concepts`, { credentials: 'include' }),
        fetch(`${API_BASE}/activities/library`, { credentials: 'include' }),
      ]);
      if (conceptsRes.ok) {
        const data = await conceptsRes.json();
        setConcepts(Array.isArray(data) ? data : []);
      }
      if (libraryRes.ok) {
        const data = await libraryRes.json();
        setActivities(Array.isArray(data) ? data : []);
      } else if (!conceptsRes.ok) {
        setLoadError('Não foi possível carregar a biblioteca de problemas.');
      } else {
        setLoadError('Não foi possível carregar a biblioteca de problemas.');
      }
    } catch {
      setLoadError('Não foi possível carregar a biblioteca de problemas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedTag(null);
      loadLibrary();
    }
  }, [isOpen, loadLibrary]);

  const handleCopy = async (activityId: string) => {
    setCopyingId(activityId);
    setCopyError(null);
    setCopiedId(null);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/activities/${activityId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      if (res.ok) {
        setCopiedId(activityId);
        onCopied();
      } else {
        const err = await res.json().catch(() => null);
        setCopyError(err?.message || 'Não foi possível copiar esta atividade.');
      }
    } catch {
      setCopyError('Não foi possível copiar esta atividade.');
    } finally {
      setCopyingId(null);
    }
  };

  if (!isOpen) return null;

  const filtered = selectedTag
    ? activities.filter((a) => a.conceptTags.includes(selectedTag))
    : activities;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de Problemas"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div style={{ background: '#131c2e', border: '1px solid #334155', borderRadius: 12, padding: 24, width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>📚 Biblioteca de Problemas</h2>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        {concepts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <button
              onClick={() => setSelectedTag(null)}
              style={{
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${selectedTag === null ? '#38bdf8' : '#334155'}`,
                background: selectedTag === null ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: selectedTag === null ? '#38bdf8' : '#94a3b8',
              }}
            >
              Todos
            </button>
            {concepts.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${selectedTag === tag ? '#a855f7' : '#334155'}`,
                  background: selectedTag === tag ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: selectedTag === tag ? '#c084fc' : '#94a3b8',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {copyError && (
          <div style={{ marginBottom: 12, padding: 10, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: 6, fontSize: 12, color: '#f87171' }}>
            {copyError}
          </div>
        )}

        {isLoading ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Carregando biblioteca...</div>
        ) : loadError ? (
          <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{loadError}</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Nenhum problema encontrado para este conceito.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((activity) => (
              <div key={activity.id} style={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{activity.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: '#0284c7', borderRadius: 4, color: '#fff', fontWeight: 700 }}>
                      {activity.language.toUpperCase()}
                    </span>
                    {activity.conceptTags.map((tag) => (
                      <span key={tag} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', borderRadius: 8, color: '#c084fc' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {activity.description}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(activity.id)}
                  disabled={copyingId === activity.id}
                  style={{
                    padding: '6px 12px',
                    background: copiedId === activity.id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    border: `1px solid ${copiedId === activity.id ? '#22c55e' : '#38bdf8'}`,
                    borderRadius: 6,
                    color: copiedId === activity.id ? '#4ade80' : '#38bdf8',
                    cursor: copyingId === activity.id ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedId === activity.id ? '✓ Copiada!' : copyingId === activity.id ? 'Copiando...' : 'Copiar para o curso'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
