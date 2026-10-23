# Push e limites de fóruns

## Notificações

- `PUT /api/notificacoes/dispositivo`: JWT obrigatório; corpo `{ "token": "ExpoPushToken[...]", "plataforma": "android" }` (ou `ios`). Resposta `{ "ativo": true }`. Associa o token exclusivamente à conta autenticada; nunca recebe `id_usr` do cliente. Token atualizado/reassociado cancela pendências da conta anterior. Serviço desativado: 503. Token/plataforma inválidos: 400. Limite de 20 solicitações/minuto por conta.
- `DELETE /api/notificacoes/dispositivo`: mesmo JWT; corpo `{ "token": "ExpoPushToken[...]" }`. Desativa somente o token dessa conta e cancela entregas pendentes. Resposta `{ "ativo": false }`. Não apaga registros.
- `CONSTELLA_PUSH_ENABLED=true` habilita registro, criação de entregas e worker do processo principal `server.js`. O padrão é desativado. Não ativar antes da migração/configuração do app.
- `EXPO_PUSH_ACCESS_TOKEN` opcional fica exclusivamente no backend para enhanced push security do Expo.

Eventos são inseridos na mesma transação de novas mensagens, novas postagens e solicitação/aceite de conexão. O evento identifica o recurso, a autora e a destinatária; não guarda conteúdo de mensagem no payload push. Não existe endpoint público para mandar push arbitrário.

`dispositivo_push` guarda token, conta, plataforma e estado. `notificacao_push` é a fila persistente. A chave única `(chave, token)` impede duplicação de um evento para o mesmo dispositivo. A autora não é incluída entre destinatárias. Antes de enviar, verificam-se bloqueios, vínculo, leitura, estado do dispositivo e existência do conteúdo. Fóruns sem participação atual não geram entrega.

O worker usa Expo Push API e consulta recibos. Ticket aceito vira `AGUARDANDO`; recibo positivo vira `ACEITA_PROVEDOR`, que **não comprova recebimento no aparelho**. Erros de token desativam o dispositivo. 429/5xx usam nova tentativa com espera crescente, até cinco tentativas. Falta de resposta ou interrupção durante envio vira `INCERTA`, evitando reenvio cego e possível duplicação. A entrega final continua sujeita ao Expo, FCM/APNs, conexão e configurações do aparelho.

O mobile pede permissão por ação em Perfil, atualiza o token, apresenta aviso no primeiro plano quando a conversa correspondente não está aberta e abre o destino autenticado ao toque. O JWT e a configuração inicial da conta continuam obrigatórios. Eventos repetidos não abrem repetidamente a mesma tela; URLs arbitrárias no payload não são abertas.

Logout com rede revoga o token antes de apagar a sessão local. Se estiver offline, a saída local continua permitida; a próxima associação do token cancela pendências da conta anterior. Notificações já entregues ao sistema operacional não podem ser recolhidas por esse fluxo. O texto do push é genérico e não contém mensagem privada, nome ou foto da remetente.

Não há fluxo de publicação administrativa/eventos do sistema na API atual. Não foi inventado endpoint de broadcast. Publicações em fórum já geram seu evento; não existe modelagem de respostas encadeadas para um evento separado de resposta.

## Criação de fóruns

- `GET /api/foruns/limites`: `{ "criados": 1, "limite": 1, "pode_criar": false, "pro": false }`. Para acesso PRO validado pelo servidor: limite null.
- `POST /api/foruns`: conta gratuita pode manter no máximo um fórum criado. Conta com acesso PRO pode criar outros. Regra usa o status do servidor e lock da conta na transação, protegendo contra concorrência. Payload `pro`/`ativo` do cliente não concede permissão.
- Limite atingido: 403 com `codigo: "LIMITE_FORUNS_GRATUITO"` e mensagem amigável. Não remove nem altera fóruns existentes de contas acima do limite.
- Demonstração PRO de desenvolvimento segue o status temporário existente do servidor. Não é pagamento ou assinatura real.

## Listagem paginada

`GET /api/foruns?filtro=explorar&pagina=1&limite=30&busca=design`: resposta `{ "foruns": [], "pagina": 1, "tem_mais": false }`. Limite de 1 a 50, paginação positiva; ordenação por data e ID. O filtro `meus` seleciona participações. Sem `pagina`, o contrato anterior de listagem é preservado. Contadores são calculados por lote, sem duas consultas extras para cada fórum.

## Banco

Migração aditiva `20261023000300_push`: cria somente `dispositivo_push` e `notificacao_push` com índices e FKs. Nenhuma migração anterior é removida e nenhum dado existente é apagado.
