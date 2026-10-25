-- Fase 4 premium — Radar de vagas → Talent Match + base técnica B2B (desenho §5).
-- ARQUIVO ONLY: nunca aplicar em produção sem ordem explícita do Augusto.
-- Aditivo: 3 enums + 5 tabelas novas; nenhum dado existente é alterado.
-- Desvio do desenho (documentado no schema): JobPosting.research_id é
-- VARCHAR(128), não UUID — os ids de pesquisa do ResearchService (arquivo
-- versionado, ex.: "research-python") não são UUIDs.

CREATE TYPE "JobSource" AS ENUM ('aggregated', 'partner');
CREATE TYPE "IntroductionStatus" AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE "OrgRole" AS ENUM ('admin', 'member');

CREATE TABLE "job_postings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "title" TEXT NOT NULL,
  "skills" TEXT[] NOT NULL,
  "level" VARCHAR(16) NOT NULL,
  "source" "JobSource" NOT NULL,
  "research_id" VARCHAR(128),
  "external_url" TEXT,
  "posted_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "job_postings_level_expires_at_idx" ON "job_postings"("level", "expires_at");

CREATE TABLE "talent_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "headline" TEXT,
  "skills_proven" TEXT[] NOT NULL,
  "project_urls" TEXT[] NOT NULL,
  "spotlight" BOOLEAN NOT NULL DEFAULT false,
  "visible" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "talent_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "talent_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "talent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "talent_introductions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "job_posting_id" UUID,
  "status" "IntroductionStatus" NOT NULL DEFAULT 'pending',
  "company_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  CONSTRAINT "talent_introductions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "talent_introductions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "talent_introductions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "talent_introductions_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "talent_introductions_company_id_status_idx" ON "talent_introductions"("company_id", "status");
CREATE INDEX "talent_introductions_user_id_status_idx" ON "talent_introductions"("user_id", "status");

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID,
  "name" TEXT NOT NULL,
  "seats" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organizations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "org_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "OrgRole" NOT NULL DEFAULT 'member',
  CONSTRAINT "org_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_members_org_id_user_id_key" UNIQUE ("org_id", "user_id"),
  CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
