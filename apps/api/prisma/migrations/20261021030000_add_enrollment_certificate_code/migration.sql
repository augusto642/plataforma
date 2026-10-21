-- Sprint 10 (B30) — verificação pública de certificados consulta registro real.
-- O código SHA-256 do certificado passa a ser persistido na matrícula no
-- momento da emissão (CoursesService.getCertificate), para o endpoint
-- público GET /courses/certificates/verify/:code confirmar apenas
-- certificados que existem — a página /verify fabricava "válido" para
-- qualquer hash digitado.

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN "certificate_code" TEXT;
ALTER TABLE "enrollments" ADD COLUMN "certificate_issued_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_certificate_code_key" ON "enrollments"("certificate_code");
