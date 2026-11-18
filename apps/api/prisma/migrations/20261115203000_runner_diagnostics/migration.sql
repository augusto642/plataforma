CREATE TABLE "runner_diagnostics" (
    "id" UUID NOT NULL,
    "admin_id" UUID,
    "language" "Language" NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "kind" VARCHAR(32),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    CONSTRAINT "runner_diagnostics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "runner_diagnostics_created_at_idx" ON "runner_diagnostics"("created_at");
