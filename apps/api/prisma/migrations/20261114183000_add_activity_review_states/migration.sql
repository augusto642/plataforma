CREATE TABLE "activity_review_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "due_at" TIMESTAMP(3) NOT NULL,
    "last_reviewed_at" TIMESTAMP(3) NOT NULL,
    "last_passed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_review_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "activity_review_states_user_id_activity_id_key"
ON "activity_review_states"("user_id", "activity_id");

CREATE INDEX "activity_review_states_user_id_due_at_idx"
ON "activity_review_states"("user_id", "due_at");

ALTER TABLE "activity_review_states"
ADD CONSTRAINT "activity_review_states_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_review_states"
ADD CONSTRAINT "activity_review_states_activity_id_fkey"
FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
