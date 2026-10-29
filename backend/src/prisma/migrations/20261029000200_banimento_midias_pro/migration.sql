BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE "usuaria"
 ADD COLUMN "banida" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "banida_em" TIMESTAMP(6),
 ADD COLUMN "banida_motivo" VARCHAR(1000),
 ADD COLUMN "banida_por" BIGINT,
 ADD CONSTRAINT "usuaria_banida_por_fkey" FOREIGN KEY ("banida_por") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE TABLE "arquivo_pro" (
 "id" UUID PRIMARY KEY, "tipo" VARCHAR(10) NOT NULL,
 "nome" VARCHAR(255) NOT NULL, "mime" VARCHAR(50) NOT NULL,
 "tamanho" BIGINT NOT NULL, "sha256" VARCHAR(64) NOT NULL,
 "largura" INTEGER NOT NULL, "altura" INTEGER NOT NULL, "duracao" DOUBLE PRECISION,
 "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "id_mod" BIGINT NOT NULL REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT "arquivo_pro_tipo_check" CHECK ("tipo" IN ('imagem','video')),
 CONSTRAINT "arquivo_pro_tamanho_check" CHECK ("tamanho" > 0 AND "tamanho" <= 52428800),
 CONSTRAINT "arquivo_pro_dimensoes_check" CHECK ("largura" > 0 AND "altura" > 0)
);
CREATE INDEX "arquivo_pro_id_mod_idx" ON "arquivo_pro"("id_mod");
ALTER TABLE "conteudo_pro"
 ADD COLUMN "imagem_pro_id" UUID REFERENCES "arquivo_pro"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
 ADD COLUMN "video_pro_id" UUID REFERENCES "arquivo_pro"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "conteudo_pro_imagem_pro_id_idx" ON "conteudo_pro"("imagem_pro_id");
CREATE INDEX "conteudo_pro_video_pro_id_idx" ON "conteudo_pro"("video_pro_id");
COMMIT;
