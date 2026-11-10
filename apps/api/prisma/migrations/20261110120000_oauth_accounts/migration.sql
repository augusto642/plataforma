-- OAuth 2.0 real (Google/GitHub): contas vinculadas + senha opcional.
-- - `users.password_hash` vira NULLABLE: a conta criada SÓ via OAuth nasce
--   sem senha. Contas por e-mail/senha continuam com hash (o register
--   sempre grava um); o login por senha rejeita conta sem hash.
-- - Nova tabela `oauth_accounts`: um registro por (usuário, provedor) e
--   um providerId por usuário no máximo — é o que permite o login direto
--   pela conta vinculada e o vínculo sem duplicata (ver
--   AuthService.loginWithOAuth).
-- Migration COMO ARQUIVO (padrão dos lotes anteriores): NÃO aplicar em
-- banco nenhum sem autorização do Augusto.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_id_key" ON "oauth_accounts"("provider", "provider_id");
CREATE UNIQUE INDEX "oauth_accounts_provider_user_id_key" ON "oauth_accounts"("provider", "user_id");
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
