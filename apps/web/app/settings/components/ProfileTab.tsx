'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, API_BASE } from '../../lib/apiClient';

// B40/A2 (Sprint 13) — aba de perfil HONESTA.
// Antes esta tela nascia com uma persona inventada ("Augusto Galvão",
// augusto.galvao@nexuscode.dev, cargo fictício, bio/site/redes fictícios)
// e o submit simulava "Perfil público atualizado com sucesso!" via
// setTimeout, sem nenhum endpoint. Agora:
//  - identidade e progresso vêm do usuário REAL da sessão
//    (AuthContext ← GET /users/me: name, nickname, email, role,
//    careerTier, plan, xp, level, streakDays, talentVisible);
//  - a ÚNICA edição oferecida é a que tem endpoint real:
//    PATCH /users/me/talent-visibility (visibilidade no Portal de
//    Talentos), com sucesso/erro vindos da resposta da API;
//  - nome, bio, links sociais e avatar NÃO têm endpoint de atualização:
//    nada é editável nem simulado — os dados são exibidos como leitura
//    e a limitação é declarada na própria tela (padrão B37/B39).

interface ProfileTabProps {
  onNotify: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  instructor: 'Instrutor',
  admin: 'Administrador',
};

const TIER_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
};

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">{label}</span>
      <div className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-zinc-200">
        {value}
      </div>
    </div>
  );
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onNotify }) => {
  const { user, isLoading, refreshSession } = useAuth();
  const [talentVisible, setTalentVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  // Espelha o valor real da conta; só muda localmente após a API confirmar.
  useEffect(() => {
    if (user) setTalentVisible(user.talentVisible ?? false);
  }, [user]);

  if (isLoading) {
    return (
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Seu perfil</h3>
        <p className="text-xs text-zinc-400">Consultando os dados reais da sua conta…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Seu perfil</h3>
        <p className="text-xs text-zinc-400 max-w-md">
          Não foi possível identificar a sua conta nesta sessão. Entre na sua conta para ver os
          dados reais do seu perfil — nenhum dado de exemplo é exibido aqui.
        </p>
      </div>
    );
  }

  const handleToggleTalentVisibility = async (next: boolean) => {
    setIsSaving(true);
    try {
      const res = await apiFetch(`${API_BASE}/users/me/talent-visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ talentVisible: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        onNotify(
          err?.message || 'Não foi possível atualizar a visibilidade. Tente novamente.',
          'error',
        );
        return;
      }
      setTalentVisible(next);
      await refreshSession();
      onNotify(
        next
          ? 'Visibilidade no Portal de Talentos ativada.'
          : 'Visibilidade no Portal de Talentos desativada.',
      );
    } catch {
      onNotify('Erro de conexão ao atualizar a visibilidade.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Identidade real da conta */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Identidade da conta</h3>
        <p className="text-xs text-zinc-400 mb-5">
          Estes são os dados reais associados à sua sessão (GET /users/me).
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[2px] shadow-lg shadow-[#8257E5]/20 shrink-0">
            <div className="w-full h-full bg-[#181820] rounded-[14px] flex items-center justify-center text-xl font-mono font-black text-[#00E5FF]">
              {initialsOf(user.name)}
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <p className="text-base font-bold text-white font-heading">{user.name}</p>
            {user.nickname && (
              <p className="text-xs font-mono text-zinc-400">@{user.nickname}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <span className="bg-[#8257E5]/15 text-[#996DFF] border border-[#8257E5]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              {user.plan && (
                <span className="bg-zinc-500/15 text-zinc-300 border border-zinc-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                  Plano {user.plan === 'pro' ? 'Pro' : 'Explorer (grátis)'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dados da conta (somente leitura — sem endpoint de edição) */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading">Dados da conta</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Nome Completo" value={user.name} />
          <ReadOnlyField
            label="Username (@handle)"
            value={user.nickname ? `@${user.nickname}` : 'Não definido'}
          />
          <ReadOnlyField label="E-mail" value={user.email} />
          <ReadOnlyField label="Função" value={ROLE_LABELS[user.role] ?? user.role} />
          <ReadOnlyField
            label="Nível de carreira"
            value={
              user.careerTier
                ? TIER_LABELS[user.careerTier] ?? user.careerTier
                : 'Não definido'
            }
          />
          <ReadOnlyField
            label="Progresso"
            value={`${(user.xp ?? 0).toLocaleString('pt-BR')} XP · Nível ${user.level ?? 1} · Sequência de ${user.streakDays ?? 0} dia(s)`}
          />
        </div>

        <div className="bg-[#181820] border border-[#27272A] rounded-xl p-4 text-xs text-zinc-300">
          <span className="font-bold text-white">Edição de perfil ainda não disponível.</span>{' '}
          A API atual não oferece atualização de nome, foto, bio ou links sociais, por isso esses
          dados são exibidos apenas como leitura — nenhum formulário nesta tela simula uma
          alteração que não aconteceria no servidor.
        </div>
      </div>

      {/* Visibilidade no Portal de Talentos — único endpoint real de edição */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading">
          Visibilidade no Portal de Talentos
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          Controla se empresas parceiras podem encontrar o seu perfil no Portal de Talentos. Esta
          é uma preferência real da sua conta, salva no servidor
          (PATCH /users/me/talent-visibility).
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181820] border border-[#27272A] rounded-xl p-4">
          <div>
            <p className="text-xs font-bold text-white">
              {talentVisible ? 'Visível para empresas' : 'Oculto para empresas'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {talentVisible
                ? 'Seu perfil pode aparecer nas buscas do Portal de Talentos.'
                : 'Seu perfil não aparece nas buscas do Portal de Talentos.'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={talentVisible}
            aria-label="Alternar visibilidade no Portal de Talentos"
            disabled={isSaving}
            onClick={() => handleToggleTalentVisibility(!talentVisible)}
            className={`relative shrink-0 w-12 h-[26px] rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
              talentVisible ? 'bg-[#04D361]' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform ${
                talentVisible ? 'translate-x-[22px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isSaving && <p className="text-[11px] font-mono text-zinc-500">Salvando no servidor…</p>}
      </div>
    </div>
  );
};
