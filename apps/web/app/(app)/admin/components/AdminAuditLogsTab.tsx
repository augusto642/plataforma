'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

interface AiOperatorAuditEvent {
  id: string;
  adminId: string;
  action: string;
  queue: string;
  reason: string;
  status: string;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AdminAuditEvent {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  previousValue: string | null;
  newValue: string | null;
  changedFields: string[];
  createdAt: string;
}

function UnavailableCard({
  icon,
  title,
  badge,
  description,
}: {
  icon: string;
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#121217] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-white">
            <span aria-hidden="true">{icon}</span>
            <span>{title}</span>
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">{description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-zinc-300">
          {badge}
        </span>
      </div>
    </div>
  );
}

async function readEvents<T>(response: Response): Promise<T[]> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `HTTP ${response.status}`);
  }
  return response.json();
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export const AdminAuditLogsTab: React.FC = () => {
  const [events, setEvents] = useState<AiOperatorAuditEvent[]>([]);
  const [adminEvents, setAdminEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueResponse, adminResponse] = await Promise.all([
        apiFetch(`${API_BASE}/admin/ai/operator-audit`),
        apiFetch(`${API_BASE}/admin/audit`),
      ]);
      const [queueEvents, auditedChanges] = await Promise.all([
        readEvents<AiOperatorAuditEvent>(queueResponse),
        readEvents<AdminAuditEvent>(adminResponse),
      ]);
      setEvents(queueEvents);
      setAdminEvents(auditedChanges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar auditoria de IA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Auditoria &amp; Certificados</h2>
          <p className="mt-0.5 text-xs text-[#A1A1AA]">
            Ações de operação de filas são registros reais; lacunas de auditoria permanecem explícitas.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-[#3F3F46] px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-[#996DFF] disabled:opacity-50"
        >
          Atualizar
        </button>
      </div>

      <section className="rounded-2xl border border-[#27272A] bg-[#121217] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">Auditoria de controles de IA</h3>
            <p className="mt-1 text-xs text-zinc-400">Últimas 25 ações sobre filas, com motivo, resultado e horário.</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono text-emerald-300">
            API real
          </span>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            Não foi possível consultar a auditoria: {error}
          </p>
        ) : loading ? (
          <p role="status" className="text-sm text-zinc-500">Carregando registros...</p>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-[#27272A] bg-[#09090A] p-3 text-sm text-zinc-400">
            Nenhuma ação de fila foi registrada até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#27272A] font-mono uppercase tracking-wider text-[#71717A]">
                  <th className="px-3 py-3">Quando</th>
                  <th className="px-3 py-3">Fila / ação</th>
                  <th className="px-3 py-3">Motivo</th>
                  <th className="px-3 py-3">Resultado</th>
                  <th className="px-3 py-3">Administrador</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-[#27272A]/60 align-top">
                    <td className="whitespace-nowrap px-3 py-3 text-zinc-300">
                      <div>{formatTime(event.createdAt)}</div>
                      {event.completedAt && (
                        <div className="mt-1 text-[10px] text-zinc-500">
                          Concluído {formatTime(event.completedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">{event.queue}</div>
                      <div className="mt-1 font-mono text-zinc-400">{event.action}</div>
                    </td>
                    <td className="max-w-sm px-3 py-3 text-zinc-300">{event.reason}</td>
                    <td className="px-3 py-3">
                      <span className={event.status === 'succeeded' ? 'text-emerald-300' : event.status === 'failed' ? 'text-rose-300' : 'text-amber-300'}>
                        {event.status}
                      </span>
                      {event.errorCode && <div className="mt-1 font-mono text-[10px] text-rose-300">{event.errorCode}</div>}
                    </td>
                    <td className="px-3 py-3 font-mono text-zinc-400" title={event.adminId}>
                      {event.adminId.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#27272A] bg-[#121217] p-5">
        <div className="mb-4">
          <h3 className="font-bold text-white">Alterações sensíveis de usuários</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Últimas 50 mudanças administrativas auditadas na mesma transação, sem copiar conteúdo alterado.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-zinc-500">A auditoria não pôde ser carregada.</p>
        ) : loading ? (
          <p role="status" className="text-sm text-zinc-500">Carregando registros...</p>
        ) : adminEvents.length === 0 ? (
          <p className="rounded-lg border border-[#27272A] bg-[#09090A] p-3 text-sm text-zinc-400">
            Nenhuma mudança de papel ou plano foi registrada até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#27272A] font-mono uppercase tracking-wider text-[#71717A]">
                  <th className="px-3 py-3">Quando</th>
                  <th className="px-3 py-3">Ação</th>
                  <th className="px-3 py-3">Usuário</th>
                  <th className="px-3 py-3">Alteração</th>
                  <th className="px-3 py-3">Administrador</th>
                </tr>
              </thead>
              <tbody>
                {adminEvents.map((event) => (
                  <tr key={event.id} className="border-b border-[#27272A]/60 align-top">
                    <td className="whitespace-nowrap px-3 py-3 text-zinc-300">{formatTime(event.createdAt)}</td>
                    <td className="px-3 py-3 font-mono text-zinc-300">{event.action}</td>
                    <td className="px-3 py-3 font-mono text-zinc-400" title={event.targetId}>
                      {event.targetId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-3 text-zinc-300">
                      {event.previousValue && event.newValue ? (
                        <>
                          {event.previousValue} <span aria-label="para">→</span> {event.newValue}
                        </>
                      ) : (
                        event.changedFields.join(', ') || 'Sem campos detalhados'
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-zinc-400" title={event.adminId}>
                      {event.adminId.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <UnavailableCard
        icon="🧾"
        title="Outras alterações administrativas"
        badge="Não disponível"
        description="Papéis, planos, cursos, salas especializadas e controles de filas são auditados. Alterações em KMS, instrutores e outras ações administrativas ainda não entram nessa trilha."
      />

      <UnavailableCard
        icon="📜"
        title="Certificados emitidos"
        badge="Listagem não disponível"
        description="Não há endpoint de listagem ou revogação de certificados para o painel. A verificação pública consulta o registro persistido na emissão; código desconhecido retorna não encontrado."
      />
    </div>
  );
};
