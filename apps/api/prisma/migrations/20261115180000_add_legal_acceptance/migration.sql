ALTER TABLE "users"
ADD COLUMN "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN "terms_version" VARCHAR(32),
ADD COLUMN "privacy_acknowledged_at" TIMESTAMP(3),
ADD COLUMN "privacy_version" VARCHAR(32);
