'use client';

import React from 'react';

interface SkillItem {
  name: string;
  value: number; // 0 - 100
  benchmark: number; // 0 - 100
}

interface SkillsRadarChartProps {
  overallIndex: number;
  skills: SkillItem[];
}

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({
  overallIndex,
  skills,
}) => {
  // Center is (100, 100), max radius is 75
  const cx = 100;
  const cy = 100;
  const maxR = 75;

  // 6 Angles for 6 axes starting from top (270 deg / -90 deg)
  const angles = [
    -Math.PI / 2, // 0: Top (Algoritmos)
    -Math.PI / 6, // 1: Top Right (Backend)
    Math.PI / 6,  // 2: Bottom Right (System Design)
    Math.PI / 2,  // 3: Bottom (DevSecOps)
    (5 * Math.PI) / 6, // 4: Bottom Left (Cloud & Infra)
    (7 * Math.PI) / 6, // 5: Top Left (Frontend)
  ];

  // Helper to get coordinates for a given percentage and axis index
  const getPoint = (percentage: number, index: number) => {
    const angle = angles[index % angles.length];
    const r = (percentage / 100) * maxR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y };
  };

  // Generate student points string
  const studentPoints = skills
    .map((s, i) => {
      const { x, y } = getPoint(s.value, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Generate benchmark points string
  const benchmarkPoints = skills
    .map((s, i) => {
      const { x, y } = getPoint(s.benchmark, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Labels config
  const labelPositions = [
    { x: 100, y: 14, anchor: 'middle' },
    { x: 175, y: 60, anchor: 'start' },
    { x: 175, y: 145, anchor: 'start' },
    { x: 100, y: 195, anchor: 'middle' },
    { x: 25, y: 145, anchor: 'end' },
    { x: 25, y: 60, anchor: 'end' },
  ];

  return (
    <div className="bento-card p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2">
          <span>🕸️</span>
          <span>Radar de Competências Técnicas</span>
        </h3>
        <span className="text-[11px] text-[#8257E5] font-bold font-mono">
          Índice: {overallIndex.toFixed(1)}/100
        </span>
      </div>

      {/* SVG Radar Hexagon Graphic */}
      <div className="flex items-center justify-center py-4">
        <svg className="w-64 h-64" viewBox="0 0 200 200">
          {/* Background Polygons (100%, 66%, 33%) */}
          <polygon
            points="100,20 170,60 170,140 100,180 30,140 30,60"
            fill="none"
            stroke="#27272A"
            strokeWidth="1"
          />
          <polygon
            points="100,45 145,72 145,128 100,155 55,128 55,72"
            fill="none"
            stroke="#27272A"
            strokeWidth="1"
          />
          <polygon
            points="100,70 120,84 120,116 100,130 80,116 80,84"
            fill="none"
            stroke="#27272A"
            strokeWidth="1"
          />

          {/* Axis lines */}
          <line x1="100" y1="100" x2="100" y2="20" stroke="#27272A" strokeWidth="1" />
          <line x1="100" y1="100" x2="170" y2="60" stroke="#27272A" strokeWidth="1" />
          <line x1="100" y1="100" x2="170" y2="140" stroke="#27272A" strokeWidth="1" />
          <line x1="100" y1="100" x2="100" y2="180" stroke="#27272A" strokeWidth="1" />
          <line x1="100" y1="100" x2="30" y2="140" stroke="#27272A" strokeWidth="1" />
          <line x1="100" y1="100" x2="30" y2="60" stroke="#27272A" strokeWidth="1" />

          {/* Student Data Polygon (Glow filled) */}
          <polygon
            points={studentPoints || '100,28 160,65 150,130 100,165 42,132 40,68'}
            fill="rgba(130, 87, 229, 0.25)"
            stroke="#8257E5"
            strokeWidth="2"
          />

          {/* Target Senior Benchmark Polygon (Dashed Green) */}
          <polygon
            points={benchmarkPoints || '100,22 165,62 165,138 100,175 35,138 35,62'}
            fill="none"
            stroke="#00B37E"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.6"
          />

          {/* Student Vertex Nodes */}
          {skills.map((s, i) => {
            const { x, y } = getPoint(s.value, i);
            return <circle key={s.name} cx={x} cy={y} r="3.5" fill="#8257E5" />;
          })}

          {/* Axis Labels */}
          {skills.map((s, i) => {
            const pos = labelPositions[i] || { x: 100, y: 100, anchor: 'middle' };
            return (
              <text
                key={s.name}
                x={pos.x}
                y={pos.y}
                fontSize="8"
                fill="#A1A1AA"
                fontWeight="bold"
                textAnchor={pos.anchor as 'start' | 'middle' | 'end'}
              >
                {s.name} ({s.value}%)
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-6 text-xs text-[#71717A] pt-2 border-t border-[#27272A]">
        <span className="flex items-center gap-1.5 text-[#996DFF]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8257E5]" /> Você ({overallIndex.toFixed(1)}%)
        </span>
        <span className="flex items-center gap-1.5 text-[#00B37E]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00B37E] opacity-60" /> Benchmark Sênior
        </span>
      </div>
    </div>
  );
};
