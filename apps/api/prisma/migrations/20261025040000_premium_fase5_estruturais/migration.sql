-- Fase 5 premium — Estruturais: diagnóstico por skill, interface do tutor
-- adaptativo (LearnerSkillMastery derivada) e módulo fino de cert-prep
-- (desenho §6). ARQUIVO ONLY: nunca aplicar em produção sem ordem
-- explícita do Augusto. Aditivo: 4 tabelas novas + 3 exames-semente
-- (só formato/nome/domínios — nenhuma questão de prova real; as questões
-- do simulado são Activities próprias, criadas pelo pipeline KMS/admin).
-- Nenhum dado existente é alterado. B09 (DiagnosticResult) intacto.

CREATE TABLE "diagnostic_skill_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "skill_tag" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diagnostic_skill_results_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "diagnostic_skill_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "diagnostic_skill_results_user_id_skill_tag_idx" ON "diagnostic_skill_results"("user_id", "skill_tag");

CREATE TABLE "learner_skill_mastery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "skill_tag" TEXT NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learner_skill_mastery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "learner_skill_mastery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "learner_skill_mastery_user_id_skill_tag_key" UNIQUE ("user_id", "skill_tag")
);

CREATE TABLE "cert_exams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "domains" TEXT[] NOT NULL DEFAULT '{}',
    CONSTRAINT "cert_exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cert_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scores" JSONB NOT NULL,
    "readiness" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cert_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cert_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "cert_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cert_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "cert_attempts_user_id_exam_id_idx" ON "cert_attempts"("user_id", "exam_id");

-- Exames-semente (idempotente): só o formato das provas, sem questões.
INSERT INTO "cert_exams" ("id", "provider", "name", "domains") VALUES
    ('a5e5c001-0000-4000-8000-000000000001', 'aws', 'AWS Certified Cloud Practitioner (formato)',
     ARRAY['Conceitos de nuvem', 'Segurança e conformidade', 'Tecnologia', 'Faturamento e preços']),
    ('a5e5c001-0000-4000-8000-000000000002', 'azure', 'Microsoft Azure Fundamentals (formato)',
     ARRAY['Conceitos de nuvem', 'Arquitetura e serviços do Azure', 'Governança e conformidade']),
    ('a5e5c001-0000-4000-8000-000000000003', 'gcp', 'Google Cloud Digital Leader (formato)',
     ARRAY['Produtos e serviços', 'Faturamento e suporte', 'Transformação digital'])
ON CONFLICT ("id") DO NOTHING;
