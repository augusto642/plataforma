'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, apiClient, getStoredToken, setTokens, clearTokens, refreshAuthToken, API_BASE } from '../lib/apiClient';
import { parseJwt } from '../lib/jwt';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (dto: { email: string; name: string; password: string; role?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (activeToken?: string | null): Promise<User | null> => {
    try {
      const res = await apiFetch(`${API_BASE}/users/me`);
      if (res.ok) {
        const data = await res.json();
        return data as User;
      }
    } catch {
      // Backend pode não estar alcançável ou sessão inválida
    }

    // Fallback: tentar decodificar do JWT se a rota me falhar mas o token for válido
    const tok = activeToken || getStoredToken();
    if (tok) {
      const decoded = parseJwt(tok);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
        return {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          role: decoded.role,
        };
      }
    }

    // Fallback de contingência caso haja sessão local gravada
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_session');
        if (stored) {
          return JSON.parse(stored) as User;
        }
      } catch {}
    }

    return null;
  }, []);

  const refreshSession = useCallback(async () => {
    const existingToken = getStoredToken();
    if (existingToken) {
      setToken(existingToken);
      const profile = await fetchCurrentUser(existingToken);
      if (profile) {
        setUser(profile);
        setIsLoading(false);
        return;
      }
    }

    // Tentar refresh token caso access token expirou
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      setToken(refreshed);
      const profile = await fetchCurrentUser(refreshed);
      if (profile) {
        setUser(profile);
      }
    } else {
      setUser(null);
      setToken(null);
    }
    setIsLoading(false);
  }, [fetchCurrentUser]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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

      if (data.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        setToken(data.accessToken);
      }

      const loggedUser: User = {
        id: data.user?.id || 'user-id',
        name: data.user?.name || email.split('@')[0],
        email: data.user?.email || email,
        role: data.user?.role || 'student',
      };

      setUser(loggedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_session', JSON.stringify(loggedUser));
      }

      // Buscar perfil completo atualizado
      fetchCurrentUser(data.accessToken).then((fullProfile) => {
        if (fullProfile) setUser(fullProfile);
      });

      setIsLoading(false);
      return { success: true };
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

      if (data.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        setToken(data.accessToken);
      }

      const registeredUser: User = {
        id: data.user?.id || 'user-id',
        name: data.user?.name || dto.name,
        email: data.user?.email || dto.email,
        role: (data.user?.role || dto.role || 'student') as any,
      };

      setUser(registeredUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_session', JSON.stringify(registeredUser));
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Erro ao conectar ao servidor.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
    } catch {
      // best-effort
    }
    clearTokens();
    setUser(null);
    setToken(null);
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
