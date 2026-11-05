BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE "recuperacao_senha" (
  "id" UUID NOT NULL PRIMARY KEY,
  "usuaria_id" BIGINT NOT NULL,
  "codigo_hash" VARCHAR(64) NOT NULL,
  "expira_em" TIMESTAMP(6) NOT NULL,
  "utilizado_em" TIMESTAMP(6),
  "enviado_em" TIMESTAMP(6),
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "janela_inicio" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "solicitacoes" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "recuperacao_senha_usuaria_id_fkey" FOREIGN KEY ("usuaria_id") REFERENCES "usuaria"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "recuperacao_senha_tentativas_check" CHECK ("tentativas" BETWEEN 0 AND 5),
  CONSTRAINT "recuperacao_senha_solicitacoes_check" CHECK ("solicitacoes" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "recuperacao_senha_usuaria_id_key" ON "recuperacao_senha"("usuaria_id");
CREATE INDEX "recuperacao_senha_expira_em_idx" ON "recuperacao_senha"("expira_em");
COMMIT;
