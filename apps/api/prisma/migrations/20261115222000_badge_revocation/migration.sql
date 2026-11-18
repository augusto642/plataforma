CREATE TABLE "badge_credentials" (
  "id" UUID NOT NULL PRIMARY KEY,
  "list_index" SERIAL NOT NULL,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "submission_id" UUID NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "badge_credentials_list_index_key" ON "badge_credentials" ("list_index");
CREATE UNIQUE INDEX "badge_credentials_user_id_submission_id_key" ON "badge_credentials" ("user_id", "submission_id");
