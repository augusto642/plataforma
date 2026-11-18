ALTER TABLE "knowledge_references"
  ALTER COLUMN "submitted_by" DROP NOT NULL,
  ADD COLUMN "source" VARCHAR(16) NOT NULL DEFAULT 'admin';
