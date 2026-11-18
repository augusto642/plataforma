ALTER TABLE "users"
ADD COLUMN "adult_eligibility_accepted_at" TIMESTAMP(3),
ADD COLUMN "adult_eligibility_version" VARCHAR(32);
