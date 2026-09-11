'use client';

import React, { useState } from 'react';

interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3;
  count: number;
}

interface AnnualHeatmapProps {
  heatmap: {
    totalSubmissions: number;
    maxStreak: number;
    currentStreak: number;
    averageDaily: number;
    days: HeatmapDay[];
  };
}

export const AnnualHeatmap: React.FC<AnnualHeatmapProps> = ({ heatmap }) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  const greenShades = ['bg-[#121214]', 'bg-[#00875F]', 'bg-[#00B37E]', 'bg-[#04D361]'];

  return (
    <div className="bento-card p-6 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2">
              <span>📊</span>
              <span>Frequência Anual de Submissões (52 Semanas)</span>
            </h3>
            <p className="text-xs text-[#71717A] mt-0.5">
              {heatmap.totalSubmissions} desafios resolvidos e commits realizados no último ano.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#71717A]">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-[#121214] border border-[#27272A]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#00875F]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#00B37E]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[#04D361]" />
            <span>Mais</span>
          </div>
        </div>

        {/* Heatmap Matrix (52 cols x 7 rows) */}
        <div className="overflow-x-auto py-4">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[620px]">
            {heatmap.days.map((day, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`w-2.5 h-2.5 rounded-[2px] ${greenShades[day.level]} border border-[#27272A]/30 hover:scale-150 hover:border-white transition-all cursor-pointer`}
                title={`${day.date}: ${day.count === 0 ? 'Nenhuma submissão' : `${day.count} submissões/testes aprovados`}`}
              />
            ))}
          </div>
        </div>

        {/* Active hover info badge */}
        <div className="h-5 text-[11px] text-[#A1A1AA] font-mono">
          {hoveredDay ? (
            <span className="text-[#04D361]">
              ● {hoveredDay.date}: {hoveredDay.count === 0 ? 'Nenhuma atividade registrada' : `${hoveredDay.count} desafios e commits realizados`}
            </span>
          ) : (
            <span className="text-[#71717A] text-[10px]">
              Passe o cursor sobre os blocos para inspecionar os envios.
            </span>
          )}
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="pt-4 border-t border-[#27272A] grid grid-cols-3 gap-3 text-center">
        <div className="bg-[#121214] p-2.5 rounded-xl border border-[#27272A]">
          <div className="text-[11px] text-[#71717A]">Maior Sequência</div>
          <div className="text-sm font-black text-[#FFA116] font-mono mt-0.5">
            {heatmap.maxStreak} dias
          </div>
        </div>
        <div className="bg-[#121214] p-2.5 rounded-xl border border-[#27272A]">
          <div className="text-[11px] text-[#71717A]">Sequência Atual</div>
          <div className="text-sm font-black text-[#04D361] font-mono mt-0.5">
            {heatmap.currentStreak} dias seguidos
          </div>
        </div>
        <div className="bg-[#121214] p-2.5 rounded-xl border border-[#27272A]">
          <div className="text-[11px] text-[#71717A]">Média de Resolução</div>
          <div className="text-sm font-black text-[#996DFF] font-mono mt-0.5">
            {heatmap.averageDaily} desafios / dia
          </div>
        </div>
      </div>
    </div>
  );
};
