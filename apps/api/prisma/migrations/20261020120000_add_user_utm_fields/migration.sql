-- AlterTable: origem de aquisição (UTM) capturada no cadastro — B07.
-- Colunas anuláveis e aditivas: cadastros antigos e fluxos sem UTM
-- (admin, seeds) seguem válidos sem backfill.
ALTER TABLE "users" ADD COLUMN "utm_source" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "utm_medium" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "utm_campaign" VARCHAR(255);
