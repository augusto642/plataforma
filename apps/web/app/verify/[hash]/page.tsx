'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { getAuditRecordByHash } from './certificateData';
import { CertificateCard } from './components/CertificateCard';
import { AuditMetadataCard } from './components/AuditMetadataCard';
import { LedgerProofCard } from './components/LedgerProofCard';
import { VerificationActions } from './components/VerificationActions';
import { MerkleProofModal } from './components/MerkleProofModal';

interface VerifyPageProps {
  params: {
    hash: string;
  };
}

export default function VerifyCertificatePage({ params }: VerifyPageProps) {
  const record = getAuditRecordByHash(params.hash);
  const [isMerkleModalOpen, setIsMerkleModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
    }
    showToast('🔗 Link de verificação pública copiado para a área de transferência!');
  };

  const handleDownloadPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(
      `Acabo de concluir a formação de elite "${record.course.title}" na NEXUS CODE! Meu certificado SHA-256 está autenticado publicamente na blockchain: ${
        typeof window !== 'undefined' ? window.location.href : ''
      }`
    );
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${text}`;
    if (typeof window !== 'undefined') {
      window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans selection:bg-[#04D361] selection:text-black pb-24">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce print:hidden">
          <div className="bg-[#04D361] text-black border border-[#04D361]/60 px-4 py-3 rounded-xl text-xs font-mono font-bold shadow-[0_0_20px_rgba(4,211,97,0.4)]">
            {toastMessage}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Hidden during Print)                                       */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16 print:hidden">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />

            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/courses" className="text-zinc-400 hover:text-white transition-colors">
                Cursos
              </Link>
              <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                Leaderboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#04D361]/10 border border-[#04D361]/30 text-[#04D361] text-xs font-mono font-bold">
              <span>✓</span>
              <span>Certificado Válido</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER                                                         */}
      {/* ========================================================================= */}
      <main className="max-w-[1240px] mx-auto px-5 pt-8 space-y-8">
        {/* Verification Status Banner */}
        <div className="bg-[#121217] border border-[#04D361]/40 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(4,211,97,0.1)] print:hidden">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#04D361]/20 border border-[#04D361]/50 flex items-center justify-center text-2xl text-[#04D361] shrink-0">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-heading">
                  Auditoria Criptográfica Válida &amp; Autenticada
                </h2>
                <span className="text-[10px] font-mono bg-[#04D361]/15 text-[#04D361] px-2 py-0.2 rounded border border-[#04D361]/30 font-bold">
                  SHA-256 MATCH
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                Este certificado digital foi emitido pela autoridade acadêmica Nexus Code e assinado de forma imutável com prova de consenso distribuído.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMerkleModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#181820] border border-[#8257E5]/40 text-xs font-mono font-bold text-[#996DFF] hover:bg-[#8257E5]/15 transition-all self-start sm:self-auto cursor-pointer"
          >
            Ver Prova no Ledger →
          </button>
        </div>

        {/* Visual Certificate / Diploma */}
        <CertificateCard record={record} />

        {/* Audit Details & Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start print:hidden">
          {/* Metadata Card (Left 2 cols) */}
          <div className="lg:col-span-2">
            <AuditMetadataCard record={record} />
          </div>

          {/* Ledger Proof & Actions (Right 1 col) */}
          <div className="space-y-6">
            <VerificationActions
              record={record}
              onCopyLink={handleCopyLink}
              onDownloadPdf={handleDownloadPdf}
              onShareLinkedIn={handleShareLinkedIn}
            />

            <LedgerProofCard
              record={record}
              onInspectMerkle={() => setIsMerkleModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Merkle Proof Inspector Modal */}
      <MerkleProofModal
        isOpen={isMerkleModalOpen}
        onClose={() => setIsMerkleModalOpen(false)}
        record={record}
      />
    </div>
  );
}
