'use client';

import React, { useState } from 'react';
import { AdminUser, AdminRole, UserStatus } from '../types';

interface AdminUsersTabProps {
  users: AdminUser[];
  onPromoteUser: (userId: string, newRole: AdminRole) => void;
  onToggleUserStatus: (userId: string) => void;
  onCreateInstructor: (newInstructor: {
    name: string;
    email: string;
    specialization: string;
    initialTrack: string;
  }) => void;
  onAdjustXp: (userId: string, amount: number) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onPromoteUser,
  onToggleUserStatus,
  onCreateInstructor,
  onAdjustXp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for new Instructor
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('Rust Systems & Memory Safety');
  const [newTrack, setNewTrack] = useState('Rust Systems Core');
  const [allowCuratorship, setAllowCuratorship] = useState(true);

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const studentsCount = users.filter((u) => u.role === 'student').length;
  const instructorsCount = users.filter((u) => u.role === 'instructor').length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  const handleSubmitInstructor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    onCreateInstructor({
      name: newName.trim(),
      email: newEmail.trim(),
      specialization: newSpecialization,
      initialTrack: newTrack,
    });

    setNewName('');
    setNewEmail('');
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#FFA116]/15 text-[#FFA116] border border-[#FFA116]/30">
            👑 Admin
          </span>
        );
      case 'instructor':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#8257E5]/15 text-[#8257E5] border border-[#8257E5]/30">
            🎓 Instrutor Lead
          </span>
        );
      case 'student':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]">
            🧑‍💻 Aluno
          </span>
        );
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-[#04D361] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#04D361]" /> Ativo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#F43F5E] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" /> Suspenso
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            Gestão de Usuários & Acessos
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Controle granular de papéis, permissões de curadoria, auditoria de contas e XP.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)] transition-all self-start md:self-auto"
        >
          <span>➕</span>
          <span>Cadastrar Instrutor / Lead</span>
        </button>
      </div>

      {/* 2. Mini Stats Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#121217] border border-[#27272A] flex flex-col">
          <span className="text-[11px] font-mono text-[#71717A]">Total Alunos</span>
          <span className="text-xl font-bold text-white font-heading">{studentsCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121217] border border-[#27272A] flex flex-col">
          <span className="text-[11px] font-mono text-[#8257E5]">Instrutores</span>
          <span className="text-xl font-bold text-[#8257E5] font-heading">{instructorsCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121217] border border-[#27272A] flex flex-col">
          <span className="text-[11px] font-mono text-[#FFA116]">Administradores</span>
          <span className="text-xl font-bold text-[#FFA116] font-heading">{adminsCount}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121217] border border-[#27272A] flex flex-col">
          <span className="text-[11px] font-mono text-[#F43F5E]">Suspensos</span>
          <span className="text-xl font-bold text-[#F43F5E] font-heading">{suspendedCount}</span>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#121217] border border-[#27272A] flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full lg:w-96">
          <svg
            className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nome, e-mail ou ID..."
            className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-xl border border-[#27272A] text-xs">
            {(['all', 'student', 'instructor', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  roleFilter === r
                    ? 'bg-[#8257E5] text-white font-semibold'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {r === 'all' ? 'Todos Cargos' : r === 'student' ? 'Alunos' : r === 'instructor' ? 'Instrutores' : 'Admins'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-xl border border-[#27272A] text-xs">
            {(['all', 'active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-[#27272A] text-white font-semibold border border-[#3F3F46]'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {s === 'all' ? 'Todos Status' : s === 'active' ? 'Ativos' : 'Suspensos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#181820]/60 text-[#71717A] uppercase font-mono text-[11px]">
                <th className="py-3 px-4 font-semibold">Usuário</th>
                <th className="py-3 px-4 font-semibold">Cargo / Papel</th>
                <th className="py-3 px-4 font-semibold">XP & Streak</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Último Acesso</th>
                <th className="py-3 px-4 font-semibold text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] text-[#EDEDED]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#71717A]">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#181820]/40 transition-colors">
                    {/* User Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8257E5] to-[#04D361] p-[1px] shrink-0">
                          <div className="w-full h-full bg-[#121217] rounded-[7px] flex items-center justify-center font-bold text-xs text-white">
                            {user.avatar || user.name.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-[11px] text-[#71717A] font-mono">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">{getRoleBadge(user.role)}</td>

                    {/* XP & Streak */}
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#FFA116]">
                          ⚡ {user.xp.toLocaleString('pt-BR')} XP
                        </span>
                        <span className="text-[#04D361] text-[11px]">🔥 {user.streak}d</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{getStatusBadge(user.status)}</td>

                    {/* Last Active */}
                    <td className="py-3 px-4 text-[#71717A] font-mono text-[11px]">
                      {new Date(user.lastActiveAt).toLocaleString('pt-BR')}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Promote / Demote Action */}
                        <select
                          value={user.role}
                          onChange={(e) => onPromoteUser(user.id, e.target.value as AdminRole)}
                          className="bg-[#181820] border border-[#27272A] hover:border-[#8257E5] rounded-lg px-2 py-1 text-[11px] text-[#EDEDED] font-mono outline-none cursor-pointer"
                        >
                          <option value="student">Aluno</option>
                          <option value="instructor">Instrutor</option>
                          <option value="admin">Admin Master</option>
                        </select>

                        {/* Adjust XP (+500) */}
                        <button
                          onClick={() => onAdjustXp(user.id, 500)}
                          title="Bonificar +500 XP"
                          className="px-2 py-1 rounded-lg bg-[#181820] hover:bg-[#FFA116]/20 border border-[#27272A] hover:border-[#FFA116]/40 text-[#FFA116] text-[11px] font-mono font-bold transition-colors"
                        >
                          +500 XP
                        </button>

                        {/* Suspend / Activate */}
                        <button
                          onClick={() => onToggleUserStatus(user.id)}
                          title={user.status === 'active' ? 'Suspender Conta' : 'Reativar Conta'}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
                            user.status === 'active'
                              ? 'bg-[#181820] hover:bg-[#F43F5E]/20 border-[#27272A] hover:border-[#F43F5E]/40 text-[#F43F5E]'
                              : 'bg-[#04D361]/15 border-[#04D361]/40 text-[#04D361] hover:bg-[#04D361]/25'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspender' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: Cadastrar Novo Instrutor / Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#121217] border border-[#8257E5]/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(130,87,229,0.2)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎓</span>
                <h3 className="text-base font-bold text-white font-heading">
                  Cadastrar Novo Instrutor / Lead
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg hover:bg-[#181820]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInstructor} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Dra. Mariana Linhares"
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="mariana.linhares@nexuscode.dev"
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Especialização Técnica Principal</label>
                <input
                  type="text"
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">Trilha Sob Supervisão Inicial</label>
                <select
                  value={newTrack}
                  onChange={(e) => setNewTrack(e.target.value)}
                  className="w-full bg-[#181820] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="Rust Systems Core">Rust Systems Core & Memory Safety</option>
                  <option value="Distributed Go Microservices">Distributed Go Microservices & Raft</option>
                  <option value="TypeScript Type Gymnastics">TypeScript Type Gymnastics</option>
                  <option value="Solidity Smart Contracts & EVM">Solidity Smart Contracts & EVM</option>
                  <option value="C++ High Performance Systems">C++ High Performance Systems</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#181820] border border-[#27272A]">
                <input
                  type="checkbox"
                  id="curatorship"
                  checked={allowCuratorship}
                  onChange={(e) => setAllowCuratorship(e.target.checked)}
                  className="w-4 h-4 accent-[#8257E5] rounded cursor-pointer"
                />
                <label htmlFor="curatorship" className="text-xs text-[#EDEDED] cursor-pointer">
                  Conceder privilégios de publicação direta e aprovação de testes ocultos
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181820] hover:bg-[#202028] text-[#A1A1AA] text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold shadow-[0_0_15px_rgba(130,87,229,0.35)]"
                >
                  Salvar e Conceder Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
