---
name: frontend-session-fixes
description: Use when fixing the frontend critical session/auth issues — role on register, token refresh, API base URL for Docker, server-side logout. Não use para outras mudanças de UI.
---

# Skill: frontend-session-fixes

## Objetivo

Corrigir os 4 bloqueadores do frontend (`apps/web`) apontados na análise: (1) role do instrutor ignorada no registro, (2) refresh token descartado → logout a cada 15 min, (3) API inalcançável no Docker, (4) logout sem revogação server-side.

## Regras

1. **Registro com role**: enviar `role` no body de `POST /auth/register` conforme o seletor existente (`student`|`instructor`). Do lado do cliente: mapear o enum correto da API (ver `Role` no backend). Manter a seleção visível; se a API rejeitar, mostrar erro claro.
2. **Refresh de token**: 
   - Guardar `refreshToken` (ainda localStorage nesta rodada; cookie httpOnly é Wave 3 — deixar TODO no código).
   - Envolver todos os fetchs em um helper `apiFetch` (ou minimal interceptor): se resposta 401 e existe refresh → chamar `POST /auth/refresh` com `{ refreshToken }`; em sucesso, substituir tokens em localStorage, re-executar a requisição original (1 retry); em falha → logout limpo.
   - No boot, se existir refresh e access expirado (parseJwt já existe) → tentar refresh antes de exigir login.
3. **API Base URL**: 
   - Usar `NEXT_PUBLIC_API_URL` como base única para chamadas do browser (fallback `http://localhost:3000`).
   - NÃO editar docker-compose (orquestrador adiciona a var). NÃO mexer no rewrite do next.config se ele já usa `API_URL` server-side.
4. **Logout server-side**: antes de limpar estado, chamar `POST /auth/logout` com o refresh token (fire-and-forget com timeout curto, mas sempre chamado); limpar localStorage a seguir.
5. Manter comportamento existente: AbortController anti-stale, modais, estados de loading atuais — **só os 4 fixes**, sem refatorar a página.
6. Testar por build: `pnpm --filter @plataforma/web build` deve passar (TypeScript estrito). Se houver testes (não há), manter.

## Critérios de aceite

- `page.tsx` envia `role` no payload de registro (grep `role` em registerFetch).
- Existe função de refresh com retry 401 documentada (grep `refreshToken`).
- Base de API = `NEXT_PUBLIC_API_URL` com fallback (grep `NEXT_PUBLIC_API_URL`).
- Logout chama `POST /auth/logout` (grep).
- Build do web verde.