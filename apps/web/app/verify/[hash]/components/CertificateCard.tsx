'use client';

import React from 'react';
import { CryptographicAuditRecord } from '../types';

interface CertificateCardProps {
  record: CryptographicAuditRecord;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({ record }) => {
  return (
    <div
      id="certificate-print-area"
      className="bg-[#0D0D12] border-2 border-[#8257E5]/50 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-[0_0_50px_rgba(130,87,229,0.15)] select-none print:border-black print:bg-white print:text-black"
    >
      {/* Holographic Border Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#8257E5]/10 via-[#00E5FF]/5 to-[#04D361]/10 pointer-events-none" />

      {/* Decorative Corner Borders */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#00E5FF]/70" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#00E5FF]/70" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#00E5FF]/70" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#00E5FF]/70" />

      {/* Header: Platform Logo & Cryptographic Seal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-[#27272A] relative z-10 print:border-gray-300">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-10 rounded-xl bg-[#181820] border border-[#8257E5]/60 flex items-center justify-center p-1 shadow-[0_0_15px_rgba(130,87,229,0.3)] print:border-black">
            <span className="text-base font-black text-[#04D361]">⚡</span>
          </div>
          <div>
            <div className="text-xl font-black font-heading tracking-tight text-white print:text-black">
              NEXUS<span className="text-[#8257E5]">CODE</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#00E5FF] font-bold">
              PLATAFORMA DE FORMAÇÃO DE ENGENHARIA DE SOFTWARE
            </div>
          </div>
        </div>

        {/* Verification Holographic Badge */}
        <div className="flex items-center gap-2 bg-[#04D361]/10 border border-[#04D361]/40 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(4,211,97,0.2)] self-start sm:self-auto print:border-black">
          <span className="w-2 h-2 rounded-full bg-[#04D361] animate-ping" />
          <span className="text-xs font-mono font-bold text-[#04D361] uppercase tracking-wider print:text-black">
            AUTENTICADO NA BLOCKCHAIN NEXUS
          </span>
        </div>
      </div>

      {/* Body: Certificate Text */}
      <div className="py-10 text-center relative z-10">
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-3 font-semibold print:text-gray-600">
          CERTIFICADO OFICIAL DE CONGRUÊNCIA TÉCNICA &amp; MESTRIA
        </span>

        <p className="text-sm text-zinc-400 print:text-gray-700">
          Certificamos que o engenheiro de software
        </p>

        <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight my-4 print:text-black bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
          {record.student.name}
        </h1>

        <p className="text-sm text-zinc-400 max-w-xl mx-auto print:text-gray-700 leading-relaxed">
          concluiu com êxito todos os módulos, laboratórios e testes automatizados de compilador da formação
        </p>

        <div className="my-5 inline-block px-5 py-2.5 rounded-2xl bg-[#181820] border border-[#8257E5]/50 shadow-[0_0_20px_rgba(130,87,229,0.2)] print:border-black print:bg-gray-100">
          <h2 className="text-lg sm:text-xl font-black text-[#00E5FF] font-heading print:text-black">
            {record.course.title}
          </h2>
        </div>

        {/* Metric Badges in Certificate */}
        <div className="flex flex-wrap justify-center gap-4 text-xs font-mono my-4">
          <div className="px-3 py-1.5 rounded-xl bg-[#121217] border border-[#27272A] text-zinc-300 print:border-gray-300 print:text-black">
            ⏱️ <span className="font-bold text-white print:text-black">{record.course.hours}h de Prática Git</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#121217] border border-[#27272A] text-zinc-300 print:border-gray-300 print:text-black">
            💻 <span className="font-bold text-[#00E5FF] print:text-black">{record.course.challengesSolved} Desafios Resolvidos</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#121217] border border-[#27272A] text-zinc-300 print:border-gray-300 print:text-black">
            📊 <span className="font-bold text-[#04D361] print:text-black">{record.course.finalScorePercent}% Rendimento Médio</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#121217] border border-[#27272A] text-zinc-300 print:border-gray-300 print:text-black">
            🌱 <span className="font-bold text-white print:text-black">{record.course.commitsAudited} Commits Auditados</span>
          </div>
        </div>
      </div>

      {/* Footer: Signatures & Cryptographic Digest */}
      <div className="pt-8 border-t border-[#27272A] flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 print:border-gray-300 text-left">
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">
            HASH CRIPTOGRÁFICO DE AUDITORIA SHA-256
          </div>
          <div className="text-[11px] font-mono text-[#00E5FF] break-all max-w-lg print:text-black font-semibold">
            {record.hash}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">
            Emitido em {record.course.issuedDate} • Bloco #{record.blockHeight.toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Seal Stamp */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#FFA116]/80 flex flex-col items-center justify-center text-center p-1 shadow-[0_0_15px_rgba(255,161,22,0.2)] print:border-black">
            <span className="text-base">🏆</span>
            <span className="text-[7px] font-mono font-black text-[#FFA116] uppercase leading-tight print:text-black">
              VERIFICADO OFICIAL
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-white print:text-black">
              Nexus Academic Board
            </div>
            <div className="text-[10px] font-mono text-zinc-500">Conselho de Engenharia</div>
          </div>
        </div>
      </div>
    </div>
  );
};
