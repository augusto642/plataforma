'use client';

import React from 'react';
import { SkillAxis } from '../types';

interface SkillRadarTabProps {
  skills: SkillAxis[];
  onSkillScoreChange: (index: number, newScore: number) => void;
}

export function SkillRadarTab({ skills, onSkillScoreChange }: SkillRadarTabProps) {
  // Constantes geométricas para o Radar Hexagonal 6D
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 150;

  const angles = [
    -Math.PI / 2, // Top: 0 (Backend)
    -Math.PI / 6, // Top-Right: 1 (AI & Swarms)
    Math.PI / 6, // Bottom-Right: 2 (Distributed Arch)
    Math.PI / 2, // Bottom: 3 (DevOps)
    (5 * Math.PI) / 6, // Bottom-Left: 4 (Algorithms)
    (-5 * Math.PI) / 6 // Top-Left: 5 (Frontend Eng)
  ];

  // Calcular pontos do polígono dinâmico
  const polygonPoints = skills
    .map((skill, idx) => {
      const radius = (skill.score / 100) * maxRadius;
      const x = centerX + radius * Math.cos(angles[idx]);
      const y = centerY + radius * Math.sin(angles[idx]);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // Calcular média geral
  const averageScore = (skills.reduce((acc, curr) => acc + curr.score, 0) / skills.length).toFixed(1);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '28px'
      }}
    >
      {/* RADAR SVG CARD */}
      <div
        style={{
          background: '#101015',
          border: '1px solid #262630',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
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
              <polygon points="12 2 2 8.5 2 15.5 12 22 22 15.5 22 8.5 12 2" />
            </svg>
            Radar Hexagonal 6D em SVG Dinâmico
          </h3>
          <span style={{ fontSize: '12px', color: '#00E5FF', fontWeight: 700 }}>
            Média: {averageScore} / 100
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: '440px', aspectRatio: '1 / 1', position: 'relative' }}>
          <svg
            viewBox="0 0 400 400"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <radialGradient id="radarFillGradNext" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8257E5" stopOpacity="0.65" />
                <stop offset="60%" stopColor="#00E5FF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#04D361" stopOpacity="0.15" />
              </radialGradient>
              <filter id="glowFilterNext" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Anéis Hexagonais Concêntricos (100%, 80%, 60%, 40%, 20%) */}
            {[1.0, 0.8, 0.6, 0.4, 0.2].map((scale, i) => {
              const r = maxRadius * scale;
              const points = angles
                .map((a) => {
                  const x = centerX + r * Math.cos(a);
                  const y = centerY + r * Math.sin(a);
                  return `${x.toFixed(2)},${y.toFixed(2)}`;
                })
                .join(' ');

              return (
                <polygon
                  key={i}
                  points={points}
                  fill="none"
                  stroke={i === 0 ? '#262630' : '#1a1a24'}
                  strokeWidth={i === 0 ? 1.5 : 1}
                  strokeDasharray={i === 0 ? '4,4' : undefined}
                />
              );
            })}

            {/* Linhas Radiantes dos 6 Eixos */}
            {angles.map((a, i) => {
              const x2 = centerX + maxRadius * Math.cos(a);
              const y2 = centerY + maxRadius * Math.sin(a);
              return (
                <line
                  key={i}
                  x1={centerX}
                  y1={centerY}
                  x2={x2}
                  y2={y2}
                  stroke="#262630"
                  strokeWidth="1.2"
                />
              );
            })}

            {/* Polígono de Habilidade Dinâmico */}
            <polygon
              points={polygonPoints}
              fill="url(#radarFillGradNext)"
              stroke="#8257E5"
              strokeWidth="2.5"
              filter="url(#glowFilterNext)"
            />

            {/* Pontos nos Vértices */}
            {skills.map((skill, idx) => {
              const radius = (skill.score / 100) * maxRadius;
              const cx = centerX + radius * Math.cos(angles[idx]);
              const cy = centerY + radius * Math.sin(angles[idx]);
              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill={skill.color}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Rótulos dos Eixos */}
            <text x="200" y="30" textAnchor="middle" fill="#EDEDED" fontSize="11" fontWeight="700">
              Backend ({skills[0].score})
            </text>
            <text x="340" y="125" textAnchor="start" fill="#00E5FF" fontSize="11" fontWeight="700">
              AI Agents ({skills[1].score})
            </text>
            <text x="340" y="280" textAnchor="start" fill="#04D361" fontSize="11" fontWeight="700">
              Distributed ({skills[2].score})
            </text>
            <text x="200" y="380" textAnchor="middle" fill="#FFA116" fontSize="11" fontWeight="700">
              DevOps ({skills[3].score})
            </text>
            <text x="55" y="280" textAnchor="end" fill="#F43F5E" fontSize="11" fontWeight="700">
              Algorithms ({skills[4].score})
            </text>
            <text x="55" y="125" textAnchor="end" fill="#3B82F6" fontSize="11" fontWeight="700">
              Frontend ({skills[5].score})
            </text>
          </svg>
        </div>
      </div>

      {/* CONTROLS CARD */}
      <div
        style={{
          background: '#101015',
          border: '1px solid #262630',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', margin: '0 0 4px 0' }}>
            Ajuste & Calibração de Proficiência
          </h3>
          <p style={{ fontSize: '12px', color: '#A1A1AA', margin: 0 }}>
            Sliders interativos em tempo real para simular avaliação de competências técnicas.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {skills.map((skill, index) => (
            <div key={index}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px'
                }}
              >
                <span style={{ color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: skill.color }}>■</span> {index + 1}. {skill.label}
                </span>
                <span style={{ fontFamily: 'monospace', color: '#996DFF', fontWeight: 700 }}>
                  {skill.score}%
                </span>
              </div>

              <input
                type="range"
                min="30"
                max="100"
                value={skill.score}
                onChange={(e) => onSkillScoreChange(index, parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  accentColor: skill.color,
                  cursor: 'pointer',
                  height: '6px',
                  background: '#1F1F28',
                  borderRadius: '9999px',
                  outline: 'none'
                }}
              />

              <p style={{ fontSize: '11px', color: '#71717A', marginTop: '4px', margin: 0 }}>
                {skill.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
