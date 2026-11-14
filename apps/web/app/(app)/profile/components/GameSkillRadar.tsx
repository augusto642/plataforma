'use client';

import React, { useState } from 'react';
import { SkillAxis, DeveloperPerk } from '../types';
import { HARD_SKILLS_RADAR, SOFT_SKILLS_RADAR, DEVELOPER_PERKS } from '../data';

interface GameSkillRadarProps {
  onSkillSelect?: (skill: SkillAxis) => void;
  compact?: boolean;
}

export function GameSkillRadar({ onSkillSelect, compact = false }: GameSkillRadarProps) {
  const [skillCategory, setSkillCategory] = useState<'hard' | 'soft'>('hard');
  const [activeSkillIndex, setActiveSkillIndex] = useState<number | null>(0);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(true);

  const currentSkills = skillCategory === 'hard' ? HARD_SKILLS_RADAR : SOFT_SKILLS_RADAR;
  const activeSkill = activeSkillIndex !== null ? currentSkills[activeSkillIndex] : currentSkills[0];

  // Geometria Cartesiana para Hexágono Regular 6D
  const cx = 200;
  const cy = 200;
  const rMax = 140;

  // 6 ângulos espaçados em 60 graus (PI/3), começando no topo (-PI/2)
  const angles = [
    -Math.PI / 2, // Topo (0°)
    -Math.PI / 6, // Topo-Direito (60°)
    Math.PI / 6, // Fundo-Direito (120°)
    Math.PI / 2, // Base (180°)
    (5 * Math.PI) / 6, // Fundo-Esquerdo (240°)
    (-5 * Math.PI) / 6 // Topo-Esquerdo (300°)
  ];

  // Polígono do Aluno
  const studentPolygon = currentSkills
    .map((skill, i) => {
      const r = (skill.score / 100) * rMax;
      const x = cx + r * Math.cos(angles[i]);
      const y = cy + r * Math.sin(angles[i]);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // Polígono do Benchmark (Senior / FAANG)
  const benchmarkPolygon = currentSkills
    .map((skill, i) => {
      const benchmark = skill.benchmark || 82;
      const r = (benchmark / 100) * rMax;
      const x = cx + r * Math.cos(angles[i]);
      const y = cy + r * Math.sin(angles[i]);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // Média Geral
  const averageScore = Math.round(
    currentSkills.reduce((acc, curr) => acc + curr.score, 0) / currentSkills.length
  );

  return (
    <div
      style={{
        background: '#101015',
        border: '1px solid #262630',
        borderRadius: '20px',
        padding: compact ? '20px' : '28px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* GLOW DE FUNDO CIBERNÉTICO */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '320px',
          height: '320px',
          background:
            skillCategory === 'hard'
              ? 'radial-gradient(circle, rgba(130, 87, 229, 0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />

      {/* HEADER DO RADAR GAME */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          borderBottom: '1px solid #1C2133',
          paddingBottom: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: skillCategory === 'hard' ? 'rgba(130, 87, 229, 0.2)' : 'rgba(0, 229, 255, 0.2)',
                border: `1px solid ${skillCategory === 'hard' ? '#8257E5' : '#00E5FF'}`,
                color: skillCategory === 'hard' ? '#A379FF' : '#00E5FF',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              HUD TÁTICO RPG
            </span>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#FFF',
                letterSpacing: '-0.3px',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Radar de Habilidades &amp; Atributos
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            {skillCategory === 'hard'
              ? 'Hard Skills auditadas por execução em Sandbox Piston e suítes de testes unitários.'
              : 'Soft Skills mensuradas via interações socráticas com o tutor Lumi, rigor de código e consistência.'}
          </p>
        </div>

        {/* CONTROLES E TOGGLES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* TOGGLE HARD / SOFT */}
          <div
            style={{
              background: '#090A0F',
              border: '1px solid #262630',
              borderRadius: '12px',
              padding: '3px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <button
              onClick={() => {
                setSkillCategory('hard');
                setActiveSkillIndex(0);
              }}
              style={{
                background: skillCategory === 'hard' ? 'linear-gradient(135deg, #8257E5, #632cd6)' : 'transparent',
                color: skillCategory === 'hard' ? '#FFF' : '#71717A',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '9px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>⚡</span> Hard Skills
            </button>
            <button
              onClick={() => {
                setSkillCategory('soft');
                setActiveSkillIndex(0);
              }}
              style={{
                background: skillCategory === 'soft' ? 'linear-gradient(135deg, #00B4D8, #0077B6)' : 'transparent',
                color: skillCategory === 'soft' ? '#FFF' : '#71717A',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '9px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🧠</span> Soft Skills
            </button>
          </div>

          {/* TOGGLE BENCHMARK */}
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            style={{
              background: showBenchmark ? 'rgba(0, 229, 255, 0.12)' : '#16161D',
              border: `1px solid ${showBenchmark ? '#00E5FF' : '#262630'}`,
              color: showBenchmark ? '#00E5FF' : '#A1A1AA',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: showBenchmark ? '#00E5FF' : '#71717A',
                boxShadow: showBenchmark ? '0 0 6px #00E5FF' : 'none'
              }}
            />
            Benchmark FAANG
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: SVG RADAR + CARD DE AUDITORIA & TELEMETRIA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'center'
        }}
      >
        {/* RADAR SVG COM DESIGN GAME HUD */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '10px'
          }}
        >
          {/* MIRA TÁTICA / CROSSHAIR NO TOPO */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: '#00E5FF',
              opacity: 0.7,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <span>[SYS_TELEMETRY: ACTIVE]</span>
            <span>POLAR_AXES: 6D HEX</span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#04D361',
              fontWeight: 700
            }}
          >
            GLOBAL: {averageScore} / 100
          </div>

          <div style={{ width: '100%', maxWidth: '380px', aspectRatio: '1 / 1', position: 'relative' }}>
            <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                {/* GRADIENTE DE PREENCHIMENTO DO RADAR DO ALUNO */}
                <radialGradient id="gameRadarGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={skillCategory === 'hard' ? '#8257E5' : '#00E5FF'} stopOpacity="0.8" />
                  <stop offset="60%" stopColor={skillCategory === 'hard' ? '#00E5FF' : '#04D361'} stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#04D361" stopOpacity="0.15" />
                </radialGradient>

                <filter id="radarNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* ANÉIS CONCÊNTRICOS DE CALIBRAÇÃO (20%, 40%, 60%, 80%, 100%) */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, lvlIdx) => {
                const ringRadius = level * rMax;
                const ringPoints = angles
                  .map((a) => {
                    const x = cx + ringRadius * Math.cos(a);
                    const y = cy + ringRadius * Math.sin(a);
                    return `${x.toFixed(2)},${y.toFixed(2)}`;
                  })
                  .join(' ');

                return (
                  <g key={lvlIdx}>
                    <polygon
                      points={ringPoints}
                      fill="none"
                      stroke="#272736"
                      strokeWidth={lvlIdx === 4 ? '1.5' : '1'}
                      strokeDasharray={lvlIdx === 4 ? 'none' : '3 3'}
                      opacity={lvlIdx === 4 ? 0.9 : 0.6}
                    />
                    {/* LEGENDA DE PORCENTAGEM NO EIXO SUPERIOR */}
                    <text
                      x={cx + 4}
                      y={cy - ringRadius + 3}
                      fill="#52525B"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {level * 100}%
                    </text>
                  </g>
                );
              })}

              {/* 6 EIXOS POLARES (RADIAIS) */}
              {angles.map((a, i) => {
                const x2 = cx + rMax * Math.cos(a);
                const y2 = cy + rMax * Math.sin(a);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="#272736"
                    strokeWidth="1.2"
                  />
                );
              })}

              {/* POLÍGONO DE BENCHMARK FAANG (SE ATIVO) */}
              {showBenchmark && (
                <polygon
                  points={benchmarkPolygon}
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
              )}

              {/* POLÍGONO DO ESTUDANTE (COM GLOW E GRADIENTE) */}
              <polygon
                points={studentPolygon}
                fill="url(#gameRadarGrad)"
                stroke={skillCategory === 'hard' ? '#A379FF' : '#38BDF8'}
                strokeWidth="2.5"
                filter="url(#radarNeonGlow)"
              />

              {/* NÓS INTERATIVOS NOS VÉRTICES */}
              {currentSkills.map((skill, i) => {
                const r = (skill.score / 100) * rMax;
                const x = cx + r * Math.cos(angles[i]);
                const y = cy + r * Math.sin(angles[i]);
                const isSelected = activeSkillIndex === i;

                // Coordenadas para o Label do Vértice (um pouco mais afastado)
                const labelRadius = rMax + 24;
                const lx = cx + labelRadius * Math.cos(angles[i]);
                const ly = cy + labelRadius * Math.sin(angles[i]);

                return (
                  <g
                    key={i}
                    onClick={() => {
                      setActiveSkillIndex(i);
                      if (onSkillSelect) onSkillSelect(skill);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* ANEL PULSANTE NO NÓ ATIVO */}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        fill="none"
                        stroke={skill.color}
                        strokeWidth="1.5"
                        opacity={0.7}
                      >
                        <animate
                          attributeName="r"
                          values="8;14;8"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0.2;0.8"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* VÉRTICE PRINCIPAL */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? '6' : '4.5'}
                      fill={skill.color}
                      stroke="#0D0E15"
                      strokeWidth="2"
                    />

                    {/* LABEL DO EIXO */}
                    <text
                      x={lx}
                      y={ly + 4}
                      fill={isSelected ? '#FFF' : '#A1A1AA'}
                      fontSize="10"
                      fontWeight={isSelected ? '800' : '600'}
                      textAnchor={
                        Math.abs(lx - cx) < 10
                          ? 'middle'
                          : lx > cx
                          ? 'start'
                          : 'end'
                      }
                      fontFamily="sans-serif"
                    >
                      {skill.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* PAINEL DE AUDITORIA & TELEMETRIA DA HABILIDADE SELECIONADA */}
        <div
          style={{
            background: '#161620',
            border: `1px solid ${activeSkill.color}40`,
            borderRadius: '16px',
            padding: '20px',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '16px',
              fontSize: '24px',
              fontWeight: 900,
              color: activeSkill.color,
              fontFamily: 'monospace'
            }}
          >
            {activeSkill.score}
            <span style={{ fontSize: '13px', color: '#71717A' }}>/100</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: activeSkill.color,
                boxShadow: `0 0 8px ${activeSkill.color}`
              }}
            />
            <span style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', fontWeight: 700 }}>
              {skillCategory === 'hard' ? 'Hard Skill Auditada' : 'Soft Skill Mensurada'}
            </span>
          </div>

          <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', margin: '0 0 10px 0' }}>
            {activeSkill.label}
          </h4>

          <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '16px' }}>
            {activeSkill.description}
          </p>

          {/* ORIGEM E MÉTODO DE MENSURAÇÃO */}
          <div
            style={{
              background: '#0F1017',
              border: '1px solid #27273A',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>🔍</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#00E5FF', textTransform: 'uppercase' }}>
                Metodologia de Aferição Nexus
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              {activeSkill.metricOrigin}
            </p>
          </div>

          {/* BARRA DE COMPARAÇÃO COM BENCHMARK */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ color: '#94A3B8' }}>Estudante vs. Benchmark FAANG ({activeSkill.benchmark}%)</span>
              <span style={{ color: activeSkill.score >= (activeSkill.benchmark || 80) ? '#04D361' : '#FFA116', fontWeight: 700 }}>
                {activeSkill.score >= (activeSkill.benchmark || 80)
                  ? `+${activeSkill.score - (activeSkill.benchmark || 80)}% Acima da Média`
                  : 'Em Progressão'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#090A0F', borderRadius: '9999px', overflow: 'hidden', position: 'relative' }}>
              {/* Linha do Benchmark */}
              <div
                style={{
                  position: 'absolute',
                  left: `${activeSkill.benchmark || 80}%`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: '#00E5FF',
                  zIndex: 2
                }}
              />
              {/* Progresso do Aluno */}
              <div
                style={{
                  width: `${activeSkill.score}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${activeSkill.color}80, ${activeSkill.color})`,
                  borderRadius: '9999px'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: PASSIVES & PERKS DESBLOQUEADOS (ESTILO GAME RPG) */}
      <div style={{ marginTop: '24px', borderTop: '1px solid #1C2133', paddingTop: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}
          >
            <span>🛡️</span> Habilidades Passivas &amp; Buffs Desbloqueados (RPG Perks)
          </h4>
          <span style={{ fontSize: '11px', color: '#A1A1AA' }}>
            Desbloqueadas com base em consistência e taxa de acerto socrático
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px'
          }}
        >
          {DEVELOPER_PERKS.map((perk) => (
            <div
              key={perk.id}
              style={{
                background: '#14141C',
                border: '1px solid #262633',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  background: '#1C1C28',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {perk.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{perk.name}</span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: perk.rarity === 'legendary' ? '#FFA116' : perk.rarity === 'epic' ? '#A379FF' : '#00E5FF'
                    }}
                  >
                    {perk.rarity}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0', lineHeight: 1.4 }}>
                  {perk.description}
                </p>
                <span style={{ fontSize: '10px', color: '#04D361', fontWeight: 600, display: 'block' }}>
                  ✦ {perk.buffEffect}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
