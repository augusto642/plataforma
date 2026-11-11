-- Fase 1 premium — checkout (MODO TESTE) + tiers + certificado verificável.
-- ARQUIVO ONLY: nunca aplicar em produção sem ordem explícita do Augusto.
-- Aditivo: novo valor de enum, 3 tabelas novas, sem alteração em dados
-- existentes. `test_mode` default true; nenhuma cobrança real é criada
-- por este código (BILLING_MODE=test travado em billing/test-mode.guard.ts).

-- AlterEnum: tier Carreira nomeado, SEM preço e SEM compra (decisão pendente).
ALTER TYPE "Plan" ADD VALUE 'career';

CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');
CREATE TYPE "CertificateKind" AS ENUM ('module', 'track', 'project');

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "plan" "Plan" NOT NULL,
  "billing_cycle" VARCHAR(16) NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "provider_subscription_id" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
  "test_mode" BOOLEAN NOT NULL DEFAULT true,
  "current_period_end" TIMESTAMP(3),
  "canceled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

CREATE TABLE "payment_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(32) NOT NULL,
  "provider_event_id" TEXT NOT NULL,
  "type" VARCHAR(64) NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_events_provider_provider_event_id_key" UNIQUE ("provider", "provider_event_id")
);

CREATE TABLE "certificates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "kind" "CertificateKind" NOT NULL,
  "ref_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "certificates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "certificates_code_key" UNIQUE ("code"),
  CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "certificates_user_id_kind_idx" ON "certificates"("user_id", "kind");
