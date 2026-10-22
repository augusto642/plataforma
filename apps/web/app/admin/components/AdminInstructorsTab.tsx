'use client';

import React from 'react';
import { AdminUserRow } from '../types';
import { formatDate, formatNumber, initialsOf } from '../utils';

// B40/A4 (Sprint 13) — Instrutores REAIS.
// Antes: lista de instrutores inventados com rating 5,0, especializações
// e "alunos ativos" fabricados, e ação de "designar trilha" que só
// mudava estado local. Agora a lista vem de GET /admin/users?role=
// instructor e mostra apenas campos reais da API (cursos ministrados,
// XP, nível, submissões). Rating, especializações e designação de
// trilha não existem na API: foram removidos, não estimados.

interface AdminInstructorsTabProps {
  instructors: AdminUserRow[];
  total: number;
  instructorsError: string | null;
  onOpenCreateModal: () => void;
}

export const AdminInstructorsTab: React.FC<AdminInstructorsTabProps> = ({
  instructors,
  total,
  instructorsError,
  onOpenCreateModal,
}) => {
  const totalCourses = instructors.reduce((acc, i) => acc + i.instructedCoursesCount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Instrutores</h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            {formatNumber(total)} instrutor(es) reais na plataforma ·{' '}
            {formatNumber(totalCourses)} curso(s) ministrados por eles (GET /admin/users).
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold transition-all shrink-0"
        >
          + Cadastrar Instrutor
        </button>
      </div>

      {instructorsError ? (
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] text-xs text-[#A1A1AA]">
          Não foi possível carregar os instrutores reais: {instructorsError}
        </div>
      ) : instructors.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] text-xs text-[#A1A1AA]">
          Nenhum instrutor cadastrado na plataforma até o momento.
        </div>
      ) : (
        <div className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-[#27272A] text-[#71717A] font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Instrutor</th>
                <th className="py-3 px-4">Cursos ministrados</th>
                <th className="py-3 px-4">XP / Nível</th>
                <th className="py-3 px-4">Submissões</th>
                <th className="py-3 px-4">Visível no Talent</th>
                <th className="py-3 px-4">Desde</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst) => (
                <tr key={inst.id} className="border-b border-[#27272A]/50 hover:bg-[#181820]/60">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#00E5FF] to-[#8257E5] p-[1.5px] shrink-0">
                        <div className="w-full h-full bg-[#181820] rounded-[7px] flex items-center justify-center font-mono font-black text-[11px] text-white">
                          {initialsOf(inst.name)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate max-w-[220px]">
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-[#71717A] font-mono truncate max-w-[220px]">
                          {inst.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">
                    {inst.instructedCoursesCount}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">
                    {formatNumber(inst.xp)} XP · Nv. {inst.level}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">{inst.submissionsCount}</td>
                  <td className="py-3 px-4 text-[#A1A1AA]">
                    {inst.talentVisible ? 'Sim' : 'Não'}
                  </td>
                  <td className="py-3 px-4 text-[#A1A1AA]">{formatDate(inst.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
        <span className="font-bold text-white">Campos não exibidos:</span> avaliação (rating),
        especializações e “alunos ativos por instrutor” não são retornados pela API — os valores
        fabricados que esta tela mostrava foram removidos. Designar trilhas a instrutores também
        não tem endpoint e a ação simulada foi retirada.
      </div>
    </div>
  );
};
