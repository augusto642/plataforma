'use client';

import React from 'react';

interface ToastNotificationProps {
  message: string | null;
  type?: 'success' | 'info' | 'error';
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type = 'success',
}) => {
  if (!message) return null;

  const bg =
    type === 'error'
      ? 'bg-[#F43F5E] text-white border-[#F43F5E]/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
      : type === 'info'
      ? 'bg-[#00E5FF] text-black border-[#00E5FF]/60 shadow-[0_0_20px_rgba(0,229,255,0.4)]'
      : 'bg-[#04D361] text-black border-[#04D361]/60 shadow-[0_0_20px_rgba(4,211,97,0.4)]';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div
        className={`px-4 py-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-2.5 ${bg}`}
      >
        <span>{type === 'error' ? '❌' : type === 'info' ? 'ℹ️' : '✅'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
};
