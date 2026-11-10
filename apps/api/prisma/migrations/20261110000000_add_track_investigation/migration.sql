-- Trilha dinâmica v1 (Central 209 — DESIGN D2/D3)
-- TrackInvestigation (1 por usuário) + MarketSignal (sinais last30days §6).
-- Contém SÓ as tabelas novas: nenhuma coluna em tabela existente é tocada.
-- Nota: o SQL foi escrito no formato do `prisma migrate diff` (nomes de
-- índices/constraints no padrão do Prisma) e validado por `prisma
-- validate` + smoke em banco vazio — ver smoke-note.md ao lado.
-- ATENÇÃO: não aplicar em produção sem ordem do Augusto (DV-MIGRATION).

-- CreateEnum
CREATE TYPE "TrackInvestigationStatus" AS ENUM ('investigating', 'ready', 'failed');

-- CreateTable
CREATE TABLE "track_investigations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "TrackInvestigationStatus" NOT NULL DEFAULT 'investigating',
    "profile_snapshot" JSONB NOT NULL,
    "suggested_track" VARCHAR(16),
    "rationale" JSONB,
    "market_evidence" JSONB,
    "sla_due_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "notified_at" TIMESTAMP(3),
    "email_status" VARCHAR(16) NOT NULL DEFAULT 'not-attempted',
    "email_notified_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "last_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "track_investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_signals" (
    "id" UUID NOT NULL,
    "investigation_id" UUID,
    "titulo" TEXT NOT NULL,
    "tecnologia" VARCHAR(64) NOT NULL,
    "tipo" VARCHAR(32) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "retrieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "evidencia" TEXT,
    "objetivo_afetado" VARCHAR(32),
    "passo_afetado" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "is_beta_or_rumor" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "track_investigations_user_id_key" ON "track_investigations"("user_id");

-- CreateIndex
CREATE INDEX "track_investigations_status_idx" ON "track_investigations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "market_signals_investigation_id_source_url_key" ON "market_signals"("investigation_id", "source_url");

-- CreateIndex
CREATE INDEX "market_signals_investigation_id_idx" ON "market_signals"("investigation_id");

-- AddForeignKey
ALTER TABLE "track_investigations" ADD CONSTRAINT "track_investigations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_signals" ADD CONSTRAINT "market_signals_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "track_investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
