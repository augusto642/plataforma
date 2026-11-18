CREATE TABLE "knowledge_references" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "author" VARCHAR(200),
    "license" VARCHAR(200),
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "submitted_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    CONSTRAINT "knowledge_references_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_references_url_key" ON "knowledge_references"("url");
CREATE INDEX "knowledge_references_status_created_at_idx" ON "knowledge_references"("status", "created_at");
