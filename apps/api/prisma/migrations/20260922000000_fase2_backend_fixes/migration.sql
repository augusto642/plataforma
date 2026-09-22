-- CreateIndex
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AlterTable: contador de re-enqueues do watchdog de submissões zumbis
ALTER TABLE "submissions" ADD COLUMN "requeue_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: findAll ordena por createdAt desc filtrando por userId
CREATE INDEX IF NOT EXISTS "submissions_user_id_created_at_idx" ON "submissions"("user_id", "created_at");
