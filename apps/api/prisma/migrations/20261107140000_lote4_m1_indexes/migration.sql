-- Lote 4 (médios) — M1: índices faltantes apontados pelo Tech Lead (tarefa 189).
-- Gerado por `prisma migrate diff --from-schema <schema pré-M1> --to-schema prisma/schema.prisma --script`
-- e conferido contra o schema atual (só os 5 CREATE INDEX abaixo, nenhum
-- outro DDL). NUNCA aplicar em produção sem revisão do responsável: NÃO há
-- banco ao vivo neste ambiente para smoke test — dívida registrada no relatório.
-- Justificativa por índice (consultas reais no código):
--   users_role_idx / users_created_at_idx: `users.service.ts:list()` ordena por
--     createdAt desc; `admin.service.ts:listUsers()` filtra por role e ordena
--     por createdAt desc. `users` não tinha NENHUM @@index.
--   ai_chat_messages_created_at_idx: `ai.service.ts:getChatHistory()` ordena
--     por createdAt asc (o índice existente cobre só (userId, activityId)).
--   activities_course_id_order_idx: `activities.service.ts` e
--     `courses.service.ts` ordenam atividades por (courseId, order).
--   submissions_status_idx: consultas por status sozinho (ex.: housekeeping e
--     contagens por status); os índices existentes são compostos com userId ou
--     activityId e não servem a filtro só por status.
-- Fora do escopo (NÃO incluído): `league_*` do premium — outro engenheiro
-- cuida do premium; nenhum índice especulativo além dos citados.

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "ai_chat_messages_created_at_idx" ON "ai_chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "activities_course_id_order_idx" ON "activities"("course_id", "order");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");
