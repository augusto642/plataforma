'use client';

import React from 'react';

export type TrackId = 'web3' | 'backend' | 'frontend' | 'ai';

export interface TrackItem {
  id: TrackId;
  name: string;
  icon: string;
  tag: string;
  tagStyle: { bg: string; color: string; border: string };
  description: string;
  stack: string[];
  challenges: number;
  labs: number;
}

export const TRACKS: TrackItem[] = [
  {
    id: 'web3',
    name: 'Fullstack Web3 & Solana/EVM',
    icon: '⚡',
    tag: '🔥 Alta Demanda',
    tagStyle: { bg: 'rgba(244, 63, 94, 0.15)', color: '#FDA4AF', border: 'rgba(244, 63, 94, 0.3)' },
    description: 'Smart contracts em Rust & Solidity, dApps descentralizados com Next.js 15, Anchor, Web3.js e DeFi protocols.',
    stack: ['Rust', 'Anchor', 'Solidity', 'Next.js', 'Wasm'],
    challenges: 142,
    labs: 48,
  },
  {
    id: 'backend',
    name: 'High-Performance Backend & Rust/Go',
    icon: '🦀',
    tag: '⚡ Zero Overhead',
    tagStyle: { bg: 'rgba(0, 229, 255, 0.15)', color: '#67E8F9', border: 'rgba(0, 229, 255, 0.3)' },
    description: 'Sistemas distribuídos ultrarrápidos, concorrência massiva, gRPC, Kafka, Docker e arquiteturas cloud-native resilientes.',
    stack: ['Rust', 'Go', 'gRPC', 'Postgres', 'Kafka'],
    challenges: 125,
    labs: 42,
  },
  {
    id: 'frontend',
    name: 'Frontend Architecture & React 19',
    icon: '🚀',
    tag: '💎 Ultra Speed',
    tagStyle: { bg: 'rgba(130, 87, 229, 0.15)', color: '#C4B5FD', border: 'rgba(130, 87, 229, 0.3)' },
    description: 'Micro-frontends, Server Components, SSR/SSG com Next.js 15, TailwindCSS, Monaco Editor e web apps ultra performáticos.',
    stack: ['React 19', 'Next.js 15', 'TypeScript', 'Tailwind'],
    challenges: 110,
    labs: 36,
  },
  {
    id: 'ai',
    name: 'AI Agents, Cloud & MLOps',
    icon: '🤖',
    tag: '🧠 IA Generativa',
    tagStyle: { bg: 'rgba(4, 211, 97, 0.15)', color: '#6EE7B7', border: 'rgba(4, 211, 97, 0.3)' },
    description: 'Construção de Agentes Autônomos com LangChain & LlamaIndex, RAG vetorial com pgvector, pipelines de inferência e Kubernetes.',
    stack: ['Python', 'LangChain', 'PgVector', 'K8s'],
    challenges: 95,
    labs: 30,
  },
];

interface StepTracksProps {
  selectedTrack: TrackId;
  onSelectTrack: (trackId: TrackId) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const StepTracks: React.FC<StepTracksProps> = ({
  selectedTrack,
  onSelectTrack,
  onPrev,
  onNext,
}) => {
  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(0, 229, 255, 0.15)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            color: '#67E8F9',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}
        >
          🎯 Especialização
        </div>
        <h2
          style={{
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: '#FFF',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          Escolha sua Trilha Principal
        </h2>
        <p style={{ color: '#9499AD', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
          Selecione a área em que você deseja focar. Você poderá acessar todas as outras trilhas livremente a qualquer momento.
        </p>
      </div>

      {/* Grid of 4 Tracks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {TRACKS.map((track) => {
          const isSelected = selectedTrack === track.id;

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              style={{
                background: isSelected ? 'rgba(130, 87, 229, 0.08)' : '#151821',
                border: `1px solid ${isSelected ? '#8257E5' : '#232738'}`,
                borderRadius: '18px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflow: 'hidden',
                boxShadow: isSelected ? '0 0 24px rgba(130, 87, 229, 0.25)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.background = '#181B26';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#232738';
                  e.currentTarget.style.background = '#151821';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {/* Checkmark indicator */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#8257E5',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    boxShadow: '0 0 10px rgba(130, 87, 229, 0.6)',
                  }}
                >
                  ✓
                </div>
              )}

              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(130, 87, 229, 0.3) 0%, rgba(4, 211, 97, 0.2) 100%)'
                      : '#1B1E2B',
                    border: `1px solid ${isSelected ? '#8257E5' : 'rgba(255, 255, 255, 0.08)'}`,
                    transition: 'all 0.25s',
                  }}
                >
                  {track.icon}
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: track.tagStyle.bg,
                    color: track.tagStyle.color,
                    border: `1px solid ${track.tagStyle.border}`,
                  }}
                >
                  {track.tag}
                </span>
              </div>

              {/* Title & Description */}
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', lineHeight: 1.3 }}>
                {track.name}
              </div>
              <div style={{ fontSize: '12px', color: '#9499AD', lineHeight: 1.4, flex: 1 }}>
                {track.description}
              </div>

              {/* Stack Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {track.stack.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: isSelected ? 'rgba(130, 87, 229, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isSelected ? 'rgba(130, 87, 229, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: isSelected ? '#E1E1E6' : '#9499AD',
                      fontFamily: '"Fira Code", monospace',
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* Footer Stats */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '10px',
                  fontSize: '11px',
                  color: '#64687A',
                }}
              >
                <span>📚 {track.challenges} Desafios Práticos</span>
                <span>⚡ {track.labs} Labs Sandbox</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '13px 20px',
            background: '#151821',
            border: '1px solid #232738',
            borderRadius: '12px',
            color: '#9499AD',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.25s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1B1E2B';
            e.currentTarget.style.color = '#FFF';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#151821';
            e.currentTarget.style.color = '#9499AD';
            e.currentTarget.style.borderColor = '#232738';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>

        <button
          type="button"
          onClick={onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '13px 28px',
            background: 'linear-gradient(90deg, #8257E5 0%, #996DFF 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFF',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 24px -4px rgba(130, 87, 229, 0.4)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 12px 30px -4px rgba(130, 87, 229, 0.65)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(130, 87, 229, 0.4)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Personalizar Metas & Nível
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};
