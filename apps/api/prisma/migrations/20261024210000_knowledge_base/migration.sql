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
