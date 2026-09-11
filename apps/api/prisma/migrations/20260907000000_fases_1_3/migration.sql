
-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "concept_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reference_solution" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "enrollment_code" TEXT,
ADD COLUMN     "is_public_library" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "ai_line_feedback" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "talent_visible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "student_repos" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "gitea_username" TEXT NOT NULL,
    "activity_id" UUID,
    "commit_sha" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_repos_user_id_idx" ON "student_repos"("user_id");

-- CreateIndex
CREATE INDEX "student_repos_gitea_username_idx" ON "student_repos"("gitea_username");

-- CreateIndex
CREATE UNIQUE INDEX "student_repos_user_id_repo_full_name_key" ON "student_repos"("user_id", "repo_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_token_hash_key" ON "companies"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "courses_enrollment_code_key" ON "courses"("enrollment_code");

-- AddForeignKey
ALTER TABLE "student_repos" ADD CONSTRAINT "student_repos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_repos" ADD CONSTRAINT "student_repos_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
