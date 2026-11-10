-- Torre de Desafios (Fase 0)
-- Tabelas de progresso e log de jogadas, e o plano do usuário (free/pro),
-- usado pelo limite diário de jogadas (5/dia grátis, 10/dia assinante).
-- DDL com a renderização exata do `prisma migrate diff` do schema atual.
-- ATENÇÃO: este diff inclui deriva pré-existente do schema (users.bits_balance,
-- users.streak_freezes etc. sem migration); esta migration contém SÓ a torre
-- e o plano — a deriva antiga não é tocada aqui.

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "tower_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "square" INTEGER NOT NULL DEFAULT 0,
    "moves_left_today" INTEGER NOT NULL DEFAULT 5,
    "moves_reset_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "powers" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tower_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tower_moves" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "floor" INTEGER NOT NULL,
    "from_square" INTEGER NOT NULL,
    "roll" INTEGER NOT NULL,
    "to_square" INTEGER NOT NULL,
    "square_type" TEXT NOT NULL,
    "activity_id" UUID,
    "result" TEXT,
    "xp_gained" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tower_moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tower_progress_user_id_key" ON "tower_progress"("user_id");

-- CreateIndex
CREATE INDEX "tower_moves_user_id_created_at_idx" ON "tower_moves"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "tower_progress" ADD CONSTRAINT "tower_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tower_moves" ADD CONSTRAINT "tower_moves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
