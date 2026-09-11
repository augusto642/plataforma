---
name: webhook-hardening
description: Use when hardening the Gitea push webhook — mandatory HMAC, anti-replay, raw body, payload size, idempotent processing. Não use para outras mudanças.
---

# Skill: webhook-hardening

## Objetivo

Tornar `POST /webhooks/gitea` **fail-closed**: assinatura obrigatória, anti-replay, tamanho de payload e idempotência robusta — seguindo o modelo Standard Webhooks (assinatura + timestamp + delivery ID) e OWASP.

## Regras

1. **HMAC obrigatório**: se `GITEA_WEBHOOK_SECRET` não estiver configurado → recusar (401/500 com log claro). Remover o `if (webhookSecret)` que silencia a validação. Comparar com `crypto.timingSafeEqual` sobre o **raw body exato** recebido.
2. **Raw body obrigatório**: se `req.rawBody` ausente (Buffer vazio) → 400. **Remover** o fallback `JSON.stringify(payload)` (re-serialização quebra a assinatura).
3. **Anti-replay por delivery ID**: ler `x-gitea-delivery` (obrigatório — 400 se ausente). Persistir em tabela `WebhookDelivery { id, deliveryId @unique, eventType, repoFullName, commitSha, receivedAt }`. Delivery já visto → **200** `{ status: 'duplicate' }` (idempotente, sem efeitos). Sem isso, janela de timestamp ±5 min não basta.
4. **Tamanho de payload**: rejeitar bodies > 1 MB (400) — configurar também limite no `rawBody` (ver opções do Nest/BodyParser).
5. **Evento/branch**: só `push`; branch `main`/`master`; ignorar deleção (manter).
6. **Idempotência de commit**: manter unique `@@unique([activityId, userId, commitSha])`; **tratar P2002** (concorrência) como `already_processed` (200), nunca 500. Preferir `create` com catch a `findFirst`+`create`.
7. **Identidade**: validar que `repository.name` bate com o padrão da atividade (`{slug}-{username}`) antes de aceitar; e-mail do autor do commit vira **campo de auditoria**, não única prova (binding autoritativo é Wave 2 — documentar com TODO).

## Tabela Prisma

```prisma
model WebhookDelivery {
  id          String   @id @default(uuid())
  deliveryId  String   @unique
  eventType   String
  repoFullName String
  commitSha   String?
  receivedAt  DateTime @default(now())
  @@index([receivedAt])
}
```

## Testes obrigatórios (jest + supertest, com mocks de GiteaService/Prisma)

1. Sem `GITEA_WEBHOOK_SECRET` configurado → request rejeitado (401/500) e **nenhuma** submission criada.
2. Assinatura ausente/errada/tampered → 401.
3. `x-gitea-delivery` repetido (replay) → 200 `duplicate`, sem nova submission.
4. Body > 1 MB → 400.
5. Evento não-push / branch errada → ignorado (200 sem efeito).
6. CommitSha repetido (mesmo delivery diferente) → 200 `already_processed`.
7. P2002 em concorrência → 200, não 500.

## Critérios de aceite

- Grep: nenhum `if (webhookSecret)` condicionando a validação.
- Grep: nenhum `JSON.stringify(payload)` em path de validação.
- Suíte webhook verde com os 7 casos acima.
- Logs com e-mail redigido (auditoria sem PII).