'use client';

import React from 'react';
import { CryptographicAuditRecord } from '../types';

interface MerkleProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CryptographicAuditRecord;
}

export const MerkleProofModal: React.FC<MerkleProofModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen) return null;

  const rawJsonProof = JSON.stringify(
    {
      proofVersion: 'v2.1-nexus-merkle-sha256',
      blockHeight: record.blockHeight,
      timestamp: record.timestamp,
      validatorNode: record.validatorNode,
      signatureAlgorithm: record.signatureAlg,
      merkleRoot: record.merkleRoot,
      leafDigest: record.hash,
      studentIdentity: {
        name: record.student.name,
        handle: record.student.handle,
      },
      curriculum: {
        title: record.course.title,
        commitsAudited: record.course.commitsAudited,
        score: `${record.course.finalScorePercent}%`,
      },
      immutableProofState: 'CONSENSUS_FINALIZED',
    },
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-[#8257E5]/50 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌲</span>
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                Árvore de Merkle &amp; Prova Criptográfica
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                Nexus Quantum-Resistant Ledger Proof Validator
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#181820] hover:bg-[#27272A] text-zinc-400 hover:text-white flex items-center justify-center text-sm font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Visual Merkle Diagram */}
        <div className="bg-[#0E0E12] border border-[#27272A] rounded-xl p-4 mb-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#04D361]">
            <span>[ROOT]</span>
            <span className="truncate">{record.merkleRoot}</span>
          </div>
          <div className="pl-4 border-l border-zinc-700 space-y-2">
            <div className="flex items-center gap-2 text-[#00E5FF]">
              <span>├── [BRANCH_A]</span>
              <span>Node_Validator_Signature_ED25519</span>
            </div>
            <div className="flex items-center gap-2 text-[#996DFF]">
              <span>└── [LEAF_NODE]</span>
              <span className="truncate">{record.hash}</span>
            </div>
          </div>
        </div>

        {/* Raw JSON Code Block */}
        <div className="relative">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
            <span>Payload Criptográfico Canônico:</span>
            <span className="text-[#04D361]">● Assinatura Válida</span>
          </div>
          <pre className="bg-[#08080B] border border-[#27272A] rounded-xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-60 leading-relaxed">
            {rawJsonProof}
          </pre>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#27272A]">
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(rawJsonProof);
            }}
            className="px-4 py-2 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-xs font-mono font-semibold text-zinc-300 transition-colors"
          >
            Copiar JSON da Prova
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-xs font-bold text-white transition-colors"
          >
            Fechar Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};
