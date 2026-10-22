-- Sprint 16 (Ciclo 10/10 · P2/B49) — lista de espera por trilha do
-- roadmap da landing: captura de e-mail das trilhas futuras com
-- contador público real por trilha (contagem desta tabela).
-- Escrita via POST /waitlist (DTO validado); leitura pública apenas
-- da contagem agregada em GET /waitlist/counts — e-mails nunca voltam.

-- CreateTable
CREATE TABLE "track_waitlist_entries" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "track" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "track_waitlist_entries_track_idx" ON "track_waitlist_entries"("track");

-- CreateIndex
CREATE UNIQUE INDEX "track_waitlist_entries_email_track_key" ON "track_waitlist_entries"("email", "track");
