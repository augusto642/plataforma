'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { MaterialIcon } from './MaterialIcon';

interface StudentHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function StudentHeader({
  title = 'Nexus Code',
  subtitle,
  actions,
}: StudentHeaderProps) {
  const { user } = useAuth();
  const { toggleMobileOpen, toggleCollapsed, isCollapsed } = useSidebar();

  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomProfile = () => {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_student_custom_profile') : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.avatarUrl) setCustomAvatar(parsed.avatarUrl);
          if (parsed.name) setCustomName(parsed.name);
        } else {
          // Preset padrão de avatar com foto
          setCustomAvatar('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80');
        }
      } catch {}
    };

    loadCustomProfile();
    window.addEventListener('nexus_profile_updated', loadCustomProfile);
    window.addEventListener('storage', loadCustomProfile);
    return () => {
      window.removeEventListener('nexus_profile_updated', loadCustomProfile);
      window.removeEventListener('storage', loadCustomProfile);
    };
  }, []);

  const displayName = user?.name || customName || 'Aluno Dev';
  const displayAvatar = customAvatar;

  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'AL';

  const userXp = typeof user?.xp === 'number' ? user.xp : 0;
  const userStreak = typeof user?.streakDays === 'number' ? user.streakDays : 0;
  const userLevel = typeof user?.level === 'number' ? user.level : Math.max(1, Math.floor(userXp / 200) + 1);

  return (
    <header className="h-16 border-b border-[#1C2338] bg-[#07090E] px-5 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-all duration-300">
      {/* Lado Esquerdo: Mobile Menu Toggle / Desktop Retrair Toggle & Título/Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Toggle no Mobile */}
        <button
          type="button"
          onClick={toggleMobileOpen}
          className="md:hidden p-2 rounded-lg bg-[#121624] border border-[#1C2338] text-[#94A3B8] hover:text-white transition-colors"
          aria-label="Abrir menu de navegação"
        >
          <MaterialIcon name="menu" className="text-xl" />
        </button>

        {/* Toggle Rápido no Desktop quando retraído */}
        {isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:flex p-1.5 rounded-lg bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] text-[#94A3B8] hover:text-white transition-colors"
            title="Expandir menu lateral"
            aria-label="Expandir menu lateral"
          >
            <MaterialIcon name="menu_open" className="text-lg text-[#8257E5]" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className="font-brand font-bold text-sm text-white">{title}</span>
            {subtitle && (
              <>
                <span className="text-[#64748B] text-xs">•</span>
                <span className="text-xs text-[#94A3B8] font-mono">{subtitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lado Direito: Actions, Gamificação & Acesso Oficial ao Perfil */}
      <div className="flex items-center gap-3">
        {actions}

        {/* Streak Pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121624] border border-[#FFA116]/40 text-[#FFA116] text-xs font-mono font-bold"
          title={`${userStreak} dias de ofensiva`}
        >
          <MaterialIcon name="local_fire_department" className="text-[16px] animate-pulse" />
          <span>{userStreak} {userStreak === 1 ? 'dia' : 'dias'}</span>
        </div>

        {/* XP Pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121624] border border-[#8257E5]/40 text-[#A379FF] text-xs font-mono font-bold"
          title={`${userXp.toLocaleString('pt-BR')} Pontos de Experiência`}
        >
          <MaterialIcon name="bolt" className="text-[16px]" />
          <span>{userXp.toLocaleString('pt-BR')} XP</span>
        </div>

        {/* ACESSO OFICIAL E ÚNICO AO PERFIL (FOTO + NOME + NÍVEL) */}
        <Link
          href="/profile"
          className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5]/50 transition-all group shrink-0 shadow-sm"
          title={`Ver perfil e portfólio de ${displayName}`}
        >
          {/* Avatar com Foto do Aluno */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0 group-hover:shadow-[0_0_12px_rgba(130,87,229,0.4)] transition-all">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#07080C] flex items-center justify-center text-xs font-mono font-bold text-white">
                {userInitials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#04D361] border border-[#07080C]" />
          </div>

          {/* Nome e Nível do Aluno */}
          <div className="hidden sm:flex flex-col text-left min-w-0">
            <span className="text-xs font-bold text-white group-hover:text-[#A379FF] transition-colors truncate max-w-[130px]">
              {displayName}
            </span>
            <span className="text-[10px] font-mono text-[#94A3B8] leading-tight">
              Nv. {userLevel} • {user?.plan === 'pro' || user?.plan === 'career' ? 'PRO' : 'Aluno'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
