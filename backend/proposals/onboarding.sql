-- PROPOSTA ARQUIVADA: aprovada e aplicada via migration 20261023000100_onboarding.
-- NÃO EXECUTAR NOVAMENTE. Esta cópia preserva o SQL apresentado para revisão.
-- Operação aditiva: preserva registros e relacionamentos existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "public"."usuaria"
  ADD COLUMN "onboarding_concluido" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "apresentacao" VARCHAR(500);
COMMIT;
