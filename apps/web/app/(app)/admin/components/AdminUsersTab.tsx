'use client';

import React, { useMemo, useState } from 'react';
import { AdminPlan, AdminRole, AdminUserRow } from '../types';
import { formatDate, formatDateTime, formatNumber, initialsOf } from '../utils';

// B40/A4 (Sprint 13) — Gestão de Usuários com dados e ações REAIS.
// Antes: lista de usuários inventados persistida em localStorage, com
// ações simuladas (suspender conta, conceder XP) que só mudavam o
// estado local e exibiam sucesso falso. Agora:
//  - a lista vem de GET /admin/users (busca feita no servidor);
//  - alterar papel  -> PATCH /admin/users/:id/role   (real);
//  - alterar plano  -> PATCH /admin/users/:id/plan   (real, B32);
//  - criar instrutor -> POST /admin/instructors      (real);
//  - sucesso/erro vêm da resposta da API (nada de toast otimista).
// Suspensão de conta e ajuste manual de XP NÃO têm endpoint: as ações
// foram removidas e a limitação é declarada na tela.

interface AdminUsersTabProps {
  users: AdminUserRow[];
  total: number;
  usersError: string | null;
  mutatingId: string | null;
  onUpdateRole: (userId: string, role: AdminRole) => void;
  onUpdatePlan: (userId: string, plan: AdminPlan) => void;
  onCreateInstructor: (data: {
    name: string;
    email: string;
    password?: string;
  }) => Promise<boolean>;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  student: 'Aluno',
  instructor: 'Instrutor',
  admin: 'Admin',
};

type RoleFilter = 'all' | AdminRole;

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  total,
  usersError,
  mutatingId,
  onUpdateRole,
  onUpdatePlan,
  onCreateInstructor,
}) => {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(
    () => (roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const ok = await onCreateInstructor({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password.trim() ? form.password : undefined,
    });
    setIsCreating(false);
    if (ok) {
      setForm({ name: '', email: '', password: '' });
      setFormOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Gestão de Usuários</h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            {formatNumber(total)} usuário(s) na plataforma · exibindo {filtered.length} nesta
            página (GET /admin/users). A busca do topo filtra no servidor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-xs font-semibold transition-all shrink-0"
        >
          + Cadastrar Instrutor
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl bg-[#121217] border border-[#8257E5]/40 space-y-3"
        >
          <h3 className="text-sm font-bold text-white font-heading">
            Novo instrutor (POST /admin/instructors)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
              className="bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#8257E5]"
            />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@instituicao.edu"
              className="bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#8257E5]"
            />
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Senha inicial (opcional, mín. 8)"
              className="bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#8257E5]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-xl bg-[#04D361] hover:bg-[#00B37E] text-[#08080B] text-xs font-bold transition-all disabled:opacity-50"
            >
              {isCreating ? 'Cadastrando…' : 'Cadastrar instrutor'}
            </button>
            <p className="text-[11px] text-[#71717A]">
              O cadastro é real: a conta é criada na API e aparece na lista ao salvar.
            </p>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'student', 'instructor', 'admin'] as RoleFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setRoleFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono font-bold border transition-all ${
              roleFilter === f
                ? 'bg-[#8257E5]/15 text-[#996DFF] border-[#8257E5]/40'
                : 'bg-[#181820] text-[#A1A1AA] border-[#27272A] hover:text-white'
            }`}
          >
            {f === 'all' ? 'Todos' : ROLE_LABELS[f]}
          </button>
        ))}
      </div>

      {usersError ? (
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] text-xs text-[#A1A1AA]">
          Não foi possível carregar os usuários reais: {usersError}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#121217] border border-[#27272A] text-xs text-[#A1A1AA]">
          Nenhum usuário encontrado com os critérios atuais.
        </div>
      ) : (
        <div className="rounded-2xl bg-[#121217] border border-[#27272A] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[880px]">
            <thead>
              <tr className="border-b border-[#27272A] text-[#71717A] font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Papel</th>
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4">XP / Nível</th>
                <th className="py-3 px-4">Matrículas</th>
                <th className="py-3 px-4">Submissões</th>
                <th className="py-3 px-4">Último acesso</th>
                <th className="py-3 px-4">Desde</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#27272A]/50 hover:bg-[#181820]/60">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0">
                        <div className="w-full h-full bg-[#181820] rounded-[7px] flex items-center justify-center font-mono font-black text-[11px] text-white">
                          {initialsOf(u.name)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate max-w-[220px]">{u.name}</p>
                        <p className="text-[11px] text-[#71717A] font-mono truncate max-w-[220px]">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      disabled={mutatingId === u.id}
                      onChange={(e) => onUpdateRole(u.id, e.target.value as AdminRole)}
                      className="bg-[#181820] border border-[#27272A] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#8257E5] disabled:opacity-50"
                      aria-label={`Papel de ${u.name}`}
                    >
                      <option value="student">Aluno</option>
                      <option value="instructor">Instrutor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.plan}
                      disabled={mutatingId === u.id}
                      onChange={(e) => onUpdatePlan(u.id, e.target.value as AdminPlan)}
                      className="bg-[#181820] border border-[#27272A] rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#8257E5] disabled:opacity-50"
                      aria-label={`Plano de ${u.name}`}
                    >
                      <option value="free">Explorer</option>
                      <option value="pro">Pro</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">
                    {formatNumber(u.xp)} XP · Nv. {u.level}
                    <span className="block text-[10px] text-[#71717A]">
                      sequência {u.streakDays}d · {u.badgesCount} badges
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">{u.enrollmentsCount}</td>
                  <td className="py-3 px-4 font-mono text-[#EDEDED]">{u.submissionsCount}</td>
                  <td className="py-3 px-4 text-[#A1A1AA]">{formatDateTime(u.lastActiveAt)}</td>
                  <td className="py-3 px-4 text-[#A1A1AA]">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
        <span className="font-bold text-white">Ações não oferecidas:</span> suspender/reativar
        contas e conceder XP manualmente não têm endpoint na API atual. As ações fictícias que
        existiam nesta tela (que só mudavam o estado local do navegador) foram removidas.
      </div>
    </div>
  );
};
