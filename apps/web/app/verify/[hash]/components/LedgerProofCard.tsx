'use client';

import React from 'react';
import { CryptographicAuditRecord } from '../types';

interface LedgerProofCardProps {
  record: CryptographicAuditRecord;
  onInspectMerkle: () => void;
}

export const LedgerProofCard: React.FC<LedgerProofCardProps> = ({
  record,
  onInspectMerkle,
}) => {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <span>⛓️</span>
          <span>Prova de Integridade no Ledger Nexus</span>
        </h3>
        <span className="text-[10px] font-mono text-[#04D361] bg-[#04D361]/10 px-2 py-0.5 rounded border border-[#04D361]/30 font-bold">
          IMUTÁVEL
        </span>
      </div>

      <div className="space-y-2 text-xs font-mono">
        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
            Altura do Bloco (Block Height)
          </span>
          <span className="text-white font-bold">#{record.blockHeight.toLocaleString('pt-BR')}</span>
        </div>

        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
            Merkle Root Hash
          </span>
          <span className="text-[#00E5FF] font-semibold break-all text-[11px]">
            {record.merkleRoot}
          </span>
        </div>

        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
            Nó Validador de Consenso
          </span>
          <span className="text-zinc-300 text-[11px]">{record.validatorNode}</span>
        </div>

        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase block mb-0.5">
            Algoritmo de Assinatura
          </span>
          <span className="text-zinc-300 text-[11px]">{record.signatureAlg}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onInspectMerkle}
        className="w-full py-2.5 rounded-xl bg-[#181820] hover:bg-[#202028] border border-[#8257E5]/40 text-xs font-mono font-bold text-[#996DFF] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>🔍</span>
        <span>Inspecionar Árvore de Merkle &amp; Prova Criptográfica</span>
      </button>
    </div>
  );
};
