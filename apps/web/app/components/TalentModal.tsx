'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Company } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TalentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
}

export default function TalentModal({ isOpen, onClose, courseId }: TalentModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<{ name: string; token: string } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/talent/companies`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      } else {
        setLoadError('Não foi possível carregar as empresas.');
      }
    } catch {
      setLoadError('Não foi possível carregar as empresas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCreatedToken(null);
      setActionError(null);
      loadCompanies();
    }
  }, [isOpen, loadCompanies]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCompanyName.trim();
    if (!name) return;
    setIsCreating(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/talent/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedToken({ name: data.name, token: data.token });
        setTokenCopied(false);
        setNewCompanyName('');
        await loadCompanies();
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.message || 'Não foi possível criar a empresa.');
      }
    } catch (err: any) {
      setActionError('Erro ao criar empresa: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!window.confirm('Excluir esta empresa? O token dela deixará de funcionar imediatamente.')) {
      return;
    }
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/talent/companies/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok || res.status === 204) {
        await loadCompanies();
      } else {
        const err = await res.json().catch(() => null);
        setActionError(err?.message || 'Não foi possível excluir a empresa.');
      }
    } catch (err: any) {
      setActionError('Erro ao excluir empresa: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyToken = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken.token);
      setTokenCopied(true);
    } catch {
      setActionError('Não foi possível copiar o token. Selecione e copie manualmente.');
    }
  };

  const handleCopyLeaderboardUrl = async () => {
    if (!courseId) return;
    const url = `${window.location.origin}/leaderboard/${courseId}`;
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    } catch {
      setActionError('Não foi possível copiar a URL.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Portal de Talentos"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div style={{ background: '#131c2e', border: '1px solid #334155', borderRadius: 12, padding: 24, width: '100%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>🏢 Portal de Talentos</h2>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        {createdToken && (
          <div style={{ marginBottom: 16, padding: 14, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 6 }}>
              Token de {createdToken.name} criado
            </div>
            <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>
              ⚠️ Copie agora, não será exibido novamente.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#e2e8f0', background: '#090d16', padding: '8px 10px', borderRadius: 6, wordBreak: 'break-all' }}>
                {createdToken.token}
              </code>
              <button
                onClick={handleCopyToken}
                style={{ padding: '8px 12px', background: tokenCopied ? 'rgba(34, 197, 94, 0.15)' : '#22c55e', border: `1px solid ${tokenCopied ? '#22c55e' : 'transparent'}`, borderRadius: 6, color: tokenCopied ? '#4ade80' : '#090d16', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {tokenCopied ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateCompany} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="Nome da empresa parceira"
            style={{ flex: 1, padding: '8px 10px', background: '#0b1120', border: '1px solid #334155', borderRadius: 6, color: '#fff', fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={isCreating || !newCompanyName.trim()}
            style={{ padding: '8px 14px', background: isCreating || !newCompanyName.trim() ? '#334155' : '#38bdf8', color: isCreating || !newCompanyName.trim() ? '#94a3b8' : '#090d16', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: isCreating || !newCompanyName.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
          >
            {isCreating ? 'Criando...' : '+ Criar Empresa'}
          </button>
        </form>

        {courseId && (
          <button
            onClick={handleCopyLeaderboardUrl}
            style={{ width: '100%', marginBottom: 16, padding: '8px 12px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid #38bdf8', borderRadius: 6, color: '#38bdf8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            {urlCopied ? '✓ URL copiada!' : '🔗 Copiar URL do leaderboard'}
          </button>
        )}

        {actionError && (
          <div style={{ marginBottom: 12, padding: 10, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: 6, fontSize: 12, color: '#f87171' }}>
            {actionError}
          </div>
        )}

        {isLoading ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Carregando empresas...</div>
        ) : loadError ? (
          <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{loadError}</div>
        ) : companies.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Nenhuma empresa cadastrada ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {companies.map((company) => (
              <div key={company.id} style={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{company.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Criada em {company.createdAt ? new Date(company.createdAt).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  disabled={deletingId === company.id}
                  style={{ padding: '5px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: 6, color: '#f87171', fontWeight: 700, fontSize: 11, cursor: deletingId === company.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {deletingId === company.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ margin: '16px 0 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          O leaderboard do curso é consumido externamente pelas empresas via header <code style={{ fontFamily: 'monospace', color: '#38bdf8' }}>x-company-token</code> em <code style={{ fontFamily: 'monospace', color: '#38bdf8' }}>GET /talent/courses/:courseId/leaderboard</code>. Alunos podem desativar sua visibilidade no Portal de Talentos a qualquer momento (LGPD).
        </p>
      </div>
    </div>
  );
}
