ALTER TABLE "users"
  ADD COLUMN "password_reset_hash" TEXT,
  ADD COLUMN "password_reset_until" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_password_reset_hash_key" ON "users"("password_reset_hash");
