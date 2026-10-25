'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getOrgDashboard, type OrgDashboard } from '../../../lib/talent';

/**
 * Fase 4 premium (desenho §5.2) — dashboard de equipe da organização.
 * Enabler técnico B2B apenas: gestão de licenças e progresso da equipe.
 * Sem SLA, sem processo de vendas. O dashboard mostra nomes e progresso
 * dos membros para quem administra a equipe — e-mails não são exibidos.
 */
export default function OrganizacaoPage() {
  const params = useParams();
  const orgId = String(params?.id ?? '');
  const { user, isLoading } = useAuth();
  const [dashboard, setDashboard] = useState<OrgDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setDashboard(await getOrgDashboard(orgId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isLoading, orgId]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">
          Entre na sua conta para ver o dashboard da organização.
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-red-400">
          {error ?? 'Organização não encontrada.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-bold">{dashboard.organization.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Licenças: {dashboard.seatsUsed}/{dashboard.organization.seats} em uso ·{' '}
          {dashboard.seatsAvailable} disponíveis
        </p>
        <h2 className="mt-8 text-lg font-semibold">Equipe</h2>
        {dashboard.members.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nenhum membro ainda.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {dashboard.members.map((member) => (
              <li key={member.userId} className="rounded-lg border border-zinc-800 p-4">
                <strong>{member.name}</strong>
                <span className="text-sm text-zinc-400"> · {member.role}</span>
                <p className="mt-1 text-sm text-zinc-400">
                  Nível de carreira: {member.careerTier} · XP: {member.xp} · Nível: {member.level} ·{' '}
                  Matrículas: {member.enrollmentsCount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
