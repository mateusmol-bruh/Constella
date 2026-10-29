BEGIN;
ALTER TABLE mensagem ADD COLUMN imagem_msg VARCHAR(500);
ALTER TABLE usuaria_forum ADD COLUMN ultima_postagem_lida BIGINT NOT NULL DEFAULT 0;
CREATE TABLE chat_leitura (
 id_chat BIGINT NOT NULL REFERENCES chat(id_chat) ON DELETE CASCADE,
 id_usr BIGINT NOT NULL REFERENCES usuaria(id_usr) ON DELETE CASCADE,
 ultima_mensagem BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(id_chat,id_usr)
);
CREATE TABLE bloqueio (
 id_usr_origem BIGINT NOT NULL REFERENCES usuaria(id_usr) ON DELETE CASCADE,
 id_usr_destino BIGINT NOT NULL REFERENCES usuaria(id_usr) ON DELETE CASCADE,
 dt_bloqueio TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(id_usr_origem,id_usr_destino),
 CONSTRAINT bloqueio_contas_distintas CHECK(id_usr_origem<>id_usr_destino)
);
CREATE INDEX bloqueio_id_usr_destino_idx ON bloqueio(id_usr_destino);
COMMIT;
