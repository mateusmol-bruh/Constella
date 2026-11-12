BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE "solicitacao_recuperacao_senha" (
  "id" UUID NOT NULL PRIMARY KEY,
  "usuaria_id" BIGINT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  "codigo_hash" VARCHAR(64),
  "geracao_id" UUID,
  "expira_em" TIMESTAMP(6),
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "moderadora_id" BIGINT,
  "metodo_verificacao" VARCHAR(500),
  "procedimento_teste" BOOLEAN NOT NULL DEFAULT false,
  "justificativa" VARCHAR(1000),
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "analisado_em" TIMESTAMP(6),
  "concluido_em" TIMESTAMP(6),
  CONSTRAINT "solicitacao_recuperacao_senha_usuaria_id_fkey" FOREIGN KEY ("usuaria_id") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "solicitacao_recuperacao_senha_moderadora_id_fkey" FOREIGN KEY ("moderadora_id") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "solicitacao_recuperacao_senha_status_check" CHECK ("status" IN ('PENDENTE','APROVADA','RECUSADA','CONCLUIDA','EXPIRADA')),
  CONSTRAINT "solicitacao_recuperacao_senha_tentativas_check" CHECK ("tentativas" BETWEEN 0 AND 5),
  CONSTRAINT "solicitacao_recuperacao_senha_codigo_check" CHECK (
    ("status" = 'APROVADA' AND "codigo_hash" IS NOT NULL AND "geracao_id" IS NOT NULL AND "expira_em" IS NOT NULL AND "moderadora_id" IS NOT NULL AND "metodo_verificacao" IS NOT NULL AND "analisado_em" IS NOT NULL)
    OR ("status" <> 'APROVADA' AND "codigo_hash" IS NULL AND "geracao_id" IS NULL)
  )
);
CREATE INDEX "solicitacao_recuperacao_senha_status_criado_em_idx" ON "solicitacao_recuperacao_senha"("status","criado_em");
CREATE INDEX "solicitacao_recuperacao_senha_usuaria_id_criado_em_idx" ON "solicitacao_recuperacao_senha"("usuaria_id","criado_em");
CREATE INDEX "solicitacao_recuperacao_senha_moderadora_id_idx" ON "solicitacao_recuperacao_senha"("moderadora_id");
CREATE UNIQUE INDEX "solicitacao_recuperacao_senha_ativa_key" ON "solicitacao_recuperacao_senha"("usuaria_id") WHERE "status" IN ('PENDENTE','APROVADA');

CREATE TABLE "auditoria_recuperacao_senha" (
  "id" UUID NOT NULL PRIMARY KEY,
  "solicitacao_id" UUID NOT NULL,
  "moderadora_id" BIGINT,
  "acao" VARCHAR(30) NOT NULL,
  "metodo_verificacao" VARCHAR(500),
  "procedimento_teste" BOOLEAN NOT NULL DEFAULT false,
  "justificativa" VARCHAR(1000),
  "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auditoria_recuperacao_senha_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao_recuperacao_senha"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "auditoria_recuperacao_senha_moderadora_id_fkey" FOREIGN KEY ("moderadora_id") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "auditoria_recuperacao_senha_acao_check" CHECK ("acao" IN ('SOLICITADA','APROVADA','RECUSADA','CODIGO_RENOVADO','CONCLUIDA','EXPIRADA','TENTATIVAS_ESGOTADAS')),
  CONSTRAINT "auditoria_recuperacao_senha_responsavel_check" CHECK ("acao" NOT IN ('APROVADA','RECUSADA','CODIGO_RENOVADO') OR "moderadora_id" IS NOT NULL)
);
CREATE INDEX "auditoria_recuperacao_senha_solicitacao_id_criado_em_idx" ON "auditoria_recuperacao_senha"("solicitacao_id","criado_em");
CREATE INDEX "auditoria_recuperacao_senha_moderadora_id_idx" ON "auditoria_recuperacao_senha"("moderadora_id");
COMMIT;
