-- CreateTable: eventos do funil da landing (B08 mínimo). Ingestão pública
-- via POST /analytics/events (catálogo fechado de eventos); a análise é
-- consulta direta na tabela, sem provedor externo. Tabela nova, sem backfill.
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "event" VARCHAR(32) NOT NULL,
    "cta_id" VARCHAR(64),
    "session_id" VARCHAR(64),
    "path" VARCHAR(512),
    "props" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");
