'use client';

import React, { useState } from 'react';
import { InstructorItem } from '../types';

interface AdminInstructorsTabProps {
  instructors: InstructorItem[];
  onOpenCreateModal: () => void;
  onAssignTrack: (instructorId: string, trackName: string) => void;
}

export const AdminInstructorsTab: React.FC<AdminInstructorsTabProps> = ({
  instructors,
  onOpenCreateModal,
  onAssignTrack,
}) => {
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorItem | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [newTrackName, setNewTrackName] = useState('Distributed Go Microservices');

  const totalMentoredStudents = instructors.reduce((acc, curr) => acc + curr.activeStudents, 0);
  const totalChallengesCreated = instructors.reduce((acc, curr) => acc + curr.challengesCount, 0);

  const handleOpenAssign = (inst: InstructorItem) => {
    setSelectedInstructor(inst);
    setAssignModalOpen(true);
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInstructor && newTrackName) {
      onAssignTrack(selectedInstructor.id, newTrackName);
      setAssignModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            Corpo Docente & Tech Leads
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Supervisão de instrutores, métricas de mentoria, autoria de desafios e curadoria de trilhas.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)] transition-all self-start md:self-auto"
        >
          <span>➕</span>
          <span>Adicionar Novo Instrutor Lead</span>
        </button>
      </div>

      {/* 2. Bento Stats for Instructors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#71717A] uppercase">Instrutores Ativos</span>
            <p className="text-2xl font-bold text-white font-heading mt-1">{instructors.length}</p>
            <p className="text-xs text-[#04D361] mt-1 font-mono">100% Taxa de SLA</p>
          </div>
          <div className="p-3 rounded-xl bg-[#181820] text-[#8257E5] border border-[#27272A] text-xl">
            🎓
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#71717A] uppercase">Alunos Supervisionados</span>
            <p className="text-2xl font-bold text-white font-heading mt-1">
              {totalMentoredStudents.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-[#00E5FF] mt-1 font-mono">+18% este mês</p>
          </div>
          <div className="p-3 rounded-xl bg-[#181820] text-[#00E5FF] border border-[#27272A] text-xl">
            👥
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-[#71717A] uppercase">Desafios Publicados</span>
            <p className="text-2xl font-bold text-white font-heading mt-1">{totalChallengesCreated}</p>
            <p className="text-xs text-[#FFA116] mt-1 font-mono">Nota Média: 4.96 ⭐</p>
          </div>
          <div className="p-3 rounded-xl bg-[#181820] text-[#FFA116] border border-[#27272A] text-xl">
            ⚡
          </div>
        </div>
      </div>

      {/* 3. Instructors Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {instructors.map((inst) => (
          <div
            key={inst.id}
            className="p-5 rounded-2xl bg-[#121217] border border-[#27272A] hover:border-[#8257E5]/60 transition-all duration-300 flex flex-col justify-between space-y-4 group"
          >
            <div>
              {/* Card Header with Avatar and Rating */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8257E5] via-[#996DFF] to-[#00E5FF] p-[1.5px] shadow-[0_0_15px_rgba(130,87,229,0.25)]">
                    <div className="w-full h-full bg-[#121217] rounded-[10px] flex items-center justify-center font-bold text-white text-sm">
                      {inst.avatar || inst.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#996DFF] transition-colors">
                      {inst.name}
                    </h3>
                    <p className="text-[11px] text-[#71717A] font-mono truncate max-w-[160px]">
                      {inst.email}
                    </p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#FFA116] bg-[#FFA116]/10 px-2 py-0.5 rounded-md border border-[#FFA116]/20">
                  ★ {inst.rating.toFixed(2)}
                </span>
              </div>

              {/* Specializations Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {inst.specializations.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#181820] text-[#A1A1AA] border border-[#27272A]"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Metrics footer */}
            <div className="space-y-3 pt-3 border-t border-[#27272A]">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-[#181820] border border-[#27272A]">
                  <p className="text-[10px] text-[#71717A] font-mono">Trilhas</p>
                  <p className="font-bold text-white">{inst.tracksCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#181820] border border-[#27272A]">
                  <p className="text-[10px] text-[#71717A] font-mono">Desafios</p>
                  <p className="font-bold text-[#8257E5]">{inst.challengesCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#181820] border border-[#27272A]">
                  <p className="text-[10px] text-[#71717A] font-mono">Alunos</p>
                  <p className="font-bold text-[#04D361]">{inst.activeStudents}</p>
                </div>
              </div>

              <button
                onClick={() => handleOpenAssign(inst)}
                className="w-full py-2 rounded-xl bg-[#181820] hover:bg-[#8257E5]/15 border border-[#27272A] hover:border-[#8257E5]/40 text-xs font-semibold text-[#EDEDED] hover:text-[#8257E5] transition-all flex items-center justify-center gap-1.5"
              >
                <span>➕ Designar Nova Trilha</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Modal: Designar Trilha */}
      {assignModalOpen && selectedInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121217] border border-[#8257E5]/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(130,87,229,0.2)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Designar Trilha para Instrutor
                </h3>
                <p className="text-xs text-[#A1A1AA]">{selectedInstructor.name}</p>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#181820]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAssign} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Selecione a Trilha</label>
                <select
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="Rust Systems Core">Rust Systems Core & Memory Safety</option>
                  <option value="Distributed Go Microservices">Distributed Go Microservices & Raft</option>
                  <option value="TypeScript Type Gymnastics">TypeScript Type Gymnastics</option>
                  <option value="Solidity Smart Contracts & EVM">Solidity Smart Contracts & EVM</option>
                  <option value="C++ High Performance Systems">C++ High Performance Systems</option>
                  <option value="Kubernetes & Linux Kernel Internals">Kubernetes & Linux Kernel Internals</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#181820] border border-[#27272A] text-xs text-[#A1A1AA]">
                O instrutor receberá acesso de curadoria, gestão de submissões e publicação de novos desafios para esta trilha.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] text-[#A1A1AA] text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)]"
                >
                  Confirmar Designação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
