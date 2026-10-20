-- CreateTable: resultado do quiz diagnóstico (B09). O quiz é anônimo
-- primeiro (user_id anulável, vinculado depois no cadastro); a sessão é
-- identificada por session_token único. Tabela nova, sem backfill.
CREATE TABLE "diagnostic_results" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_token" TEXT NOT NULL,
    "quiz_version" VARCHAR(16) NOT NULL,
    "answers" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "archetype" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_results_session_token_key" ON "diagnostic_results"("session_token");

-- CreateIndex
CREATE INDEX "diagnostic_results_user_id_idx" ON "diagnostic_results"("user_id");

-- AddForeignKey
ALTER TABLE "diagnostic_results" ADD CONSTRAINT "diagnostic_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
