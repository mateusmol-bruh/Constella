# Conversas, leitura, bloqueios e anexos

Todas as rotas abaixo exigem JWT. IDs são strings decimais positivas compatíveis com BIGINT PostgreSQL; a identidade vem exclusivamente do JWT.

## Leitura

- `POST /api/chats/:id/leitura` com `{ "ultima_id": "123" }`: confirma leitura até essa mensagem existente no chat autorizado.
- `POST /api/foruns/:id/leitura`: mesmo corpo, com o ID de uma postagem existente no fórum em que a conta participa.
- Resposta 200: `{ "mensagem": "Leitura atualizada." }`. Marcadores só avançam; requisições atrasadas não retrocedem a leitura. Referência inválida: 400; não participante: 403.
- `GET /api/chats`: cada chat inclui `nao_lidas` e `ultima_mensagem` (DTO de mensagem ou null). Mensagens próprias não contam como não lidas.
- `GET /api/foruns?filtro=meus|explorar`: filtra participação no servidor e inclui `nao_lidas` individual. Sem filtro mantém a listagem existente. `GET /api/foruns/meus` também inclui o contador.
- Ao entrar em um fórum, o marcador começa na última postagem existente. Para participações anteriores à migração, o marcador começa em zero. Nenhuma leitura é presumida apenas por consultar uma listagem.

## Bloqueios

- `GET /api/bloqueios`: array de perfis públicos bloqueados pela própria conta.
- `GET /api/bloqueios/:id`: `{ "bloqueada": false, "interacao_bloqueada": false }`.
- `POST /api/bloqueios/:id`: bloqueia de forma idempotente; 400 para a própria conta e 404 para destino inexistente.
- `DELETE /api/bloqueios/:id`: desfaz somente o bloqueio criado pela própria conta, de forma idempotente.
- `bloqueada` indica bloqueio criado pela solicitante. `interacao_bloqueada` indica bloqueio em qualquer sentido.
- Bloqueios impedem criar/recuperar chat por destinatária, enviar mensagens, solicitar ou responder conexões e aparecer em buscas/recomendações entre essas contas. Retorno 403 nas interações diretas. Históricos e conexões existentes são preservados. Fóruns compartilhados continuam funcionando; denúncias continuam permitidas.
- `GET /api/usuarios/:id` inclui apresentação pública e os dois indicadores; não inclui e-mail, CPF ou senha. `GET /api/chats/:id` inclui destinatária pública e indicadores para o cabeçalho do chat.

## Imagens

- `POST /api/uploads/imagens`: corpo `{ "imagem": "<base64>", "privada": true }`; resposta 201 com `{ "caminho": "/api/anexos/<id>-<uuid>.png" }`. Base64 é somente transporte; banco guarda o caminho. JPG/PNG até 2 MB e 20 megapixels, limite de 40 uploads/h por conta. Sem `privada: true`, preserva o upload público de foto/capa já existente.
- `POST /api/chats/:id/mensagens`: `{ "conteudo": "texto opcional", "imagem": "/api/anexos/..." }`. Aceita texto, imagem ou ambos; texto até 1000 caracteres. Resposta 201 mantém `{ dados: <mensagem> }` e inclui `imagem` opcional.
- `POST /api/foruns/:id/postagens`: mesmo corpo, resposta `{ postagem: <postagem> }`, mantendo `imagem` do contrato existente.
- Somente anexos privados enviados pela própria conta e ainda não vinculados podem ser usados em novos envios. URLs externas, caminhos públicos e arquivos de outras contas são recusados. Editar imagem de postagem também valida a propriedade do novo anexo.
- `GET /api/anexos/:nome`: exige JWT e vínculo com o chat ou participação atual no fórum da postagem. Sem JWT: 401; sem acesso: 404. Resposta binária com `Cache-Control: private, no-store`. Upload ainda não associado não é servido; a prévia usa arquivo local.
- Arquivos ficam em `uploads/privado/`, dentro de `UPLOADS_DIR` quando configurado. Não estão na rota pública `/uploads/:nome`. Deploy deve preservar esse diretório. Cancelamentos podem deixar arquivos ainda não associados; não existe rotina automática de expurgo.

## Migração

`20261023000200_social`: cria `bloqueio` e `chat_leitura`; adiciona `usuaria_forum.ultima_postagem_lida` e `mensagem.imagem_msg`, sem excluir dados nem alterar texto existente. Aplicar antes de iniciar a versão atualizada do backend. A coluna existente `postagem.img_post` é reutilizada.
