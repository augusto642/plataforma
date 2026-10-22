'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, API_BASE, COOKIE_AUTH, clearStoredSession, refreshAuthToken } from '../lib/apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  /** B40 (Sprint 13) — handle público real, exposto por GET /users/me. */
  nickname?: string | null;
  /** B40 (Sprint 13) — nível de carreira real, exposto por GET /users/me. */
  careerTier?: string;
  /** B37 (Sprint 11) — plano real da conta, exposto por GET /users/me (B32). */
  plan?: 'free' | 'pro';
  xp?: number;
  level?: number;
  streakDays?: number;
  talentVisible?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (dto: {
    email: string;
    name: string;
    password: string;
    role?: string;
    // B07/B09 — atribuição e diagnóstico (ver implementação)
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    diagnosticSessionToken?: string;
    // Sprint 8 — escolhas da porta fria (etapas 2–3 do /register)
    preferredTrack?: string;
    experienceLevel?: string;
    weeklyTimeCommitment?: string;
    careerGoal?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(raw: any): User | null {
  if (!raw || !raw.id) return null;
  return {
    id: raw.id,
    name: raw.name ?? String(raw.email ?? '').split('@')[0] ?? 'Usuário',
    email: raw.email ?? '',
    role: raw.role ?? 'student',
    nickname: typeof raw.nickname === 'string' ? raw.nickname : null,
    careerTier: typeof raw.careerTier === 'string' ? raw.careerTier : undefined,
    plan: raw.plan === 'pro' ? 'pro' : raw.plan === 'free' ? 'free' : undefined,
    xp: raw.xp,
    level: raw.level,
    streakDays: raw.streakDays,
    talentVisible: raw.talentVisible,
  };
}

/* B52/P5 (Sprint 16) — rotas públicas puras não disparavam o probe
   de sessão graças a uma allowlist manual (PUBLIC_PATHS) mantida
   neste arquivo. B75 (Sprint 18 · Volta 3 · TL M2) — a allowlist foi
   APOSENTADA pelos route groups: este provider só é montado pelo
   layout do grupo (app), onde toda rota é do app ou porta dele
   (login/cadastro); as rotas públicas vivem no grupo (public), sem
   provider — nenhum probe morto por visita, sem lista para manter. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const sessionProbedRef = useRef(false);

  // Fluxo cookie-only: o backend NUNCA devolve tokens no corpo. A sessão é
  // detectada via GET /users/me com credentials:'include' (401 => deslogado).
  // O contexto expõe `token` apenas como o sentinel 'cookie-auth' para
  // consumidores antigos (ex.: /ide) — nunca um JWT real.
  const token: string | null = user ? COOKIE_AUTH : null;

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await apiFetch(`${API_BASE}/users/me`);
      if (res.ok) {
        return normalizeUser(await res.json());
      }
    } catch {
      // Backend inalcançável — mantém estado atual
    }
    return null;
  }, []);

  const refreshSession = useCallback(async () => {
    let profile = await fetchCurrentUser();
    if (!profile) {
      // access_token pode ter expirado; /auth/refresh renova os cookies httpOnly
      const renewed = await refreshAuthToken();
      if (renewed) {
        profile = await fetchCurrentUser();
      }
    }
    setUser(profile);
    setIsLoading(false);
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (sessionProbedRef.current) return;
    sessionProbedRef.current = true;
    void refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.message || 'Credenciais inválidas.' };
      }

      // Corpo agora é { user } — cookies httpOnly já vieram no Set-Cookie.
      let loggedUser = normalizeUser(data.user) ?? {
        id: 'user-id',
        name: email.split('@')[0],
        email,
        role: 'student' as const,
      };
      setUser(loggedUser);

      // Perfil completo via /users/me (xp, level, streak etc.)
      const fullProfile = await fetchCurrentUser();
      if (fullProfile) {
        loggedUser = fullProfile;
        setUser(fullProfile);
      }

      setIsLoading(false);
      return { success: true, user: loggedUser };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Erro de conexão com o servidor.' };
    }
  };

  const register = async (dto: {
    email: string;
    name: string;
    password: string;
    role?: string;
    // B07 — atribuição de marketing capturada na página de registro
    // (camelCase: é o contrato do RegisterDto da API; snake_case é rejeitado
    // pelo ValidationPipe com forbidNonWhitelisted)
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    // B09 — token da sessão do quiz diagnóstico: presente quando o aluno fez
    // o quiz antes de se cadastrar; a API vincula o resultado à conta nova
    diagnosticSessionToken?: string;
    // Sprint 8 — escolhas das etapas 2–3 do /register (porta fria): a API
    // persiste o nível como careerTier; os demais campos são aceitos no
    // contrato e analisados via props do funil (ver RegisterDto)
    preferredTrack?: string;
    experienceLevel?: string;
    weeklyTimeCommitment?: string;
    careerGoal?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setIsLoading(false);
        return { success: false, error: data.message || 'Erro ao realizar cadastro.' };
      }

      // Corpo agora é { user }; sessão vive nos cookies httpOnly.
      const registeredUser = normalizeUser(data.user) ?? {
        id: 'user-id',
        name: dto.name,
        email: dto.email,
        role: (dto.role || 'student') as User['role'],
      };
      setUser(registeredUser);

      const fullProfile = await fetchCurrentUser();
      if (fullProfile) setUser(fullProfile);

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Erro ao conectar ao servidor.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Backend corta os cookies httpOnly (204 No Content).
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // best-effort
    }
    clearStoredSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
