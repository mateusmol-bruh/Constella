-- Aditiva: registros existentes continuam como mensagens comuns, sem resposta/chave.
ALTER TABLE "mensagem" ADD COLUMN "resposta_id" BIGINT,
  ADD COLUMN "envio_id" VARCHAR(100);
ALTER TABLE "postagem" ADD COLUMN "resposta_id" BIGINT,
  ADD COLUMN "envio_id" VARCHAR(100),
  ADD COLUMN "tipo_post" VARCHAR(30) NOT NULL DEFAULT 'MENSAGEM';

CREATE UNIQUE INDEX "mensagem_id_usr_emissor_envio_id_key" ON "mensagem"("id_usr_emissor", "envio_id");
CREATE UNIQUE INDEX "postagem_id_usr_envio_id_key" ON "postagem"("id_usr", "envio_id");
CREATE INDEX "mensagem_resposta_id_idx" ON "mensagem"("resposta_id");
CREATE INDEX "postagem_resposta_id_idx" ON "postagem"("resposta_id");
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_resposta_id_fkey"
  FOREIGN KEY ("resposta_id") REFERENCES "mensagem"("id_msg") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "postagem" ADD CONSTRAINT "postagem_resposta_id_fkey"
  FOREIGN KEY ("resposta_id") REFERENCES "postagem"("id_post") ON DELETE SET NULL ON UPDATE NO ACTION;
