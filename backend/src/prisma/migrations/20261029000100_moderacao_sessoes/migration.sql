-- Migração aditiva. Aplicar somente após autorização explícita em desenvolvimento.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE "conteudo" ADD COLUMN "publicado" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "capa" VARCHAR(500), ADD COLUMN "categoria" VARCHAR(100),
 ADD COLUMN "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "conteudo_pro" ADD COLUMN "publicado" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "capa" VARCHAR(500), ADD COLUMN "categoria" VARCHAR(100),
 ADD COLUMN "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "id_mod" BIGINT;
ALTER TABLE "conteudo_pro" ADD CONSTRAINT "fk_conteudo_pro_moderadora" FOREIGN KEY ("id_mod") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "denuncia" ADD COLUMN "descricao" VARCHAR(2000);
CREATE TABLE "sessao" (
 "id" VARCHAR(64) PRIMARY KEY, "tipo" VARCHAR(20) NOT NULL,
 "id_usr" BIGINT, "id_mod" BIGINT,
 "criada_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "ultima_atividade" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expira_em" TIMESTAMP(6) NOT NULL, "revogada_em" TIMESTAMP(6),
 CONSTRAINT "sessao_titular_check" CHECK (
  ("tipo"='usuaria' AND "id_usr" IS NOT NULL AND "id_mod" IS NULL) OR
  ("tipo"='moderadora' AND "id_mod" IS NOT NULL AND "id_usr" IS NULL)),
 CONSTRAINT "sessao_usuaria_fkey" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "sessao_moderadora_fkey" FOREIGN KEY ("id_mod") REFERENCES "moderadora"("id_mod") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "sessao_id_usr_expira_em_idx" ON "sessao"("id_usr","expira_em");
CREATE INDEX "sessao_id_mod_expira_em_idx" ON "sessao"("id_mod","expira_em");
CREATE INDEX "conteudo_publicado_data_pub_idx" ON "conteudo"("publicado","data_pub");
CREATE INDEX "conteudo_pro_publicado_data_pub_cont_pro_idx" ON "conteudo_pro"("publicado","data_pub_cont_pro");
COMMIT;
