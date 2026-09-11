'use client';

import React from 'react';
import Link from 'next/link';
import { CryptographicAuditRecord } from '../types';

interface AuditMetadataCardProps {
  record: CryptographicAuditRecord;
}

export const AuditMetadataCard: React.FC<AuditMetadataCardProps> = ({ record }) => {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 shadow-xl space-y-6">
      {/* 1. Student Profile Header */}
      <div>
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">
          Engenheiro Certificado
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shadow-lg shadow-[#8257E5]/20">
              <div className="w-full h-full bg-[#181820] rounded-[10px] flex items-center justify-center font-mono font-black text-sm text-[#00E5FF]">
                {record.student.avatarInitials}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{record.student.name}</span>
                <span className="text-[10px] font-mono bg-[#04D361]/15 text-[#04D361] px-2 py-0.2 rounded border border-[#04D361]/30 font-bold">
                  APROVADO
                </span>
              </h4>
              <p className="text-xs font-mono text-zinc-400">@{record.student.handle}</p>
            </div>
          </div>

          <Link
            href={record.student.profileUrl}
            className="text-xs font-semibold text-[#996DFF] hover:underline"
          >
            Ver Perfil Público →
          </Link>
        </div>
      </div>

      {/* 2. Technical Performance Breakdown */}
      <div className="border-t border-[#27272A] pt-5">
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">
          Métricas de Desempenho Auditadas no Sandbox
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
            <span className="text-[10px] font-mono text-zinc-400 block">Score Médio</span>
            <span className="text-lg font-mono font-black text-[#04D361]">
              {record.course.finalScorePercent}%
            </span>
          </div>
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
            <span className="text-[10px] font-mono text-zinc-400 block">Desafios Git</span>
            <span className="text-lg font-mono font-black text-[#00E5FF]">
              {record.course.challengesSolved} Concluídos
            </span>
          </div>
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
            <span className="text-[10px] font-mono text-zinc-400 block">Commits Validados</span>
            <span className="text-lg font-mono font-black text-white">
              {record.course.commitsAudited}
            </span>
          </div>
          <div className="bg-[#181820] border border-[#27272A] rounded-xl p-3">
            <span className="text-[10px] font-mono text-zinc-400 block">Horas de Código</span>
            <span className="text-lg font-mono font-black text-[#FFA116]">
              {record.course.hours}h
            </span>
          </div>
        </div>
      </div>

      {/* 3. Validated Skills & Competencies */}
      <div className="border-t border-[#27272A] pt-5">
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Competências Técnicas Validadas</span>
          <span className="text-[10px] text-[#04D361]">{record.skills.length} Habilidades</span>
        </h3>

        <div className="space-y-2.5">
          {record.skills.map((skill) => (
            <div
              key={skill.name}
              className="bg-[#181820] border border-[#27272A] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{skill.name}</span>
                  <span className="text-[10px] font-mono bg-[#8257E5]/15 text-[#996DFF] px-2 py-0.2 rounded border border-[#8257E5]/30 font-semibold">
                    {skill.proficiencyLevel}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">{skill.category}</span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs self-end sm:self-center">
                <span className="text-zinc-400 text-[10px]">Testes:</span>
                <span className="font-bold text-[#04D361]">{skill.score}% Aprovado</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
