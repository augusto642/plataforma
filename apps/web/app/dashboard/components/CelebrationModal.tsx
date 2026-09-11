'use client';

import React, { useEffect } from 'react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpGained?: number;
  newLevel: number;
  leaguePosition?: string;
  onContinue?: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  onClose,
  xpGained = 250,
  newLevel,
  leaguePosition = '#2 na Liga',
  onContinue,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#18181B] border-2 border-[#00B37E] rounded-3xl p-8 text-center space-y-6 shadow-2xl glow-green transform transition-all duration-300 animate-scaleUp"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#00B37E] to-[#04D361] flex items-center justify-center text-4xl mx-auto shadow-xl shadow-[#00B37E]/40 animate-bounce">
          🎉
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white">
            Desafio Concluído com 100%!
          </h3>
          <p className="text-xs text-[#A1A1AA]">
            Todos os 12 casos de teste passaram com sucesso em 18ms.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121214] border border-[#27272A] flex items-center justify-around font-mono">
          <div>
            <div className="text-[10px] text-[#71717A]">XP Ganho</div>
            <div className="text-lg font-black text-[#04D361]">+{xpGained} XP</div>
          </div>
          <div className="h-8 w-px bg-[#27272A]" />
          <div>
            <div className="text-[10px] text-[#71717A]">Novo Nível</div>
            <div className="text-lg font-black text-[#996DFF]">Nível {newLevel}</div>
          </div>
          <div className="h-8 w-px bg-[#27272A]" />
          <div>
            <div className="text-[10px] text-[#71717A]">Posição</div>
            <div className="text-lg font-black text-[#FFA116]">{leaguePosition}</div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              if (onContinue) onContinue();
              onClose();
            }}
            className="w-full py-3.5 rounded-xl bg-[#00B37E] hover:bg-[#00875F] text-[#09090A] font-black text-sm transition-all shadow-lg glow-green active:scale-95 cursor-pointer"
          >
            Continuar para o Próximo Desafio →
          </button>
        </div>
      </div>
    </div>
  );
};
