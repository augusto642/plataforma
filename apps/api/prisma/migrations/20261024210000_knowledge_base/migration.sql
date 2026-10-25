-- Conhecimento Python (DESIGN §5.2) — ARQUIVO ONLY. NÃO aplicar em produção
-- sem ordem explícita do Augusto. Deliberadamente SEM tabela de transcrição
-- e SEM alteração de Course/Activity.
CREATE TABLE "knowledge_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" VARCHAR(32) NOT NULL DEFAULT 'drive-course',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_sources_slug_key" ON "knowledge_sources"("slug");
CREATE TABLE "knowledge_lessons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stable_id" TEXT NOT NULL,
  "source_id" UUID NOT NULL,
  "drive_file_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "topics" TEXT[] NOT NULL,
  "prerequisites" TEXT[] NOT NULL,
  "difficulty" VARCHAR(16) NOT NULL,
  "review_status" VARCHAR(16) NOT NULL DEFAULT 'draft',
  "extracted_at" TIMESTAMP(3) NOT NULL,
  "extractor_version" TEXT NOT NULL,
  CONSTRAINT "knowledge_lessons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_lessons_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "knowledge_lessons_stable_id_key" ON "knowledge_lessons"("stable_id");
CREATE UNIQUE INDEX "knowledge_lessons_drive_file_id_key" ON "knowledge_lessons"("drive_file_id");
CREATE INDEX "knowledge_lessons_source_id_idx" ON "knowledge_lessons"("source_id");
CREATE TABLE "knowledge_research" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stable_id" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
  "payload" JSONB NOT NULL,
  "approved_by" UUID,
  "approved_at" TIMESTAMP(3),
  "collected_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "knowledge_research_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_research_stable_id_key" ON "knowledge_research"("stable_id");

-- [DELTA-KMS] Espelho do KMS (§13.1/§13.4) — MESMA migration só-arquivo.
-- NÃO aplicar em produção sem ordem explícita do Augusto (§5.4).
CREATE TABLE "knowledge_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic_ids" TEXT[] NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "superseded_by_entry" TEXT,
    "superseded_at" TIMESTAMP(3),
    "supersede_reason" TEXT,
    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_entries_slug_key" ON "knowledge_entries"("slug");
CREATE TABLE "knowledge_entry_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
    "summary" TEXT NOT NULL,
    "key_examples" TEXT[] NOT NULL,
    "contributions" JSONB NOT NULL,
    "market_context" JSONB,
    "superseded_by" INTEGER,
    "superseded_at" TIMESTAMP(3),
    "supersede_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_entry_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_entry_versions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "knowledge_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "knowledge_entry_versions_entry_id_version_key" ON "knowledge_entry_versions"("entry_id", "version");
CREATE TABLE "knowledge_changelog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seq" INTEGER NOT NULL,
    "entry_slug" TEXT NOT NULL,
    "change_type" VARCHAR(32) NOT NULL,
    "version" INTEGER,
    "source" JSONB NOT NULL,
    "actor" VARCHAR(64) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "detail" TEXT NOT NULL,
    CONSTRAINT "knowledge_changelog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_changelog_seq_key" ON "knowledge_changelog"("seq");
CREATE INDEX "knowledge_changelog_entry_slug_idx" ON "knowledge_changelog"("entry_slug");
CREATE TABLE "knowledge_review_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stable_id" TEXT NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "source_ref" JSONB NOT NULL,
    "candidates" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'open',
    "decision" JSONB,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_review_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_review_items_stable_id_key" ON "knowledge_review_items"("stable_id");
