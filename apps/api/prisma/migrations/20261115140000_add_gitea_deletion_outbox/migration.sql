CREATE TYPE "GiteaDeletionJobStatus" AS ENUM ('pending', 'processing', 'completed');

CREATE TABLE "gitea_deletion_jobs" (
    "id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "candidate_repo_names" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "GiteaDeletionJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitea_deletion_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gitea_deletion_jobs_status_next_attempt_at_idx"
    ON "gitea_deletion_jobs"("status", "next_attempt_at");
CREATE INDEX "gitea_deletion_jobs_status_locked_until_idx"
    ON "gitea_deletion_jobs"("status", "locked_until");
