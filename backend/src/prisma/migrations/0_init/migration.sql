-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "assinatura" (
    "id_ass" BIGSERIAL NOT NULL,
    "forma_pagto" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "id_usr" BIGINT NOT NULL,

    CONSTRAINT "assinatura_pkey" PRIMARY KEY ("id_ass")
);

-- CreateTable
CREATE TABLE "chat" (
    "id_chat" BIGSERIAL NOT NULL,
    "dt_inicio" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usr_01" BIGINT NOT NULL,
    "id_usr_02" BIGINT NOT NULL,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id_chat")
);

-- CreateTable
CREATE TABLE "conexao" (
    "id_conexao" BIGSERIAL NOT NULL,
    "status_conexao" VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    "dt_solicitacao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_user_solicit" BIGINT NOT NULL,
    "id_user_receb" BIGINT NOT NULL,

    CONSTRAINT "conexao_pkey" PRIMARY KEY ("id_conexao")
);

-- CreateTable
CREATE TABLE "conteudo" (
    "id_cont" BIGSERIAL NOT NULL,
    "titulo_cont" VARCHAR(255) NOT NULL,
    "desc_cont" TEXT,
    "mat_text_content" TEXT NOT NULL,
    "duracao_cont" INTEGER,
    "data_pub" DATE NOT NULL,
    "id_mod" BIGINT NOT NULL,

    CONSTRAINT "conteudo_pkey" PRIMARY KEY ("id_cont")
);

-- CreateTable
CREATE TABLE "conteudo_interesses" (
    "id_cont" BIGINT NOT NULL,
    "id_intr" BIGINT NOT NULL,

    CONSTRAINT "conteudo_interesses_pkey" PRIMARY KEY ("id_cont","id_intr")
);

-- CreateTable
CREATE TABLE "conteudo_pro" (
    "id_cont_pro" BIGSERIAL NOT NULL,
    "titulo_cont_pro" VARCHAR(255) NOT NULL,
    "desc_cont_pro" TEXT,
    "mat_text_cont_pro" TEXT,
    "anexos_cont_pro" INTEGER,
    "duracao_cont_pro" BIGINT DEFAULT 0,
    "data_pub_cont_pro" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "conteudo_pro_pkey" PRIMARY KEY ("id_cont_pro")
);

-- CreateTable
CREATE TABLE "denuncia" (
    "id_den" BIGSERIAL NOT NULL,
    "motivo_den" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
    "dt_denuncia" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_mod" BIGINT NOT NULL,
    "id_usr_denunciante" BIGINT NOT NULL,

    CONSTRAINT "denuncia_pkey" PRIMARY KEY ("id_den")
);

-- CreateTable
CREATE TABLE "denuncia_mensagem" (
    "id_msg" BIGINT NOT NULL,
    "id_den" BIGINT NOT NULL,

    CONSTRAINT "denuncia_mensagem_pkey" PRIMARY KEY ("id_den","id_msg")
);

-- CreateTable
CREATE TABLE "denuncia_postagem" (
    "id_post" BIGINT NOT NULL,
    "id_den" BIGINT NOT NULL,

    CONSTRAINT "denuncia_postagem_pkey" PRIMARY KEY ("id_den","id_post")
);

-- CreateTable
CREATE TABLE "denuncia_usuaria" (
    "id_usr_denunciada" BIGINT NOT NULL,
    "id_den" BIGINT NOT NULL,

    CONSTRAINT "denuncia_usuaria_pkey" PRIMARY KEY ("id_den","id_usr_denunciada")
);

-- CreateTable
CREATE TABLE "forum" (
    "id_for" BIGSERIAL NOT NULL,
    "titulo_for" VARCHAR(255) NOT NULL,
    "desc_for" VARCHAR(255),
    "capa_for" VARCHAR(255),
    "dt_criacao" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_mod" BIGINT NOT NULL,
    "id_usr_criadora" BIGINT NOT NULL,

    CONSTRAINT "forum_pkey" PRIMARY KEY ("id_for")
);

-- CreateTable
CREATE TABLE "interesses" (
    "id_intr" BIGSERIAL NOT NULL,
    "nome_intr" VARCHAR(100) NOT NULL,

    CONSTRAINT "interesses_pkey" PRIMARY KEY ("id_intr")
);

-- CreateTable
CREATE TABLE "mensagem" (
    "id_msg" BIGSERIAL NOT NULL,
    "cont_msg" TEXT NOT NULL,
    "dt_envio" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_chat" BIGINT NOT NULL,
    "id_usr_emissor" BIGINT NOT NULL,

    CONSTRAINT "mensagem_pkey" PRIMARY KEY ("id_msg")
);

-- CreateTable
CREATE TABLE "moderadora" (
    "id_mod" BIGSERIAL NOT NULL,
    "nome_mod" VARCHAR(255) NOT NULL,
    "email_mod" VARCHAR(255) NOT NULL,
    "senha_mod" VARCHAR(255) NOT NULL,

    CONSTRAINT "moderadora_pkey" PRIMARY KEY ("id_mod")
);

-- CreateTable
CREATE TABLE "postagem" (
    "id_post" BIGSERIAL NOT NULL,
    "dt_post" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cont_post" TEXT NOT NULL,
    "img_post" VARCHAR(500),
    "id_usr" BIGINT NOT NULL,
    "id_for" BIGINT NOT NULL,

    CONSTRAINT "postagem_pkey" PRIMARY KEY ("id_post")
);

-- CreateTable
CREATE TABLE "relatorio_moderacao" (
    "id_relat" BIGSERIAL NOT NULL,
    "id_mod" BIGINT NOT NULL,
    "acao" VARCHAR(100) NOT NULL,
    "dt_acao" TIMESTAMP(6) NOT NULL,
    "desc" TEXT NOT NULL,

    CONSTRAINT "relatorio_moderacao_pkey" PRIMARY KEY ("id_relat")
);

-- CreateTable
CREATE TABLE "usuaria" (
    "id_usr" BIGSERIAL NOT NULL,
    "nome_usr" VARCHAR(255) NOT NULL,
    "email_usr" VARCHAR(255) NOT NULL,
    "senha_usr" VARCHAR(255) NOT NULL,
    "foto_usr" VARCHAR(500),
    "cpf_usr" VARCHAR(14) NOT NULL,
    "status_verificacao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuaria_pkey" PRIMARY KEY ("id_usr")
);

-- CreateTable
CREATE TABLE "usuaria_conteudo" (
    "id_usr" BIGINT NOT NULL,
    "id_cont" BIGINT NOT NULL,
    "dt_acesso" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progresso_cont" DECIMAL(5,2),

    CONSTRAINT "usuaria_conteudo_pkey" PRIMARY KEY ("id_usr","id_cont")
);

-- CreateTable
CREATE TABLE "usuaria_conteudo_pro" (
    "id_usr" BIGINT NOT NULL,
    "id_cont_pro" BIGINT NOT NULL,

    CONSTRAINT "usuaria_conteudo_pro_pkey" PRIMARY KEY ("id_usr","id_cont_pro")
);

-- CreateTable
CREATE TABLE "usuaria_forum" (
    "id_for" BIGINT NOT NULL,
    "id_usr" BIGINT NOT NULL,

    CONSTRAINT "usuaria_forum_pkey" PRIMARY KEY ("id_for","id_usr")
);

-- CreateTable
CREATE TABLE "usuaria_interesses" (
    "id_usr" BIGINT NOT NULL,
    "id_intr" BIGINT NOT NULL,

    CONSTRAINT "usuaria_interesses_pkey" PRIMARY KEY ("id_usr","id_intr")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinatura_id_usr_key" ON "assinatura"("id_usr");

-- CreateIndex
CREATE UNIQUE INDEX "interesses_nome_intr_key" ON "interesses"("nome_intr");

-- CreateIndex
CREATE UNIQUE INDEX "moderadora_email_mod_key" ON "moderadora"("email_mod");

-- CreateIndex
CREATE UNIQUE INDEX "usuaria_email_usr_key" ON "usuaria"("email_usr");

-- CreateIndex
CREATE UNIQUE INDEX "usuaria_cpf_usr_key" ON "usuaria"("cpf_usr");

-- AddForeignKey
ALTER TABLE "assinatura" ADD CONSTRAINT "fk_assinatura_usuario" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "fk_chat_usr_01" FOREIGN KEY ("id_usr_01") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "fk_chat_usr_02" FOREIGN KEY ("id_usr_02") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conexao" ADD CONSTRAINT "fk_conexao_recebedor" FOREIGN KEY ("id_user_receb") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conexao" ADD CONSTRAINT "fk_conexao_solicitante" FOREIGN KEY ("id_user_solicit") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conteudo" ADD CONSTRAINT "fk_conteudo_moderadora" FOREIGN KEY ("id_mod") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conteudo_interesses" ADD CONSTRAINT "fk_conteudo_interesses_conteudo" FOREIGN KEY ("id_cont") REFERENCES "conteudo"("id_cont") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conteudo_interesses" ADD CONSTRAINT "fk_conteudo_interesses_interesse" FOREIGN KEY ("id_intr") REFERENCES "interesses"("id_intr") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia" ADD CONSTRAINT "fk_denuncia_denunciante" FOREIGN KEY ("id_usr_denunciante") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia" ADD CONSTRAINT "fk_denuncia_moderadora" FOREIGN KEY ("id_mod") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia_mensagem" ADD CONSTRAINT "fk_denuncia_mensagem_denuncia" FOREIGN KEY ("id_den") REFERENCES "denuncia"("id_den") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia_mensagem" ADD CONSTRAINT "fk_denuncia_mensagem_mensagem" FOREIGN KEY ("id_msg") REFERENCES "mensagem"("id_msg") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia_postagem" ADD CONSTRAINT "fk_denuncia_postagem_denuncia" FOREIGN KEY ("id_den") REFERENCES "denuncia"("id_den") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia_postagem" ADD CONSTRAINT "fk_denuncia_postagem_postagem" FOREIGN KEY ("id_post") REFERENCES "postagem"("id_post") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia_usuaria" ADD CONSTRAINT "fk_denuncia_usuaria_denuncia" FOREIGN KEY ("id_den") REFERENCES "denuncia"("id_den") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "denuncia_usuaria" ADD CONSTRAINT "fk_denuncia_usuaria_usuario" FOREIGN KEY ("id_usr_denunciada") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum" ADD CONSTRAINT "fk_forum_criadora" FOREIGN KEY ("id_usr_criadora") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum" ADD CONSTRAINT "fk_forum_moderadora" FOREIGN KEY ("id_mod") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "fk_mensagem_chat" FOREIGN KEY ("id_chat") REFERENCES "chat"("id_chat") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensagem" ADD CONSTRAINT "fk_mensagem_emissor" FOREIGN KEY ("id_usr_emissor") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "postagem" ADD CONSTRAINT "fk_postagem_forum" FOREIGN KEY ("id_for") REFERENCES "forum"("id_for") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "postagem" ADD CONSTRAINT "fk_postagem_usuario" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "relatorio_moderacao" ADD CONSTRAINT "fk_relatorio_moderadora" FOREIGN KEY ("id_mod") REFERENCES "moderadora"("id_mod") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_conteudo" ADD CONSTRAINT "fk_usuaria_conteudo_conteudo" FOREIGN KEY ("id_cont") REFERENCES "conteudo"("id_cont") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_conteudo" ADD CONSTRAINT "fk_usuaria_conteudo_usuario" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_conteudo_pro" ADD CONSTRAINT "fk_usuaria_conteudo_pro_conteudo" FOREIGN KEY ("id_cont_pro") REFERENCES "conteudo_pro"("id_cont_pro") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_conteudo_pro" ADD CONSTRAINT "fk_usuaria_conteudo_pro_usuario" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_forum" ADD CONSTRAINT "fk_usuaria_forum_forum" FOREIGN KEY ("id_for") REFERENCES "forum"("id_for") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_forum" ADD CONSTRAINT "fk_usuaria_forum_usuario" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_interesses" ADD CONSTRAINT "fk_usuaria_interesses_interesse" FOREIGN KEY ("id_intr") REFERENCES "interesses"("id_intr") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuaria_interesses" ADD CONSTRAINT "fk_usuaria_interesses_usuario" FOREIGN KEY ("id_usr") REFERENCES "usuaria"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION;

