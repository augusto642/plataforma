CREATE TABLE "admin_audit_events" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" UUID NOT NULL,
    "previous_value" VARCHAR(32),
    "new_value" VARCHAR(32),
    "changed_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_events_created_at_idx"
ON "admin_audit_events"("created_at");

CREATE INDEX "admin_audit_events_target_type_target_id_created_at_idx"
ON "admin_audit_events"("target_type", "target_id", "created_at");
