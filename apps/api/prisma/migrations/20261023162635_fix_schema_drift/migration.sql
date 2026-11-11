-- AlterTable
ALTER TABLE "user_companions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bits_balance" INTEGER NOT NULL DEFAULT 420,
ADD COLUMN     "streak_freezes" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "talent_visible" SET DEFAULT false;
