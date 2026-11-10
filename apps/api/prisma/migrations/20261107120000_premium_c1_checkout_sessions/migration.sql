-- Lote 1 (P0) — C1 webhook de billing: vínculo checkout → webhook.
-- ARQUIVO ONLY: nunca aplicar em produção sem ordem explícita do
-- Augusto. Aditivo: 1 tabela nova (`checkout_sessions`); nenhum dado
-- existente é alterado. Sem a linha da sessão, `payment_approved` é
-- rejeitado e nenhum plano é liberado.

CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "Plan" NOT NULL,
    "billing_cycle" VARCHAR(16) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "checkout_sessions_session_id_key" ON "checkout_sessions"("session_id");
CREATE UNIQUE INDEX "checkout_sessions_provider_subscription_id_user_id_key" ON "checkout_sessions"("provider_subscription_id", "user_id");
CREATE INDEX "checkout_sessions_user_id_idx" ON "checkout_sessions"("user_id");
