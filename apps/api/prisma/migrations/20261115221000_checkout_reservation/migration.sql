ALTER TABLE "checkout_sessions" ADD COLUMN "canceled_at" TIMESTAMP(3);

CREATE TABLE "checkout_reservations" (
  "user_id" UUID NOT NULL PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "status" VARCHAR(16) NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "plan" "Plan" NOT NULL,
  "billing_cycle" VARCHAR(16) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "session_id" TEXT,
  "provider_subscription_id" TEXT,
  "checkout_url" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL
);

INSERT INTO "checkout_reservations"
  ("user_id", "status", "provider", "plan", "billing_cycle", "amount_cents", "session_id", "provider_subscription_id", "updated_at")
SELECT DISTINCT ON ("user_id") "user_id", 'unknown', "provider", "plan", "billing_cycle", "amount_cents", "session_id", "provider_subscription_id", CURRENT_TIMESTAMP
FROM "checkout_sessions"
ORDER BY "user_id", "created_at" DESC;
