'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { apiFetch, API_BASE } from '../lib/apiClient';

/**
 * Painel admin — Lote 1 / C6 (reescrito).
 *
 * Antes: rota aberta, sem auth, 100% mock em localStorage, com ações
 * falsas (suspender, +XP, cursos, desafios, certificados, auditoria,
 * Piston).
 *
 * Agora: guarda real por `role === 'admin'` no front + guarda real no
 * backend (`AdminController`: JwtAuthGuard + RolesGuard + @Roles(admin)).
 * Só existe o que a API entrega de verdade:
 *   GET   /admin/metrics      — contagens da plataforma + telemetria
 *   GET   /admin/health       — database/redis
 *   GET   /admin/users        — lista paginada, busca e filtro por papel
 *   PATCH /admin/users/:id/role — mudar papel (student/instructor/admin)
 *   POST  /admin/instructors  — criar instrutor
 *
 * NÃO existe endpoint real (e por isso NÃO existe na UI) para: suspender
 * conta (o modelo User não tem `status`), ajustar XP, CRUD de cursos,
 * desafios, certificados, logs de auditoria e cluster Piston. Essas
 * funções dependem de endpoints novos no backend (Lote 2+).
 */

type AdminRole = 'student' | 'instructor' | 'admin';

interface AdminMetrics {
  timestamp: string;
  system: {
    uptimeSeconds: number;
    memory: { rssMb: number; heapTotalMb: number; heapUsedMb: number; externalMb: number };
    nodeVersion: string;
    platform: string;
    httpRequestsTotal: number;
    httpErrorsTotal: number;
    avgLatencyMs: number;
    activeSubmissions: number;
  };
  platform: {
    users: { total: number; students: number; instructors: number; admins: number; activeLast24h: number };
    courses: { total: number; publicLibrary: number; totalEnrollments: number };
    activities: { total: number };
    submissions: { total: number; passed: number; failed: number; pendingOrRunning: number; passRate: number };
  };
  cache: { status: 'connected' | 'degraded' | 'unavailable'; pingLatencyMs?: number };
}

interface AdminHealth {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: { database: 'up' | 'down'; redis: 'up' | 'down' };
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  xp: number;
  level: number;
  streakDays: number;
  createdAt: string;
  lastActiveAt: string | null;
  enrollmentsCount: number;
  submissionsCount: number;
  instructedCoursesCount: number;
  badgesCount: number;
}

interface UsersResponse {
  data: AdminUserRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const ROLES: AdminRole[] = ['student', 'instructor', 'admin'];

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const msg = (data as { message?: string | string[] }).message;
    return Array.isArray(msg) ? msg.join('; ') : msg || `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [tab, setTab] = useState<'overview' | 'users'>('overview');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | AdminRole>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Criar instrutor
  const [instName, setInstName] = useState('');
  const [instEmail, setInstEmail] = useState('');
  const [instPassword, setInstPassword] = useState('');
  const [creatingInstructor, setCreatingInstructor] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Mudar papel
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const isAdmin = !!user && user.role === 'admin';

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, healthRes] = await Promise.all([
        apiFetch(`${API_BASE}/admin/metrics`),
        apiFetch(`${API_BASE}/admin/health`),
      ]);
      if (metricsRes.status === 401 || metricsRes.status === 403) {
        setError('Acesso negado pelo servidor. Esta área exige papel de administrador.');
        return;
      }
      if (!metricsRes.ok) {
        setError(`Falha ao carregar métricas: ${await readError(metricsRes)}`);
        return;
      }
      if (!healthRes.ok) {
        setError(`Falha ao carregar saúde do sistema: ${await readError(healthRes)}`);
        return;
      }
      setMetrics((await metricsRes.json()) as AdminMetrics);
      setHealth((await healthRes.json()) as AdminHealth);
    } catch {
      setError('Não foi possível conectar ao servidor para carregar o painel admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (page: number, q: string, role: '' | AdminRole) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q.trim()) params.set('search', q.trim());
      if (role) params.set('role', role);
      const res = await apiFetch(`${API_BASE}/admin/users?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        setError('Acesso negado pelo servidor. Esta área exige papel de administrador.');
        return;
      }
      if (!res.ok) {
        setError(`Falha ao carregar usuários: ${await readError(res)}`);
        return;
      }
      const body = (await res.json()) as UsersResponse;
      setUsers(body.data);
      setPagination(body.pagination);
    } catch {
      setError('Não foi possível conectar ao servidor para carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Guarda: só carrega dados reais quando a sessão é de admin.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') return;
    if (tab === 'overview') void loadOverview();
    else void loadUsers(pagination.page, search, roleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, tab]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((current) => (current === msg ? null : current)), 4000);
  };

  const handleChangeRole = async (userId: string, newRole: AdminRole) => {
    setChangingRoleId(userId);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        setError(`Falha ao mudar papel: ${await readError(res)}`);
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast(`Papel atualizado para "${newRole}".`);
    } catch {
      setError('Não foi possível conectar ao servidor para mudar o papel.');
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInstructor(true);
    setError(null);
    setGeneratedPassword(null);
    try {
      const body: { name: string; email: string; password?: string } = {
        name: instName.trim(),
        email: instEmail.trim().toLowerCase(),
      };
      // Senha opcional: sem ela o backend gera uma e a devolve uma única vez.
      if (instPassword) body.password = instPassword;
      const res = await apiFetch(`${API_BASE}/admin/instructors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(`Falha ao criar instrutor: ${await readError(res)}`);
        return;
      }
      const created = (await res.json()) as { generatedPassword?: string; email: string };
      if (created.generatedPassword) {
        // Exibida uma única vez: o backend não a guarda em texto claro.
        setGeneratedPassword(created.generatedPassword);
      }
      setInstName('');
      setInstEmail('');
      setInstPassword('');
      showToast(`Instrutor ${created.email} criado com sucesso.`);
      void loadUsers(1, search, roleFilter);
    } catch {
      setError('Não foi possível conectar ao servidor para criar o instrutor.');
    } finally {
      setCreatingInstructor(false);
    }
  };

  // --- Guarda de acesso (front) ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex items-center justify-center">
        <p className="text-sm text-zinc-400">Verificando sessão…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex items-center justify-center">
        <p className="text-sm text-zinc-400">Redirecionando para o login…</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#121214] border border-[#27272A] rounded-2xl p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Acesso restrito</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Esta área é exclusiva para administradores. Sua conta está autenticada como{' '}
            <strong className="text-zinc-200">{user.role}</strong>.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-semibold"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    );
  }

  const usersCount = metrics?.platform.users;
  const submissions = metrics?.platform.submissions;

  return (
    <div className="min-h-screen bg-[#09090A] text-[#EDEDED] flex flex-col antialiased">
      <header className="border-b border-[#27272A] px-4 md:px-8 py-4 flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-bold text-white">Painel Admin</h1>
        <span className="text-xs text-zinc-500">logado como {user.name} ({user.email})</span>
        <nav className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'overview' ? 'bg-[#8257E5] text-white' : 'bg-[#18181B] text-zinc-300 border border-[#27272A]'}`}
          >
            Visão geral
          </button>
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === 'users' ? 'bg-[#8257E5] text-white' : 'bg-[#18181B] text-zinc-300 border border-[#27272A]'}`}
          >
            Usuários
          </button>
        </nav>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}
        {loading && <p className="text-sm text-zinc-400">Carregando dados reais da API…</p>}

        {tab === 'overview' && metrics && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-4">
                <p className="text-xs text-zinc-500">Usuários totais</p>
                <p className="text-2xl font-bold text-white">{usersCount?.total ?? '—'}</p>
                <p className="text-xs text-zinc-500">
                  {usersCount?.students ?? 0} alunos · {usersCount?.instructors ?? 0} instrutores ·{' '}
                  {usersCount?.admins ?? 0} admins
                </p>
              </div>
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-4">
                <p className="text-xs text-zinc-500">Ativos (24h)</p>
                <p className="text-2xl font-bold text-white">{usersCount?.activeLast24h ?? '—'}</p>
                <p className="text-xs text-zinc-500">usuários com atividade recente</p>
              </div>
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-4">
                <p className="text-xs text-zinc-500">Submissões</p>
                <p className="text-2xl font-bold text-white">{submissions?.total ?? '—'}</p>
                <p className="text-xs text-zinc-500">
                  {submissions?.passed ?? 0} aprovadas · {submissions?.failed ?? 0} reprovadas ·{' '}
                  {submissions?.pendingOrRunning ?? 0} em andamento
                </p>
              </div>
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-4">
                <p className="text-xs text-zinc-500">Taxa de aprovação</p>
                <p className="text-2xl font-bold text-white">{submissions?.passRate ?? '—'}%</p>
                <p className="text-xs text-zinc-500">
                  {metrics.platform.courses.total} cursos · {metrics.platform.courses.totalEnrollments} matrículas
                </p>
              </div>
            </section>

            <section className="bg-[#121214] border border-[#27272A] rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-bold text-white">Saúde do sistema</h2>
              {health ? (
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>
                    Status: <strong>{health.status === 'healthy' ? 'saudável' : 'degradado'}</strong>
                  </li>
                  <li>Banco de dados: {health.services.database === 'up' ? 'online' : 'fora do ar'}</li>
                  <li>Cache (Redis): {health.services.redis === 'up' ? 'online' : 'fora do ar'}</li>
                  <li>Uptime da API: {Math.floor(health.uptime / 60)} min</li>
                  <li>Cache da API: {metrics.cache.status} (ping {metrics.cache.pingLatencyMs ?? '?'} ms)</li>
                  <li>
                    API: Node {metrics.system.nodeVersion} · {metrics.system.platform} ·{' '}
                    {metrics.system.httpRequestsTotal} requisições · {metrics.system.httpErrorsTotal} erros ·{' '}
                    latência média {metrics.system.avgLatencyMs} ms
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">Saúde do sistema indisponível.</p>
              )}
              <p className="text-xs text-zinc-500">Métricas de {new Date(metrics.timestamp).toLocaleString('pt-BR')}.</p>
              <button
                type="button"
                onClick={() => void loadOverview()}
                className="px-4 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-sm font-semibold text-zinc-200"
              >
                Atualizar
              </button>
            </section>
          </>
        )}

        {tab === 'users' && (
          <>
            <section className="bg-[#121214] border border-[#27272A] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white">Criar instrutor</h2>
              <form onSubmit={handleCreateInstructor} className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Nome
                  <input
                    type="text"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Nome do instrutor"
                    className="h-10 px-3 rounded-xl bg-[#18181B] border border-[#27272A] text-sm text-white placeholder:text-zinc-600 focus:border-[#8257E5] focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  E-mail institucional
                  <input
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    required
                    placeholder="instrutor@exemplo.com"
                    className="h-10 px-3 rounded-xl bg-[#18181B] border border-[#27272A] text-sm text-white placeholder:text-zinc-600 focus:border-[#8257E5] focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Senha inicial (opcional — sem ela, o servidor gera uma)
                  <input
                    type="password"
                    value={instPassword}
                    onChange={(e) => setInstPassword(e.target.value)}
                    minLength={8}
                    placeholder="mín. 8 caracteres"
                    className="h-10 px-3 rounded-xl bg-[#18181B] border border-[#27272A] text-sm text-white placeholder:text-zinc-600 focus:border-[#8257E5] focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={creatingInstructor}
                  className="h-10 px-5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {creatingInstructor ? 'Criando…' : 'Criar instrutor'}
                </button>
              </form>
              {generatedPassword && (
                <p className="text-sm text-amber-300">
                  Senha gerada pelo servidor (anote agora — ela não será exibida novamente):{' '}
                  <code className="font-mono bg-black/40 px-2 py-1 rounded">{generatedPassword}</code>
                </p>
              )}
            </section>

            <section className="bg-[#121214] border border-[#27272A] rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white">Usuários ({pagination.total})</h2>
              <form
                className="flex flex-wrap gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(searchInput);
                  setPagination((p) => ({ ...p, page: 1 }));
                  void loadUsers(1, searchInput, roleFilter);
                }}
              >
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className="h-10 px-3 rounded-xl bg-[#18181B] border border-[#27272A] text-sm text-white placeholder:text-zinc-600 focus:border-[#8257E5] focus:outline-none"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    const next = e.target.value as '' | AdminRole;
                    setRoleFilter(next);
                    void loadUsers(1, search, next);
                  }}
                  className="h-10 px-3 rounded-xl bg-[#18181B] border border-[#27272A] text-sm text-white focus:border-[#8257E5] focus:outline-none"
                >
                  <option value="">Todos os papéis</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#18181B] border border-[#27272A] text-sm font-semibold text-zinc-200"
                >
                  Buscar
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 border-b border-[#27272A]">
                      <th className="py-2 pr-3">Nome</th>
                      <th className="py-2 pr-3">E-mail</th>
                      <th className="py-2 pr-3">Papel</th>
                      <th className="py-2 pr-3">XP / Nível</th>
                      <th className="py-2 pr-3">Submissões</th>
                      <th className="py-2">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[#1F1F23] text-zinc-200">
                        <td className="py-2 pr-3">{u.name}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{u.email}</td>
                        <td className="py-2 pr-3">
                          <select
                            value={u.role}
                            disabled={changingRoleId === u.id || u.id === user.id}
                            title={u.id === user.id ? 'Você não pode mudar o próprio papel por aqui' : undefined}
                            onChange={(e) => void handleChangeRole(u.id, e.target.value as AdminRole)}
                            className="h-9 px-2 rounded-lg bg-[#18181B] border border-[#27272A] text-sm text-white disabled:opacity-50"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          {u.xp} XP · nv. {u.level}
                        </td>
                        <td className="py-2 pr-3">{u.submissionsCount}</td>
                        <td className="py-2">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="py-4 text-zinc-500">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => void loadUsers(pagination.page - 1, search, roleFilter)}
                  className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] disabled:opacity-50"
                >
                  ← Anterior
                </button>
                <span>
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => void loadUsers(pagination.page + 1, search, roleFilter)}
                  className="px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] disabled:opacity-50"
                >
                  Próxima →
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#121217] border border-[#8257E5] text-white text-xs font-semibold shadow-[0_0_25px_rgba(130,87,229,0.35)]">
          {toast}
        </div>
      )}
    </div>
  );
}
