# Recuperação de chats e fóruns — 23/10/2026

O carregamento foi restaurado no backend de desenvolvimento. Todos os 3 chats e
4 fóruns existentes foram consultados por HTTP autenticado e retornaram 200,
incluindo um chat vazio e um fórum vazio.

## Causa exata e evidências

A alteração anterior passou a usar `resposta_id`, `envio_id` e `tipo_post` no
Prisma Client, mas a migração `20261023000400_respostas_sistema` ainda não estava
aplicada. O banco tinha as quatro migrações anteriores e nenhuma dessas cinco
colunas novas. O código e o banco estavam incompatíveis.

Falhas reproduzidas com JWT válido, antes da correção:

| Endpoint | Operação que falhou | Resultado |
| --- | --- | --- |
| `GET /api/chats/:id/mensagens` | `prisma.mensagem.findMany`, em `chat.service.js`, com inclusão da resposta | HTTP 500, `Erro interno do servidor.` |
| `GET /api/foruns/:id/postagens` | `prisma.postagem.findMany`, em `postagem.service.js`, com inclusão da resposta | HTTP 500, `Erro interno do servidor.` |

O stack capturado apontou as duas consultas acima, com Prisma `P2022` e
PostgreSQL `42703` (coluna inexistente). Os metadados continuavam acessíveis
porque suas consultas não dependiam das novas colunas de mensagens.

O mobile convertia qualquer resposta 5xx nessa mensagem genérica, ocultando a
distinção entre incompatibilidade de schema, indisponibilidade e erro interno.
Autenticação JWT foi mantida; as requisições de diagnóstico não expuseram tokens
ou conteúdos privados nos relatórios.

## Correção no banco

O pedido de correção urgente autorizou aplicar somente a migração necessária.
Antes da aplicação:

- Confirmado `NODE_ENV=development` e que havia somente uma migração pendente.
- Backup completo em `C:\Users\Pichau\.constella\backups\before-respostas-1792809687985.dump`,
  com 66.573 bytes; catálogo verificado por `pg_restore --list`.
- SQL executado em transação de desenvolvimento e revertido, validando as cinco
  colunas, FKs e índices, sem alterar os registros originais.

Aplicada somente `20261023000400_respostas_sistema` pelo `prisma migrate deploy`.
Nenhuma migração nova foi criada nesta rodada. O Prisma Client foi regenerado.
`prisma migrate diff --from-config-datasource --to-schema src/prisma/schema.prisma
--config prisma7.config.ts --exit-code` retornou 0: **nenhuma diferença detectada**.

As tabelas preservam as **10 mensagens e 20 postagens anteriores**, com hashes
idênticos dos campos originais antes/depois. A validação cobriu todas as 30
mensagens/postagens existentes. Não houve reset, exclusão de dados existentes,
alteração de `.env`, commit, push ou merge.

## Arquivos corrigidos nesta rodada

- `backend/src/utils/conversation-error.js` — criado: classificação de erros e
  logs seguros com referência, operação, código Prisma, modelo e locais do stack.
  Não registra SQL, payload, JWT ou conteúdo de mensagem.
- `backend/src/controllers/chat.controller.js`, `postagem.controller.js` e
  `forum.controller.js` — reutilizam o tratamento compartilhado.
- `mobile/src/services/api.ts` — diferencia atualização pendente, falha temporária,
  erro interno, conversa ausente, autenticação e conexão.
- `mobile/src/components/ChatPanel.tsx` — botão de nova tentativa também durante
  falha temporária da atualização; mantém o histórico já carregado. A perda de
  autorização continua removendo conteúdo privado.
- `backend/tests/conversation-error.test.js` e
  `conversas-recovery.database.test.js` — criados: regressão de erros e integração
  HTTP/PostgreSQL com texto, imagens privadas, respostas e histórico.
- `backend/tests/social.test.js`, `mobile/scripts/test-api.cjs` e
  `test-social-ui.cjs` — ajustados/ampliados para as regressões.
- `backend/contracts/social.md`, `backend/proposals/respostas-sistema.md` e o
  relatório anterior — atualizados para indicar migração aplicada e contrato de erros.

Não foi necessário remover respostas, imagens ou notificações para restaurar as
consultas. As mensagens antigas sem imagem/resposta continuam retornando `null`
nesses campos e as conversas vazias retornam listas vazias com HTTP 200.

## Tratamento de erros atual

| Situação | Resposta/experiência |
| --- | --- |
| Falha de rede/timeout no mobile | Aviso de conexão ou demora específico |
| JWT ausente/inválido/expirado | HTTP 401; fluxo de sessão existente preservado |
| Sem acesso ao chat/fórum | HTTP 403; conteúdo privado removido da tela |
| Conversa inexistente | HTTP 404; aviso de conversa não encontrada |
| Schema/tabela incompatível | HTTP 503, `CONVERSAS_ATUALIZACAO_PENDENTE` |
| Banco/pool temporariamente indisponível | HTTP 503, `CONVERSAS_TEMPORARIAMENTE_INDISPONIVEIS` |
| Falha inesperada | HTTP 500, `ERRO_INTERNO_CONVERSA` |

Erros 5xx do tratamento compartilhado incluem uma referência de diagnóstico.
Erros 503 também incluem `Retry-After: 5`. O botão de nova tentativa permanece
disponível; falhas não são substituídas por sucesso ou dados inventados.

## Testes executados

- API local com PostgreSQL real: **3 chats e 4 fóruns existentes retornaram 200**;
  30 registros anteriores carregados e preservados.
- Imagem existente no armazenamento local: acesso binário autenticado retornou
  200. Uma outra referência legada está fora desse armazenamento e não foi
  validada remotamente; seu valor foi preservado.
- `tests/respostas.database.test.js`, com `CONSTELLA_REPLIES_INTEGRATION=1`:
  **passou** — respostas, idempotência, FK e evento de saída transacional.
- `tests/conversas-recovery.database.test.js`, com
  `CONSTELLA_CONVERSATION_INTEGRATION=1`: **passou** — rotas e serviços reais via
  HTTP, JWT, PostgreSQL e arquivos temporários. Valida 200/201, isolamento 403/404,
  imagem binária e ausência de duplicação no reenvio. Todas as linhas TESTE são
  revertidas por rollback; imagens de teste ficam em diretório temporário separado
  dos uploads existentes. Push externo foi desativado apenas no processo de teste.
- Suíte padrão backend: **95 passaram, 8 pulados, 0 falhas**. Duas dessas
  integrações foram executadas separadamente acima; seis integrações de outros
  fluxos não foram executadas nesta rodada.
- Suíte mobile: **58 passaram, 0 falhas**.
- `npm run typecheck`: passou.
- `npm run lint`: 0 erros, 11 avisos já existentes.
- `npm run prisma:generate`: passou; comparação schema/banco sem diferenças.

| Validação solicitada | Evidência executada |
| --- | --- |
| 1. Conversa privada existente | Todas as 3 por HTTP real: 200 |
| 2. Fórum existente | Todos os 4 por HTTP real: 200 |
| 3. Mensagens antigas | 30 registros existentes; teste paginado adicional com 55 registros TESTE por fluxo |
| 4. Enviar/receber texto | POST 201 e GET autenticado da outra participante nos dois fluxos |
| 5. Enviar/carregar imagens | Upload privado 201, vínculo 201, leitura binária 200 e isolamento 404 |
| 6. Responder mensagem específica | Respostas a texto/foto nos dois fluxos, referência conferida no GET |
| 7. Conversa vazia | Listas vazias 200 no banco existente e na integração |
| 8. Fechar/reabrir conversa | GETs repetidos idênticos e teste de remontagem da interface; aparelho físico pendente |
| 9. Atualizar sem erro | Requisições repetidas 200; teste mobile de falha transitória seguido de nova tentativa |
| 10. Preservar dados | Contagens e hashes dos registros existentes idênticos; fixtures de banco revertidas |

O processo local já reiniciou pelo nodemon após as mudanças de controller.
O carregamento pode ser tentado novamente no aplicativo. Validação visual de
toques, câmera e navegação em aparelho físico ainda depende desse teste no celular;
não foi marcada como executada. Não há migração pendente neste banco de desenvolvimento.
