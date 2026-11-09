-- Sprint 5 (fechamento do funil) — visitor_id persistente nos eventos de
-- analytics: permite contar visitantes únicos (pageview) e costurar a
-- jornada anônima até o cadastro. Coluna nova, nullable, sem backfill.
ALTER TABLE "analytics_events" ADD COLUMN "visitor_id" VARCHAR(64);

-- CreateIndex
CREATE INDEX "analytics_events_visitor_id_idx" ON "analytics_events"("visitor_id");
