CREATE TABLE "activity_drafts" (
    "user_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activity_drafts_pkey" PRIMARY KEY ("user_id", "activity_id")
);

ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_drafts" ADD CONSTRAINT "activity_drafts_activity_id_fkey"
  FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
