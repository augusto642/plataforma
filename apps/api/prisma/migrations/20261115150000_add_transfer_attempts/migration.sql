CREATE TABLE "transfer_attempts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "submission_id" UUID NOT NULL,
  "task_version" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "max_score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transfer_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transfer_attempts_submission_id_key" ON "transfer_attempts"("submission_id");
CREATE INDEX "transfer_attempts_user_id_assessed_at_idx" ON "transfer_attempts"("user_id", "assessed_at");
ALTER TABLE "transfer_attempts" ADD CONSTRAINT "transfer_attempts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfer_attempts" ADD CONSTRAINT "transfer_attempts_submission_id_fkey"
  FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
