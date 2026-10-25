-- Fase 2 premium — simulador de entrevista + revisão de código por IA.
-- ARQUIVO ONLY: nunca aplicar em produção sem ordem explícita do Augusto.
-- Aditivo: 2 enums + 4 tabelas novas, 1 coluna nova em activities
-- (is_capstone, default false) e 2 colunas de extensão sobre o desenho
-- (interview_turns.evaluation, code_reviews.note) — ambas anuláveis,
-- documentadas no schema. Nenhum dado existente é alterado; nenhum
-- resultado de teste oculto é tocado (a revisão é tabela à parte).

CREATE TYPE "InterviewMode" AS ENUM ('technical', 'behavioral');
CREATE TYPE "InterviewStatus" AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE "ReviewKind" AS ENUM ('ai', 'peer');
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'completed', 'failed');

ALTER TABLE "activities" ADD COLUMN "is_capstone" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "interview_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "mode" "InterviewMode" NOT NULL,
  "track" VARCHAR(64),
  "status" "InterviewStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interview_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "interview_sessions_user_id_status_idx" ON "interview_sessions"("user_id", "status");

CREATE TABLE "interview_turns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "role" VARCHAR(16) NOT NULL,
  "content" TEXT NOT NULL,
  "evaluation" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interview_turns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interview_turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "interview_turns_session_id_idx" ON "interview_turns"("session_id");

CREATE TABLE "interview_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "scores" JSONB NOT NULL,
  "strengths" TEXT[],
  "gaps" TEXT[],
  "next_steps" TEXT[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interview_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interview_reports_session_id_key" UNIQUE ("session_id"),
  CONSTRAINT "interview_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "code_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "kind" "ReviewKind" NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
  "rubric" JSONB,
  "summary" TEXT,
  "suggestions" TEXT[] NOT NULL DEFAULT '{}',
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "code_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "code_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "code_reviews_submission_id_kind_idx" ON "code_reviews"("submission_id", "kind");
