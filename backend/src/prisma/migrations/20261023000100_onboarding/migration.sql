-- Aditiva, autorizada para desenvolvimento. Não infere conclusão por interesses.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "public"."usuaria"
  ADD COLUMN "onboarding_concluido" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "apresentacao" VARCHAR(500);
COMMIT;
