import { parseJwt } from './jwt';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const TOKEN_STORAGE_KEY = 'plataforma_access_token';
const REFRESH_STORAGE_KEY = 'plataforma_refresh_token';

let inMemoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        inMemoryToken = token;
        return token;
      }
    } catch {
      // localStorage indisponível (SSR ou modo anônimo restrito)
    }
  }
  return null;
}

export function getStoredRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(REFRESH_STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

export function setTokens(accessToken: string, refreshToken?: string) {
  inMemoryToken = accessToken;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
      }
    } catch {}
  }
}

export function clearTokens() {
  inMemoryToken = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_STORAGE_KEY);
      localStorage.removeItem('user_session');
    } catch {}
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

export async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken || '' }),
      credentials: 'include',
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    if (data.accessToken) {
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_BASE}${input.startsWith('/') ? input : `/${input}`}`;
  const token = getStoredToken();

  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, mergedInit);

  // Se receber 401 e não for rota de auth, tentar renovar token uma vez
  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAuthToken();
      isRefreshing = false;
      onRefreshed(newToken);

      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...mergedInit, headers });
      }
    } else {
      // Aguardar refresh em andamento
      const retryToken = await new Promise<string | null>((resolve) => {
        addRefreshSubscriber((t) => resolve(t));
      });
      if (retryToken) {
        headers.set('Authorization', `Bearer ${retryToken}`);
        response = await fetch(url, { ...mergedInit, headers });
      }
    }
  }

  return response;
}

export const apiClient = {
  get: (url: string, init?: RequestInit) => apiFetch(url, { ...init, method: 'GET' }),
  post: (url: string, body?: any, init?: RequestInit) =>
    apiFetch(url, {
      ...init,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: (url: string, body?: any, init?: RequestInit) =>
    apiFetch(url, {
      ...init,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: (url: string, body?: any, init?: RequestInit) =>
    apiFetch(url, {
      ...init,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: (url: string, init?: RequestInit) => apiFetch(url, { ...init, method: 'DELETE' }),
};
