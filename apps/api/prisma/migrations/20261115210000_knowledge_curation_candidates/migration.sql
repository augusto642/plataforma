CREATE TABLE "knowledge_curation_candidates" (
    "id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_by" UUID,
    "archived_at" TIMESTAMP(3),
    CONSTRAINT "knowledge_curation_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_curation_candidates_reference_id_fkey"
      FOREIGN KEY ("reference_id") REFERENCES "knowledge_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "knowledge_curation_candidates_reference_id_key" ON "knowledge_curation_candidates"("reference_id");
CREATE INDEX "knowledge_curation_candidates_status_created_at_idx" ON "knowledge_curation_candidates"("status", "created_at");
