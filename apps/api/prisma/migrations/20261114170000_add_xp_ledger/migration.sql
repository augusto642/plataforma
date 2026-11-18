CREATE TABLE "xp_ledger_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(191) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "xp_ledger_entries_user_id_idempotency_key_key"
ON "xp_ledger_entries"("user_id", "idempotency_key");

CREATE INDEX "xp_ledger_entries_user_id_created_at_idx"
ON "xp_ledger_entries"("user_id", "created_at");

ALTER TABLE "xp_ledger_entries"
ADD CONSTRAINT "xp_ledger_entries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
