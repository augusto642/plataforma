CREATE TABLE "playground_drafts" (
    "user_id" UUID NOT NULL,
    "language" "Language" NOT NULL,
    "code" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "playground_drafts_pkey" PRIMARY KEY ("user_id", "language")
);
ALTER TABLE "playground_drafts" ADD CONSTRAINT "playground_drafts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
