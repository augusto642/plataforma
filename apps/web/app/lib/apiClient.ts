export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fluxo cookie-only: os tokens vivem APENAS em cookies httpOnly
 * (`access_token` / `refresh_token`) definidos pelo backend NestJS.
 * O front nunca vê nem guarda tokens — nenhuma chamada envia
 * `Authorization: Bearer` nem usa localStorage para credenciais.
 * Este sentinel é exportado para consumidores antigos que esperavam
 * um "acessor de token": ele indica apenas que a sessão é gerida por cookie.
 */
export const COOKIE_AUTH = 'cookie-auth';

/** Rotas de auth que nunca devem disparar o re-refresh automático (evita loop). */
function isAuthRoute(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

/**
 * Renova a sessão chamando POST /auth/refresh SEM body: o backend lê o
 * cookie httpOnly `refresh_token` e regrava os dois cookies.
 * Retorna true se a renovação funcionou (nova sessão no cookie).
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Single-flight: várias requests 401 simultâneas disparam UMA única chamada
// de refresh; as demais aguardam o mesmo promise e depois repetem a request.
let refreshInFlight: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAuthToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_BASE}${input.startsWith('/') ? input : `/${input}`}`;

  const headers = new Headers(init?.headers || {});
  // Nunca envia Authorization: Bearer — a autenticação é 100% via cookie httpOnly.
  headers.delete('Authorization');

  const mergedInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, mergedInit);

  // 401 em rota não-auth: tenta renovar o cookie uma vez e repete a request original.
  if (response.status === 401 && !isAuthRoute(url)) {
    const renewed = await refreshOnce();
    if (renewed) {
      response = await fetch(url, mergedInit);
    }
  }

  return response;
}

/**
 * Limpa resquícios locais de sessão antiga (não-tokens). Chamado no logout
 * para descartar caches de UI enquanto o backend corta os cookies.
 */
export function clearStoredSession() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('user_session');
    } catch {
      // storage indisponível (SSR / modo anônimo) — nada a limpar
    }
  }
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
