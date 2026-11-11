-- Torre de Desafios (Fase 0)
-- Tabelas de progresso e log de jogadas. O plano do usuário já existe na
-- main (migration 20261021040000_add_user_plan criou o enum Plan e a
-- coluna users.plan; 20261025000000_premium_fase1_billing adicionou o
-- valor 'career') — esta migration contém SÓ as tabelas da torre.
-- T1: o `prisma migrate diff` original da Torre incluía `CREATE TYPE
-- "Plan"` + `ADD COLUMN users.plan`; removidos no merge porque o tipo e
-- a coluna já existem — aplicar o original aqui falharia (tipo duplicado).
-- ATENÇÃO: este diff inclui deriva pré-existente do schema (users.bits_balance,
-- users.streak_freezes etc. sem migration); esta migration contém SÓ a torre
-- — a deriva antiga não é tocada aqui.

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
