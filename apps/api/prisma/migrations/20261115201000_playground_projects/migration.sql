CREATE TABLE "playground_projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "language" "Language" NOT NULL,
    "files" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "playground_projects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "playground_projects_user_id_updated_at_idx" ON "playground_projects"("user_id", "updated_at");
ALTER TABLE "playground_projects" ADD CONSTRAINT "playground_projects_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
