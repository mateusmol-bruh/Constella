# Contrato de moderação e sessão

A interface da moderadora utiliza o mesmo backend e PostgreSQL do mobile. Contratos completos, limites e validações: ../../docs/INTEGRACAO_FINAL_MODERACAO.md.

## Autenticação

POST /api/moderacao/login recebe {email,senha}. Responde {moderadora:{id,nome,email},csrf} e cookie constella_mod HttpOnly, SameSite=Strict, Path=/api, Secure em produção. O JWT não é devolvido no corpo. Não existem cadastro público de moderadora, papel recebido do cliente ou privilégio administrativo por assinatura.

GET /api/moderacao/sessao responde o mesmo perfil seguro e csrf. Toda escrita com cookie deve enviar X-CSRF-Token e origem permitida. POST /api/moderacao/logout revoga a sessão no banco e expira o cookie. JWTs Bearer de moderação emitidos pelo servidor também precisam de sessão válida; o painel não armazena Bearer.

Mobile mantém POST /api/auth/login e /cadastro com JWT Bearer, agora vinculado a sessao no PostgreSQL. POST /api/auth/logout exige esse Bearer e retorna 204. Token legado sem jti/sessão deve autenticar novamente. Ausência/expiração/revogação = 401; papel incorreto = 403.

## Conteúdos

POST /api/moderacao/conteudos e /conteudos/pro, ou PUT nos mesmos caminhos com /:id, recebem {titulo,descricao,texto,duracao,categoria,publicado,capa}. publicado é booleano obrigatório; capa é null ou caminho retornado pelo upload. Tipo e titular não são definidos livremente pelo corpo. O tipo do registro existente não é alterado.

GET /api/moderacao/conteudos?tipo=normal&pagina=1&limite=50&q=&publicado=true responde {conteudos:[{id,tipo,titulo,descricao,texto,duracao,publicado,capa,categoria,data_publicacao,atualizado_em}]}. tipo aceita normal/pro, publicado aceita true/false ou ausente, limite 1..100. O título/categoria são filtrados no PostgreSQL. PATCH .../:id/publicacao recebe {publicado}; DELETE retorna 204 somente sem histórico de acesso, senão 409. Operações registram auditoria.

POST /api/moderacao/capas recebe {imagem:BASE64_JPG_OU_PNG}, limita arquivo a 2 MB e usa a infraestrutura de upload já existente. Responde {caminho:'/uploads/UUID.png'}. Capa é pública; material PRO não é enviado nessa rota. A API do mobile e pública excluem conteúdos despublicados, inclusive por ID.

## Denúncias e relatórios

Usuária autenticada pode denunciar os tipos existentes em /api/denuncias/usuarias/:id, /mensagens/:id e /postagens/:id, com {motivo,descricao?}. Mantêm-se as verificações de vínculo de chat/fórum e impedimento de denunciar a si mesma.

GET /api/moderacao/denuncias suporta status, pagina e limite. GET /:id inclui contexto autorizado e historico. PATCH /:id/status recebe {status,decisao}; status aceita PENDENTE, EM_ANALISE, RESOLVIDA, REJEITADA; decisões finais exigem justificativa. Status e auditoria são persistidos juntos. A resposta inclui historico_id e historicoConfirmado após a transação.

POST /api/moderacao/relatorios recebe {titulo,conteudo}. GET retorna os 200 registros próprios recentes. Não existem suspensão de conta, upload de vídeo protegido ou denúncia de fórum/editorial neste contrato. Não há exclusão em massa nem seed automático.

## Banimentos e mídias exclusivas (29/10/2026)

- GET /usuarias/:id: estado e histórico administrativo; sem senha/CPF.
- PATCH /usuarias/:id/banimento: `{banida:boolean,motivo:string}` (1..1000 caracteres), confirmação no painel, autenticação de moderadora e CSRF quando cookie. Duplicação retorna 409. Banimento revoga sessões e dispositivos push; reversão exige novo login. JWT de conta banida retorna 403 com `codigo: CONTA_BANIDA`.
- POST /midias/pro/:uploadId: binário (JPG/PNG até 2 MB ou MP4 H.264/AAC até 50 MB); UUID v4 idempotente por bytes/responsável, X-File-Name percent-encoded, Content-Type obrigatório. Progresso no cliente; backend valida assinatura/estrutura/dimensões/duração. Não enviar base64 para esta rota.
- GET /midias/pro/:id: prévia privada autorizada por sessão de moderadora.
- Conteúdo PRO aceita `imagem_pro_id`/`video_pro_id` opcionais (UUID ou null). Omitir na edição preserva a referência; null remove. Pelo menos texto ou mídia obrigatórios. Capa pública continua separada em `capa`.
- GET /api/pro/conteudos/:id/midias/:arquivo: sessão de usuária + PRO validado + publicação/vínculo; Range autorizado por requisição, Cache-Control private/no-store. Catálogo público não inclui referências privadas.
- Arquivos no armazenamento local `UPLOADS_DIR/pro`; tabela arquivo_pro só guarda metadados. Remoção/substituição de referência não apaga binário automaticamente.
