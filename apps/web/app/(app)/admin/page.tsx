'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, API_BASE } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  AdminCourseRow,
  AdminHealth,
  AdminMetrics,
  AdminPlan,
  AdminRole,
  AdminTab,
  AdminUsersPage,
} from './types';
import { initialsOf } from './utils';
import { AdminSidebar } from './components/AdminSidebar';
import { AdminTopbar } from './components/AdminTopbar';
import { AdminOverviewTab } from './components/AdminOverviewTab';
import { AdminFunnelTab } from './components/AdminFunnelTab';
import { AdminUsersTab } from './components/AdminUsersTab';
import { AdminInstructorsTab } from './components/AdminInstructorsTab';
import { AdminCoursesTab } from './components/AdminCoursesTab';
import { AdminSystemHealthTab } from './components/AdminSystemHealthTab';
import { AdminAuditLogsTab } from './components/AdminAuditLogsTab';

// B40/A4 (Sprint 13) — painel admin ligado à API REAL.
// Antes esta página era uma simulação completa no navegador: usuários,
// métricas de "cluster", cursos, instrutores, logs e certificados
// inventados em data/mockData.ts, persistidos em localStorage, com
// ações que só mudavam estado local e exibiam sucesso falso. Agora:
//  - métricas   -> GET /admin/metrics               (real)
//  - usuários   -> GET /admin/users (busca no servidor, real)
//  - instrutores-> GET /admin/users?role=instructor (real)
//  - cursos     -> GET /courses                     (real)
//  - saúde      -> GET /admin/health                (real)
//  - papel/plano-> PATCH /admin/users/:id/role|plan (real)
//  - instrutor  -> POST /admin/instructors          (real)
//  - funil      -> GET /analytics/funnel (AdminFunnelTab, desde a
//                  Sprint 8 — única aba que já era real)
// Logs de auditoria e certificados não têm endpoint de listagem: a aba
// correspondente declara a indisponibilidade em vez de fabricar dados.
// mockData.ts foi deletado; nenhum localStorage é lido ou escrito aqui.

type Toast = { message: string; type: 'success' | 'error' } | null;

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.message || `${fallback} (HTTP ${res.status})`;
}

export default function AdminDashboardPage() {
  const { user: sessionUser } = useAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toast, setToast] = useState<Toast>(null);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState<AdminUsersPage | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [instructorsPage, setInstructorsPage] = useState<AdminUsersPage | null>(null);
  const [instructorsError, setInstructorsError] = useState<string | null>(null);
  const [courses, setCourses] = useState<AdminCourseRow[]>([]);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4500);
  }, []);

  const loadUsers = useCallback(async (search: string) => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await apiFetch(`${API_BASE}/admin/users?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      if (!res.ok) {
        setUsersError(await readError(res, 'Erro ao listar usuários'));
        return;
      }
      setUsersError(null);
      setUsersPage(await res.json());
    } catch {
      setUsersError('Erro de conexão com o servidor.');
    }
  }, []);

  const loadInstructors = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/admin/users?role=instructor&page=1&limit=100`);
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      if (!res.ok) {
        setInstructorsError(await readError(res, 'Erro ao listar instrutores'));
        return;
      }
      setInstructorsError(null);
      setInstructorsPage(await res.json());
    } catch {
      setInstructorsError('Erro de conexão com o servidor.');
    }
  }, []);

  const loadAll = useCallback(async () => {
    const [metricsRes, healthRes, coursesRes] = await Promise.allSettled([
      apiFetch(`${API_BASE}/admin/metrics`),
      apiFetch(`${API_BASE}/admin/health`),
      apiFetch(`${API_BASE}/courses`),
    ]);

    if (metricsRes.status === 'fulfilled') {
      const res = metricsRes.value;
      if (res.status === 401 || res.status === 403) setAuthError(true);
      else if (!res.ok) setMetricsError(`A API respondeu ${res.status}.`);
      else {
        setMetricsError(null);
        setMetrics(await res.json());
      }
    } else {
      setMetricsError('Erro de conexão com o servidor.');
    }

    if (healthRes.status === 'fulfilled') {
      const res = healthRes.value;
      if (res.status === 401 || res.status === 403) setAuthError(true);
      else if (!res.ok) setHealthError(`A API respondeu ${res.status}.`);
      else {
        setHealthError(null);
        setHealth(await res.json());
      }
    } else {
      setHealthError('Erro de conexão com o servidor.');
    }

    if (coursesRes.status === 'fulfilled') {
      const res = coursesRes.value;
      if (res.status === 401 || res.status === 403) setAuthError(true);
      else if (!res.ok) setCoursesError(`A API respondeu ${res.status}.`);
      else {
        const data = await res.json().catch(() => []);
        setCoursesError(null);
        setCourses(Array.isArray(data) ? data : []);
      }
    } else {
      setCoursesError('Erro de conexão com o servidor.');
    }

    await Promise.all([loadUsers(''), loadInstructors()]);
  }, [loadInstructors, loadUsers]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Busca de usuários com debounce — o filtro é aplicado no servidor.
  useEffect(() => {
    const t = setTimeout(() => {
      void loadUsers(globalSearch);
    }, 350);
    return () => clearTimeout(t);
  }, [globalSearch, loadUsers]);

  const handleUpdateRole = useCallback(
    async (userId: string, role: AdminRole) => {
      setMutatingId(userId);
      try {
        const res = await apiFetch(`${API_BASE}/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        if (!res.ok) {
          showToast(await readError(res, 'Não foi possível alterar o papel'), 'error');
          return;
        }
        showToast('Papel do usuário atualizado na API.');
        await Promise.all([loadUsers(globalSearch), loadInstructors()]);
      } catch {
        showToast('Erro de conexão ao alterar o papel.', 'error');
      } finally {
        setMutatingId(null);
      }
    },
    [globalSearch, loadInstructors, loadUsers, showToast],
  );

  const handleUpdatePlan = useCallback(
    async (userId: string, plan: AdminPlan) => {
      setMutatingId(userId);
      try {
        const res = await apiFetch(`${API_BASE}/admin/users/${userId}/plan`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        if (!res.ok) {
          showToast(await readError(res, 'Não foi possível alterar o plano'), 'error');
          return;
        }
        showToast('Plano do usuário atualizado na API.');
        await loadUsers(globalSearch);
      } catch {
        showToast('Erro de conexão ao alterar o plano.', 'error');
      } finally {
        setMutatingId(null);
      }
    },
    [globalSearch, loadUsers, showToast],
  );

  const handleCreateInstructor = useCallback(
    async (data: { name: string; email: string; password?: string }): Promise<boolean> => {
      try {
        const res = await apiFetch(`${API_BASE}/admin/instructors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          showToast(await readError(res, 'Não foi possível cadastrar o instrutor'), 'error');
          return false;
        }
        showToast(`Instrutor ${data.name} cadastrado na API.`);
        await Promise.all([loadUsers(globalSearch), loadInstructors()]);
        return true;
      } catch {
        showToast('Erro de conexão ao cadastrar o instrutor.', 'error');
        return false;
      }
    },
    [globalSearch, loadInstructors, loadUsers, showToast],
  );

  if (authError) {
    return (
      <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#121217] border border-[#27272A] rounded-2xl p-8 space-y-4">
          <h1 className="text-xl font-bold text-white font-heading">
            Área restrita a administradores
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            A API recusou o acesso aos dados administrativos nesta sessão (401/403). Entre com uma
            conta de administrador para ver os dados reais da plataforma — nenhum número de exemplo
            é exibido aqui.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  const users = usersPage?.data ?? [];
  const instructors = instructorsPage?.data ?? [];

  return (
    <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex antialiased selection:bg-[#8257E5] selection:text-white">
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        usersCount={usersPage?.pagination.total ?? 0}
        coursesCount={courses.length}
        instructorsCount={instructorsPage?.pagination.total ?? 0}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 lg:ml-64 xl:ml-72 flex flex-col min-w-0">
        <AdminTopbar
          currentUserName={sessionUser?.name ?? 'Administrador'}
          currentUserEmail={sessionUser?.email ?? ''}
          currentUserInitials={sessionUser ? initialsOf(sessionUser.name) : '—'}
          healthStatus={health?.status ?? null}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {currentTab === 'overview' && (
            <AdminOverviewTab
              metrics={metrics}
              metricsError={metricsError}
              health={health}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'funnel' && <AdminFunnelTab />}

          {currentTab === 'users' && (
            <AdminUsersTab
              users={users}
              total={usersPage?.pagination.total ?? 0}
              usersError={usersError}
              mutatingId={mutatingId}
              onUpdateRole={handleUpdateRole}
              onUpdatePlan={handleUpdatePlan}
              onCreateInstructor={handleCreateInstructor}
            />
          )}

          {currentTab === 'instructors' && (
            <AdminInstructorsTab
              instructors={instructors}
              total={instructorsPage?.pagination.total ?? 0}
              instructorsError={instructorsError}
              onOpenCreateModal={() => setCurrentTab('users')}
            />
          )}

          {currentTab === 'courses' && (
            <AdminCoursesTab courses={courses} coursesError={coursesError} />
          )}

          {currentTab === 'system' && (
            <AdminSystemHealthTab
              metrics={metrics}
              metricsError={metricsError}
              health={health}
              healthError={healthError}
            />
          )}

          {currentTab === 'audit' && <AdminAuditLogsTab />}
        </main>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#121217] text-white text-xs font-semibold shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 border ${
            toast.type === 'error'
              ? 'border-[#F43F5E] shadow-[0_0_25px_rgba(244,63,94,0.35)]'
              : 'border-[#8257E5] shadow-[0_0_25px_rgba(130,87,229,0.35)]'
          }`}
          role="status"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              toast.type === 'error' ? 'bg-[#F43F5E]' : 'bg-[#04D361]'
            }`}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
