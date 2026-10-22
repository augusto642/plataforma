-- Sprint 17 (Ciclo 10/10 · Volta 2/B54) — destino real da intenção de
-- plano da landing: a intenção salva no navegador (nexus_plan_intent)
-- vira registro contável no servidor quando o usuário conclui o
-- cadastro ou entra logado. A cobrança dos planos pagos ainda NÃO
-- está ativa: o registro é a LISTA DE INTERESSADOS do plano — um por
-- usuário (unique em user_id); nova intenção substitui a anterior.
-- Leitura pública apenas da contagem agregada (GET
-- /plan-interest/counts); o registro individual só volta ao dono
-- (GET /plan-interest/me, autenticado).

-- CreateTable
CREATE TABLE "plan_interests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" VARCHAR(16) NOT NULL,
    "billing_cycle" VARCHAR(16),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_interests_plan_idx" ON "plan_interests"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "plan_interests_user_id_key" ON "plan_interests"("user_id");

-- AddForeignKey
ALTER TABLE "plan_interests" ADD CONSTRAINT "plan_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
