-- Sprint 10 (B32) — o plano vira entidade no produto.
-- Antes: User sem campo de plano, nenhum paywall/entitlement — todo
-- cadastrado acessava tudo o que o card Pro da landing prometia como
-- diferencial. Default 'free' preserva a experiência atual de todos os
-- usuários existentes; o entitlement é aplicado na tutora de IA por
-- nível de carreira (grátis no Iniciante, Pro do Júnior em diante).

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';
