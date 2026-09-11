'use client';

import React from 'react';
import { CryptographicAuditRecord } from '../types';

interface VerificationActionsProps {
  record: CryptographicAuditRecord;
  onCopyLink: () => void;
  onDownloadPdf: () => void;
  onShareLinkedIn: () => void;
}

export const VerificationActions: React.FC<VerificationActionsProps> = ({
  record,
  onCopyLink,
  onDownloadPdf,
  onShareLinkedIn,
}) => {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-3">
      <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
        Ações de Validação Pública
      </h3>

      {/* Copy Link */}
      <button
        type="button"
        onClick={onCopyLink}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#996DFF] hover:from-[#7143D6] hover:to-[#8257E5] text-white font-bold text-xs transition-all shadow-lg shadow-[#8257E5]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
      >
        <span>🔗</span>
        <span>Copiar Link para Recrutadores / RH</span>
      </button>

      {/* Download High-Res PDF */}
      <button
        type="button"
        onClick={onDownloadPdf}
        className="w-full py-3 rounded-xl bg-[#181820] hover:bg-[#202028] border border-[#27272A] hover:border-zinc-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>📄</span>
        <span>Baixar Certificado Oficial (PDF / Impressão)</span>
      </button>

      {/* Share on LinkedIn */}
      <button
        type="button"
        onClick={onShareLinkedIn}
        className="w-full py-3 rounded-xl bg-[#0077B5]/20 hover:bg-[#0077B5]/30 border border-[#0077B5]/50 text-[#00E5FF] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>💼</span>
        <span>Compartilhar no LinkedIn</span>
      </button>
    </div>
  );
};
