CREATE TABLE "ai_tutor_feedback" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "concern" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_tutor_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_tutor_feedback_response_id_key"
ON "ai_tutor_feedback"("response_id");

CREATE INDEX "ai_tutor_feedback_created_at_idx"
ON "ai_tutor_feedback"("created_at");

CREATE INDEX "ai_tutor_feedback_activity_id_created_at_idx"
ON "ai_tutor_feedback"("activity_id", "created_at");

CREATE TABLE "ai_operator_audit_events" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "queue" VARCHAR(64) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'started',
    "error_code" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_operator_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_operator_audit_events_created_at_idx"
ON "ai_operator_audit_events"("created_at");

CREATE INDEX "ai_operator_audit_events_queue_created_at_idx"
ON "ai_operator_audit_events"("queue", "created_at");
