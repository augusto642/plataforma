'use client';

import React from 'react';

interface SocraticCopilotBoxProps {
  socraticAi: {
    tip: string;
    strength: string;
    attentionPoint: string;
  };
  onOpenChat: () => void;
}

export const SocraticCopilotBox: React.FC<SocraticCopilotBoxProps> = ({
  socraticAi,
  onOpenChat,
}) => {
  return (
    <div className="bento-card p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#0070F3] flex items-center justify-center text-sm shadow-md">
              🤖
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Diagnóstico do Tutor Pedagógico Socrático
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Análise em tempo real baseada no seu padrão de erros e acertos.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8257E5]/20 text-[#996DFF] border border-[#8257E5]/30">
            IA Ativa
          </span>
        </div>

        {/* Socratic Insight Box */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272A] space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFA116]">
            <span>💡</span>
            <span>Dica Pedagógica Socrática:</span>
          </div>
          <p className="text-xs text-[#C4C4CC] leading-relaxed">
            &ldquo;{socraticAi.tip}&rdquo;
          </p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#121214] border border-[#27272A]">
            <div className="text-[11px] text-[#71717A]">Pontos Fortes</div>
            <div className="text-xs font-bold text-[#04D361] mt-0.5">
              {socraticAi.strength}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#121214] border border-[#27272A]">
            <div className="text-[11px] text-[#71717A]">Ponto de Atenção</div>
            <div className="text-xs font-bold text-[#FFA116] mt-0.5">
              {socraticAi.attentionPoint}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onOpenChat}
        className="w-full py-2.5 rounded-xl bg-[#202024] hover:bg-[#27272A] border border-[#27272A] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
      >
        <span>Abrir Conversa com o Tutor</span>
        <span>→</span>
      </button>
    </div>
  );
};
