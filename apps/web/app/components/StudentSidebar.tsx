'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { MaterialIcon } from './MaterialIcon';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  exact?: boolean;
  altHref?: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function StudentSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const {
    isCollapsed,
    toggleCollapsed,
    isMobileOpen,
    closeMobile,
  } = useSidebar();

  const [customAvatar, setCustomAvatar] = React.useState<string | null>(null);
  const [customName, setCustomName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadCustomProfile = () => {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_student_custom_profile') : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.avatarUrl) setCustomAvatar(parsed.avatarUrl);
          if (parsed.name) setCustomName(parsed.name);
        } else {
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

  const displayName = user?.name || customName || 'Desenvolvedor';
  const displayAvatar = customAvatar;

  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'AL';

  const userXp = typeof user?.xp === 'number' ? user.xp : 0;
  const userLevel = typeof user?.level === 'number' ? user.level : Math.max(1, Math.floor(userXp / 200) + 1);

  const navItems: NavGroup[] = [
    {
      group: 'Jornada Técnica',
      items: [
        {
          name: 'Visão Geral',
          href: '/dashboard',
          icon: 'space_dashboard',
          exact: true,
        },
        {
          name: 'Desafios de Código',
          href: '/desafios',
          altHref: '/ide',
          icon: 'terminal',
          badge: '+XP',
          badgeColor: 'bg-[#00B37E]/15 text-[#04D361]',
        },
        {
          name: 'Catálogo de Cursos',
          href: '/courses',
          icon: 'grid_view',
        },
        {
          name: 'Trilha Inteligente',
          href: '/trilha/sugerida',
          icon: 'auto_awesome',
        },
        {
          name: 'Simulador de Entrevista',
          href: '/entrevista',
          icon: 'record_voice_over',
        },
      ],
    },
    {
      group: 'Evolução & Carreira',
      items: [
        {
          name: 'Ranking & Ligas',
          href: '/leaderboard',
          icon: 'emoji_events',
        },
        {
          name: 'Configurações',
          href: '/settings',
          icon: 'settings',
        },
      ],
    },
  ];

  const isItemActive = (href: string, altHref?: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    if (pathname.startsWith(href)) return true;
    if (altHref && pathname.startsWith(altHref)) return true;
    return false;
  };

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Lateral com Suporte a Retrair */}
      <aside
        className={`border-r border-[#1C2133] bg-[#0C0E15] flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-4 overflow-y-auto overflow-x-hidden">
          {/* Topo Brand: The Nexus Loop & Botão de Retrair */}
          <div
            className={`h-16 flex items-center border-b border-[#1C2338] transition-all duration-300 ${
              isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'
            }`}
          >
            <Link
              href="/"
              className={`flex items-center gap-2.5 group ${isCollapsed ? 'justify-center' : ''}`}
              title="Nexus Code - Início"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#8257E5]/35 to-[#00E5FF]/25 border border-[#8257E5]/50 shadow-[0_0_16px_rgba(130,87,229,0.4)] shrink-0 group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 32 32" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,229,255,0.75)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 8L4 16L9 24" stroke="url(#sidebarPurple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 8L23 24" stroke="url(#sidebarBeam)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M23 8L28 16L23 24" stroke="url(#sidebarCyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
                  <defs>
                    <linearGradient id="sidebarPurple" x1="4" y1="8" x2="9" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A379FF" />
                      <stop offset="1" stopColor="#8257E5" />
                    </linearGradient>
                    <linearGradient id="sidebarBeam" x1="9" y1="8" x2="23" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8257E5" />
                      <stop offset="0.5" stopColor="#00E5FF" />
                      <stop offset="1" stopColor="#A379FF" />
                    </linearGradient>
                    <linearGradient id="sidebarCyan" x1="28" y1="8" x2="23" y2="24" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00E5FF" />
                      <stop offset="1" stopColor="#00B4D8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {!isCollapsed && (
                <span className="font-brand font-black text-lg tracking-tight text-white whitespace-nowrap">
                  NEXUS<span className="text-[#8257E5]">CODE</span>
                </span>
              )}
            </Link>

            {/* Botão de Retrair/Expandir (Desktop) */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className={`hidden md:flex items-center justify-center rounded-lg bg-[#121624] hover:bg-[#1C2338] border border-[#1C2338] hover:border-[#8257E5]/50 text-[#94A3B8] hover:text-white transition-all cursor-pointer ${
                isCollapsed ? 'mt-2 w-8 h-8' : 'w-7 h-7'
              }`}
              title={isCollapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
            >
              <MaterialIcon
                name={isCollapsed ? 'last_page' : 'first_page'}
                className="text-base"
              />
            </button>

            {/* Fechar no Mobile */}
            <button
              type="button"
              onClick={closeMobile}
              className="md:hidden text-[#94A3B8] hover:text-white p-1"
              aria-label="Fechar menu"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>

          {/* Card do Usuário Autenticado */}
          <div className={isCollapsed ? 'px-2' : 'px-4'}>
            {isCollapsed ? (
              <div className="flex flex-col items-center py-2">
                <Link
                  href="/profile"
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0 group overflow-hidden"
                  title={`${displayName} • Nível ${userLevel}`}
                >
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="w-full h-full rounded-[10px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[10px] bg-[#07090E] flex items-center justify-center text-xs font-mono font-bold text-white group-hover:bg-[#121624] transition-colors">
                      {userInitials}
                    </div>
                  )}
                </Link>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-[#121624] border border-[#1C2338] transition-colors hover:border-[#8257E5]/50">
                <Link href="/profile" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[1.5px] shrink-0 group-hover:shadow-[0_0_12px_rgba(130,87,229,0.3)] transition-all overflow-hidden">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="w-full h-full rounded-[10px] object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[10px] bg-[#07090E] flex items-center justify-center text-xs font-mono font-bold text-white group-hover:bg-[#121624] transition-colors">
                        {userInitials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span className="truncate group-hover:text-[#A379FF] transition-colors">{displayName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#8257E5]/20 text-[#A379FF] text-[9px] font-mono font-bold shrink-0">PRO</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#94A3B8] truncate">
                      Nível {userLevel} • {userXp.toLocaleString('pt-BR')} XP
                    </div>
                    <div className="text-[10px] font-mono text-[#04D361] flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse" />
                      <span>Online • Aluno Nexus</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Navegação por Grupos */}
          <nav className={`space-y-3 text-xs font-medium ${isCollapsed ? 'px-2' : 'px-3'}`}>
            {navItems.map((group) => (
              <div key={group.group} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] font-bold">
                    {group.group}
                  </div>
                )}
                {group.items.map((item) => {
                  const active = isItemActive(item.href, item.altHref, item.exact);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center rounded-xl transition-all group ${
                        isCollapsed
                          ? 'justify-center p-2.5'
                          : 'justify-between px-3 py-2'
                      } ${
                        active
                          ? 'bg-[#8257E5]/15 text-[#A379FF] border border-[#8257E5]/40 font-semibold shadow-[0_0_12px_rgba(130,87,229,0.15)]'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#121624]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MaterialIcon
                          name={item.icon}
                          className={`text-[18px] shrink-0 transition-colors ${
                            active
                              ? 'text-[#A379FF]'
                              : 'text-[#94A3B8] group-hover:text-white'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Base da Sidebar: Card da Tutora & Sair */}
        <div className={`border-t border-[#1C2338] space-y-3 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/dashboard"
                className="relative w-10 h-10 rounded-xl bg-[#07090E] border border-[#1C2338] hover:border-[#8257E5] flex items-center justify-center transition-colors"
                title="Tutora Lumi (IA) • Pronta para orientar"
              >
                <Image
                  src="/images/stitch/tutor-cat.png"
                  alt="Tutora Lumi"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#04D361] border-2 border-[#0C0E15] animate-pulse" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (logout) logout();
                  else window.location.href = '/login';
                }}
                className="w-10 h-10 rounded-xl bg-[#07090E] hover:bg-[#F43F5E]/15 border border-[#1C2338] hover:border-[#F43F5E]/40 text-[#94A3B8] hover:text-[#F43F5E] flex items-center justify-center transition-colors cursor-pointer"
                title="Sair da Plataforma"
                aria-label="Sair da Plataforma"
              >
                <MaterialIcon name="logout" className="text-[18px]" />
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-[#07090E] border border-[#1C2338] space-y-2">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/images/stitch/tutor-cat.png"
                    alt="Tutora de IA"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-lg object-cover border border-[#8257E5]/50"
                  />
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Tutora Lumi (IA)</div>
                    <div className="text-[10px] font-mono text-[#04D361] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#04D361] animate-pulse" />
                      Pronta para orientar
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-tight font-mono">
                  &ldquo;Seus testes automatizados são validados em tempo real no runner.&rdquo;
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (logout) logout();
                  else window.location.href = '/login';
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#07090E] hover:bg-[#F43F5E]/15 border border-[#1C2338] hover:border-[#F43F5E]/40 text-[#94A3B8] hover:text-[#F43F5E] text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MaterialIcon name="logout" className="text-[16px] text-[#94A3B8] group-hover:text-[#F43F5E] transition-colors" />
                <span>Sair da Plataforma</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
