'use client';

import React, { useState, useEffect } from 'react';
import { WeeklyRoundInfo } from '../types';

interface WeeklyTimerCardProps {
  roundInfo: WeeklyRoundInfo;
}

export const WeeklyTimerCard: React.FC<WeeklyTimerCardProps> = ({ roundInfo }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 3, hours: 14, minutes: 22, seconds: 45 });

  useEffect(() => {
    const target = new Date(roundInfo.endsAt).getTime();

    const calculateTime = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [roundInfo.endsAt]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-5 md:p-6 mb-8 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-[#8257E5] via-[#00E5FF] to-[#04D361]" />

      {/* Left info */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#181820] border border-[#8257E5]/40 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(130,87,229,0.25)]">
          ⏱️
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#8257E5] uppercase tracking-wider">
              Rodada #{roundInfo.roundNumber} em Andamento
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] mr-1.5 animate-ping" />
              Ao Vivo
            </span>
          </div>
          <h3 className="text-lg font-bold text-white font-heading mt-0.5">
            Fechamento da Rodada Semanal
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md">
            Ao término do cronômetro, os Top 5 sobem de liga, e os últimos 5 são rebaixados.
            XP e streaks são consolidados na blockchain.
          </p>
        </div>
      </div>

      {/* Right: Digital Countdown Timer */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono">
        {/* Days */}
        <div className="flex flex-col items-center bg-[#181820] border border-[#27272A] rounded-xl px-3 sm:px-4 py-2 min-w-[62px]">
          <span className="text-xl sm:text-2xl font-black text-white">{pad(timeLeft.days)}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Dias</span>
        </div>
        <span className="text-zinc-600 font-bold text-xl">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center bg-[#181820] border border-[#27272A] rounded-xl px-3 sm:px-4 py-2 min-w-[62px]">
          <span className="text-xl sm:text-2xl font-black text-white">{pad(timeLeft.hours)}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Horas</span>
        </div>
        <span className="text-zinc-600 font-bold text-xl">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center bg-[#181820] border border-[#27272A] rounded-xl px-3 sm:px-4 py-2 min-w-[62px]">
          <span className="text-xl sm:text-2xl font-black text-white">{pad(timeLeft.minutes)}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold">Min</span>
        </div>
        <span className="text-zinc-600 font-bold text-xl">:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center bg-[#181820] border border-[#04D361]/40 rounded-xl px-3 sm:px-4 py-2 min-w-[62px] shadow-[0_0_10px_rgba(4,211,97,0.15)]">
          <span className="text-xl sm:text-2xl font-black text-[#04D361]">{pad(timeLeft.seconds)}</span>
          <span className="text-[10px] text-[#04D361]/80 uppercase font-bold">Seg</span>
        </div>
      </div>
    </div>
  );
};
