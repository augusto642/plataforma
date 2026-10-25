-- Fase 3 premium — desafios semanais, ligas e rankings + revisão por
-- pares e comunidade (desenho §4).
-- ARQUIVO ONLY: nunca aplicar em produção sem ordem explícita do Augusto.
-- Aditivo: 1 enum + 6 tabelas novas, 1 coluna nova em code_reviews
-- (reviewer_id, anulável) e 2 colunas de extensão sobre o desenho
-- (challenge_participants, forum_posts.hidden/flagged_at) — ambas
-- documentadas no schema. Nenhum dado existente é alterado; a revisão
-- por pares REUTILIZA code_reviews (kind=peer) da Fase 2, não cria
-- tabela paralela. Nenhum teste oculto é exposto (a galeria mostra só
-- code_snapshot de submissões aprovadas, via serviço).

CREATE TYPE "LeagueTier" AS ENUM ('bronze', 'silver', 'gold');

CREATE TABLE "challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "opt_in" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "challenges_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "challenges_starts_at_ends_at_idx" ON "challenges"("starts_at", "ends_at");

CREATE TABLE "challenge_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "challenge_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "challenge_participants_challenge_id_user_id_key" UNIQUE ("challenge_id", "user_id"),
  CONSTRAINT "challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "league_seasons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tier" "LeagueTier" NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "league_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "season_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "league_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_entries_season_id_user_id_key" UNIQUE ("season_id", "user_id"),
  CONSTRAINT "league_entries_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "league_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "forum_threads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" UUID,
  "author_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "forum_threads_activity_id_idx" ON "forum_threads"("activity_id");

CREATE TABLE "forum_posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "thread_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "flagged_at" TIMESTAMP(3),
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "forum_posts_thread_id_idx" ON "forum_posts"("thread_id");
CREATE INDEX "forum_posts_flagged_hidden_idx" ON "forum_posts"("flagged", "hidden");

CREATE TABLE "solution_shares" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "solution_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "solution_shares_submission_id_key" UNIQUE ("submission_id"),
  CONSTRAINT "solution_shares_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "solution_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "code_reviews" ADD COLUMN "reviewer_id" UUID;
ALTER TABLE "code_reviews" ADD CONSTRAINT "code_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "code_reviews_reviewer_id_kind_status_idx" ON "code_reviews"("reviewer_id", "kind", "status");
