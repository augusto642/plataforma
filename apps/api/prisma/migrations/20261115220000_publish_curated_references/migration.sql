ALTER TABLE "knowledge_curation_candidates"
  ADD COLUMN "topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "published_by" UUID,
  ADD COLUMN "published_at" TIMESTAMP(3);

CREATE INDEX "knowledge_curation_candidates_topics_gin"
  ON "knowledge_curation_candidates" USING GIN ("topics");
