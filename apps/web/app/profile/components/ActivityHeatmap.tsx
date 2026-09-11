'use client';

import React, { useState, useMemo } from 'react';

interface DayData {
  date: string;
  formattedDate: string;
  count: number;
  level: number;
}

interface ActivityHeatmapProps {
  onDayClick: (day: DayData) => void;
}

export function ActivityHeatmap({ onDayClick }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{
    day: DayData;
    x: number;
    y: number;
  } | null>(null);

  // Gerar dados dos últimos 364 dias (52 semanas)
  const days: DayData[] = useMemo(() => {
    const list: DayData[] = [];
    const baseDate = new Date('2026-09-08');

    for (let i = 363; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);

      // Simulação com padrão orgânico de streaks e commits
      let level = 0;
      let count = 0;
      const isStreakPeriod = i < 48;
      // Deterministic seed based on day index
      const seed = Math.sin(i * 997) * 10000;
      const rand = seed - Math.floor(seed);

      if (isStreakPeriod) {
        if (rand > 0.55) {
          level = 4;
          count = Math.floor(rand * 8) + 8;
        } else if (rand > 0.25) {
          level = 3;
          count = Math.floor(rand * 5) + 4;
        } else {
          level = 2;
          count = Math.floor(rand * 3) + 2;
        }
      } else {
        if (rand > 0.85) {
          level = 4;
          count = Math.floor(rand * 8) + 8;
        } else if (rand > 0.65) {
          level = 3;
          count = Math.floor(rand * 5) + 4;
        } else if (rand > 0.45) {
          level = 2;
          count = Math.floor(rand * 3) + 2;
        } else if (rand > 0.25) {
          level = 1;
          count = 1;
        } else {
          level = 0;
          count = 0;
        }
      }

      list.push({
        date: d.toISOString().split('T')[0],
        formattedDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
        count,
        level
      });
    }

    return list;
  }, []);

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return '#0e4429';
      case 2:
        return '#006d32';
      case 3:
        return '#26a641';
      case 4:
        return '#39d353';
      default:
        return '#14141c';
    }
  };

  return (
    <div
      style={{
        background: '#101015',
        border: '1px solid #262630',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        position: 'relative'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04D361" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Atividade Contínua de Código (365 Dias)
          </h3>
          <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '2px', margin: 0 }}>
            1.482 commits e desafios resolvidos no último ano
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
            <span>Streak Atual: </span>
            <strong style={{ color: '#FFA116' }}>48 dias 🔥</strong>
          </div>
          <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
            <span>Maior Streak: </span>
            <strong style={{ color: '#FFF' }}>120 dias ⚡</strong>
          </div>
        </div>
      </div>

      {/* HEATMAP GRID */}
      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateRows: 'repeat(7, 12px)',
            gap: '4px',
            width: 'max-content'
          }}
        >
          {days.map((day, idx) => (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredDay({
                  day,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8
                });
              }}
              onMouseLeave={() => setHoveredDay(null)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: getCellColor(day.level),
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: day.level === 4 ? '0 0 4px rgba(57, 211, 83, 0.4)' : undefined
              }}
            />
          ))}
        </div>
      </div>

      {/* TOOLTIP FLUTUANTE */}
      {hoveredDay && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            background: '#1F1F28',
            border: '1px solid #262630',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 8px 20px rgba(0,0,0,0.8)',
            zIndex: 9999,
            whiteSpace: 'nowrap'
          }}
        >
          <strong>{hoveredDay.day.count} contribuições</strong> em {hoveredDay.day.formattedDate}
        </div>
      )}

      {/* HEATMAP LEGEND */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#71717A',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <span>Dica: Clique em qualquer dia para inspecionar os commits e resoluções</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Menos</span>
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: '#14141c' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: '#0e4429' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: '#006d32' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: '#26a641' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', background: '#39d353' }} />
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
