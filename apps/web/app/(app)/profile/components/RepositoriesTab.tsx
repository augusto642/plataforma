'use client';

import React, { useState, useMemo } from 'react';
import { GitRepository } from '../types';

interface RepositoriesTabProps {
  repos: GitRepository[];
}

export function RepositoriesTab({ repos }: RepositoriesTabProps) {
  const [query, setQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('all');

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos.filter((repo) => {
      const matchesQuery =
        !q ||
        repo.name.toLowerCase().includes(q) ||
        repo.description.toLowerCase().includes(q) ||
        repo.language.toLowerCase().includes(q);

      const matchesLang = selectedLang === 'all' || repo.language.toLowerCase() === selectedLang.toLowerCase();

      return matchesQuery && matchesLang;
    });
  }, [repos, query, selectedLang]);

  const languages = ['all', 'Rust', 'TypeScript', 'Go', 'Wasm'];

  return (
    <div>
      {/* FILTER BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#71717A"
            strokeWidth="2"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar repositórios..."
            style={{
              width: '100%',
              background: '#16161D',
              border: '1px solid #262630',
              borderRadius: '10px',
              padding: '9px 12px 9px 38px',
              fontSize: '13px',
              color: '#FFF',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {languages.map((lang) => {
            const isActive = selectedLang.toLowerCase() === lang.toLowerCase();
            return (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                style={{
                  background: isActive ? 'rgba(130, 87, 229, 0.2)' : '#16161D',
                  border: `1px solid ${isActive ? '#8257E5' : '#262630'}`,
                  color: isActive ? '#FFF' : '#A1A1AA',
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {lang === 'all' ? 'Todos' : lang === 'Wasm' ? 'WebAssembly' : lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* REPOS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        }}
      >
        {filteredRepos.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '48px',
              textAlign: 'center',
              background: '#101015',
              border: '1px dashed #262630',
              borderRadius: '16px',
              color: '#A1A1AA'
            }}
          >
            Nenhum repositório encontrado com os filtros atuais.
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <div
              key={repo.id}
              style={{
                background: '#101015',
                border: '1px solid #262630',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, border-color 0.2s'
              }}
            >
              <div style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}
                >
                  <a
                    href={repo.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#00E5FF',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {repo.name}
                  </a>

                  {repo.isPinned && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#FFA116',
                        background: 'rgba(255, 161, 22, 0.12)',
                        border: '1px solid rgba(255, 161, 22, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 600
                      }}
                    >
                      ★ Fixado
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.5, margin: 0 }}>{repo.description}</p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '14px',
                  fontSize: '12px',
                  color: '#71717A'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#A1A1AA' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: repo.langColor,
                      display: 'inline-block'
                    }}
                  />
                  {repo.language === 'Wasm' ? 'WebAssembly' : repo.language}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFA116">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {repo.stars}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="18" r="3" />
                      <circle cx="6" cy="6" r="3" />
                      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                      <line x1="6" y1="9" x2="6" y2="21" />
                    </svg>
                    {repo.forks}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
