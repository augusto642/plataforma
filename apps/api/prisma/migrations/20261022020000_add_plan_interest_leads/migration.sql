-- Sprint 18 (Ciclo 10/10 · Volta 3/B71) — captura só-e-mail da lista
-- de interessados dos planos pagos (Growth M1): a intenção de plano
-- era o lead de maior fricção da landing (exigia o cadastro completo
-- para virar registro). A nova tabela é o espelho público da lista —
-- um lead por e-mail (unique); intenção nova substitui a anterior.
-- Quando a pessoa conclui o cadastro e registra a intenção na conta
-- (plan_interests), o registro da conta prevalece e o lead do mesmo
-- e-mail é removido: a contagem pública (GET /plan-interest/counts)
-- soma as duas tabelas sem contar ninguém duas vezes.
-- DDL validado por diff: idêntico ao gerado pelo Prisma a partir do
-- schema (migrate diff schema anterior × schema novo, engine local).

-- CreateTable
CREATE TABLE "plan_interest_leads" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "plan" VARCHAR(16) NOT NULL,
    "billing_cycle" VARCHAR(16),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_interest_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_interest_leads_email_key" ON "plan_interest_leads"("email");

-- CreateIndex
CREATE INDEX "plan_interest_leads_plan_idx" ON "plan_interest_leads"("plan");
