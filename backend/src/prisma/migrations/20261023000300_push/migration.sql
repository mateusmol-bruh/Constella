BEGIN;
CREATE TABLE dispositivo_push (
 token VARCHAR(255) PRIMARY KEY,
 id_usr BIGINT NOT NULL REFERENCES usuaria(id_usr) ON DELETE CASCADE,
 plataforma VARCHAR(10) NOT NULL,
 ativo BOOLEAN NOT NULL DEFAULT true,
 atualizado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX dispositivo_push_id_usr_ativo_idx ON dispositivo_push(id_usr,ativo);
CREATE TABLE notificacao_push (
 id_push BIGSERIAL PRIMARY KEY,
 chave VARCHAR(160) NOT NULL,
 token VARCHAR(255) NOT NULL REFERENCES dispositivo_push(token) ON DELETE CASCADE,
 id_usr BIGINT NOT NULL REFERENCES usuaria(id_usr) ON DELETE CASCADE,
 dados JSONB NOT NULL,
 estado VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
 tentativas INTEGER NOT NULL DEFAULT 0,
 ticket VARCHAR(255),
 erro VARCHAR(80),
 proxima_tentativa TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 criado_em TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX notificacao_push_chave_token_key ON notificacao_push(chave,token);
CREATE INDEX notificacao_push_estado_proxima_tentativa_idx ON notificacao_push(estado,proxima_tentativa);
COMMIT;
