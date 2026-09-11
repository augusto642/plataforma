'use client';

import React from 'react';

interface WeeklyGoalRingProps {
  goal: {
    studiedHours: number;
    targetHours: number;
    percent: number;
    remainingTimeText: string;
    days: Array<{
      day: string;
      completed: boolean;
      isToday: boolean;
      hasFlame?: boolean;
    }>;
  };
}

export const WeeklyGoalRing: React.FC<WeeklyGoalRingProps> = ({ goal }) => {
  const strokeDash = `${goal.percent}, 100`;

  return (
    <div className="bento-card p-6 flex flex-col justify-between border-t-2 border-t-[#00B37E]/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2">
            <span>🎯</span>
            <span>Meta de Estudo Semanal</span>
          </h3>
          <span className="text-xs font-bold text-[#04D361] font-mono">
            {goal.studiedHours} / {goal.targetHours}h
          </span>
        </div>

        {/* Weekly Ring Visualizer */}
        <div className="flex items-center justify-center py-2">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background Path */}
              <path
                className="text-[#202024]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Progress Green Path */}
              <path
                className="text-[#00B37E] transition-all duration-1000 ease-out"
                strokeDasharray={strokeDash}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white font-mono">
                {goal.percent}%
              </span>
              <span className="text-[10px] text-[#71717A] uppercase font-bold">
                Concluído
              </span>
            </div>
          </div>
        </div>

        {/* 7-Day Checklist */}
        <div className="grid grid-cols-7 gap-1 pt-2 text-center">
          {goal.days.map((d) => (
            <div key={d.day} className="flex flex-col items-center gap-1">
              <span
                className={`text-[10px] ${
                  d.hasFlame ? 'text-[#FFA116] font-bold' : 'text-[#71717A]'
                }`}
              >
                {d.day}
              </span>
              {d.hasFlame ? (
                <div className="w-7 h-7 rounded-lg bg-[#FFA116] text-[#09090A] font-bold flex items-center justify-center text-xs shadow-md shadow-[#FFA116]/30 animate-pulse cursor-pointer">
                  🔥
                </div>
              ) : d.completed ? (
                <div className="w-7 h-7 rounded-lg bg-[#00B37E]/20 text-[#04D361] border border-[#00B37E]/40 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#18181B] text-[#71717A] border border-[#27272A] flex items-center justify-center text-xs font-medium">
                  —
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Remaining Goal Time */}
      <div className="pt-4 mt-4 border-t border-[#27272A] text-xs text-[#A1A1AA] flex justify-between items-center">
        <span>Tempo Restante:</span>
        <span className="text-white font-bold font-mono">
          {goal.remainingTimeText}
        </span>
      </div>
    </div>
  );
};
