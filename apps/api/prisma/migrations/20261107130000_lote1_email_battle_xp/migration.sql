-- Lote 1 (P0) — C5, C7, C8.
-- Gerado por `prisma migrate diff --from-schema <schema pré-Lote 1> --to-schema prisma/schema.prisma --script`
-- e conferido contra o schema atual. NUNCA aplicar em produção sem revisão
-- do responsável: a migration inclui backfill (ver abaixo) e NÃO há banco ao
-- vivo neste ambiente para smoke test — dívida registrada no relatório.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "battle_result" JSONB,
ADD COLUMN     "is_battle_run" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_verification_codes_user_id_created_at_idx" ON "email_verification_codes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill C5: contas criadas ANTES da verificação de e-mail passam a constar
-- como verificadas na data de criação — sem isso o login de TODOS os usuários
-- existentes seria bloqueado (403) no deploy. Contas criadas DEPOIS desta
-- migration nascem com email_verified_at NULL e precisam verificar o código.
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
