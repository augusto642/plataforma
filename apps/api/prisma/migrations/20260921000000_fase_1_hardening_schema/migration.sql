-- CreateEnum
CREATE TYPE "CareerTier" AS ENUM ('beginner', 'junior', 'mid', 'senior');

-- AlterTable
ALTER TABLE "users" 
  ADD COLUMN "nickname" VARCHAR(30),
  ADD COLUMN "career_tier" "CareerTier" NOT NULL DEFAULT 'beginner';

-- AlterTable
ALTER TABLE "activities"
  ADD COLUMN "is_boss_fight" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "boss_metadata" JSONB,
  ADD COLUMN "lesson_payload" JSONB;

-- CreateTable
CREATE TABLE "user_companions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "starter_name" TEXT NOT NULL,
    "current_stage" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_companions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
CREATE UNIQUE INDEX "idx_users_nickname_lower" ON "users"(LOWER("nickname"));

-- CreateIndex
CREATE UNIQUE INDEX "user_companions_user_id_key" ON "user_companions"("user_id");

-- AddForeignKey
ALTER TABLE "user_companions" ADD CONSTRAINT "user_companions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
