---
name: lgpd-minimum
description: Use when implementing minimum LGPD measures — complete data export, account deletion propagating to Gitea, PII-free logs. Não use para outras mudanças.
---

# Skill: lgpd-minimum

## Objetivo

Cumprir o mínimo LGPD nesta rodada: exportação completa dos dados do titular (incluindo o código das submissões), exclusão com propagação ao Gitea, e remoção de PII dos logs.

## Regras

1. **Export completo** (`users.service.ts` — `exportUserData`):
   - Incluir tudo que identifica ou pertence ao titular: profile, enrollments, submissions (com `codeSnapshot`, resultados de testes, notas), chat de IA (`aiChatMessage`), incentivos (XP/badges/streaks).
   - Formato JSON estruturado com seções nomeadas e data de geração; zip opcional — manter JSON simples.
2. **Exclusão com propagação** (`deleteMyAccount` → `users.service` + `gitea.service`):
   - Após remover no Postgres (base já existe com cascatas), chamar Gitea: localizar repos do padrão da plataforma (`{slug}-{username}` ou por `giteaUserId` do User — usar o que existir; se não houver mapeamento, listar repos da org por owner==username) e **deletar repos + desativar usuário** (usuários podem ser apagados via API Gitea admin delete — validar; fallback: renomear com sufixo `-deleted-<hash>` e revogar acesso).
   - Tolerância: se o Gitea falhar, registrar em log estruturado (`deletionQueued`), não lançar 500 para o titular — mas marcar o user como `giteaDeletionPending` se precisar (sem mexer em schema? — **schema é do orquestrador**: se precisar de campo, registrar TODO e avisar o orquestrador).
3. **Logs sem PII**:
   - Remover e-mail de logs de conclusão (`gamification.service.ts` — `Badge awarded to ${user.email}` → userId/anon).
   - `webhooks` logs: e-mail do committer redigido (função `redactEmail` — se não existir, implementar local ou reutilizar padrão do `ai.service`).
   - Revisar `users.service`/`auth.service` para logs com e-mail; substituir por id.
4. **Não** implementar retention jobs, DPO, registro de tratamento ou consentimento nesta rodada (Wave 2) — apenas registrar TODO inline apontando para o artefato `plano-remediacao-wave1`.
5. **Não exportar** segredos/tokens de sessão (refresh tokens nunca).

## Critérios de aceite

- Export de usuário com submissões contém `codeSnapshot` (teste unitário com mock Prisma).
- `deleteMyAccount` invoca método de propagação Gitea (mock) — teste unitário verifica chamada e ordem.
- Grep: `Badge awarded to ${user.email}` removido; `author.email` em logs redigido.
- Nenhum `console.log`/logger com `email` novo adicionado.