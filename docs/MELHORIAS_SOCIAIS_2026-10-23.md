# O Constella — melhorias sociais e integração mobile

## Entrega e limites

Implementação realizada sobre as telas e os services existentes, preservando identidade visual, React Navigation, JWT, MVC e TypeScript. Não houve commit, push, merge, troca de branch, reset ou exclusão de dados do banco. A migração aditiva foi aplicada **somente no PostgreSQL local de desenvolvimento**, após autorização expressa nesta conversa.

O fluxo pago continua indisponível porque não existe provedor configurado. A demonstração PRO existente continua identificada como demonstração temporária, validada pelo servidor, sem cobrança ou registro de assinatura paga. A integração não foi homologada em um aparelho físico; o roteiro abaixo permanece necessário para conferir teclado, permissões, acessibilidade e diferentes tamanhos de tela.

## Análise da implementação anterior

- A API de recomendações já retornava mais fóruns; a Home limitava a exibição com `slice(0, 2)`.
- Busca por nome já existia em `/api/usuarios?busca=...`; `PersonModal`, `Avatar`, `ForumCover`, feedback global e estados assíncronos puderam ser reutilizados.
- A tela de fóruns filtrava participação apenas para a aba Meus fóruns; o botão de criação ficava na área rolável.
- `ChatPanel` já era compartilhado entre mensagens privadas e postagens de fórum, com atualização periódica e paginação. O banco não possuía leitura por conta, bloqueios ou coluna de imagem para mensagens privadas. Postagens já possuíam `img_post`.
- Upload JPG/PNG já existia para fotos e capas públicas. Esse armazenamento foi estendido com diretório privado e leitura autenticada para anexos.
- O catálogo PRO já separava metadados de material protegido. Foi reaproveitado na tela geral de conteúdos sem duplicar registros no banco.

## Situação dos requisitos

| Item | Situação | Comportamento entregue |
| --- | --- | --- |
| 1. Fóruns na Home | Concluído | Todos os fóruns retornados pela recomendação podem ser percorridos horizontalmente; sem itens fixos. |
| 2. Buscar usuária | Concluído | Busca por nome, com espera de 300 ms durante digitação, estados assíncronos e modal reutilizado. |
| 3. Explorar | Concluído | API filtra não participantes; Meus fóruns filtra participantes. Retorno da conversa recarrega a listagem. |
| 4. Criar fórum | Concluído | Botão compacto com “+”, acessível, no cabeçalho fixo acima das abas; somente a lista rola. |
| 5. PRO na lista geral | Concluído | Metadados do catálogo exclusivo aparecem junto ao catálogo geral, com indicação de bloqueio conforme status. Material continua protegido no servidor. |
| 6. Última mensagem | Concluído | Prévia de texto ou imagem, horário/data, nome, foto e estado neutro para conversas vazias. |
| 7. Não lidas no chat | Concluído | Contador individual persistido, excluindo mensagens próprias; confirmação autenticada ao abrir/atualizar a conversa ativa. |
| 8. Não lidas no fórum | Concluído | Marcador persistido por participação e badge em Meus fóruns; entrada nova não conta o histórico anterior. |
| 9. Bloquear/desbloquear | Concluído | Rotas, validação, autorização, filtro de descoberta e impedimento de interações diretas nos dois sentidos. Aba Bloqueadas permite desfazer o bloqueio. |
| 10. Perfil no chat | Concluído | Foto e nome do cabeçalho abrem o mesmo modal público, incluindo apresentação, interesses, denúncia e bloqueio. |
| 11. Estado PRO | Concluído | Contexto por conta compartilhado entre telas; demonstração atualiza o contexto imediatamente; promoção some com acesso ativo e Perfil oferece Gerenciar assinatura. Compra real permanece fora de operação por ausência de provedor. |
| 12. Imagem no chat | Concluído | Galeria, prévia, remoção, cancelamento do upload, limite, erros, envio e renderização autenticada. Texto anterior continua compatível. |
| 13. Imagem no fórum | Concluído | Mesmo pipeline; postagem com texto, imagem ou ambos. Aproveita a coluna existente. |
| 14. Atualização após ações | Concluído | Envio atualiza a conversa local; bloqueio atualiza o estado do chat pelo modal; listagens recarregam ao retornar; PRO usa estado compartilhado. |
| 15. Estados e feedback | Concluído | Loading, vazio, erros com tentativa novamente e feedback existente nas alterações. Imagem selecionada é mantida em falha/cancelamento para nova tentativa. |
| 16. Arquitetura | Concluído | Rotas/controllers/services existentes preservados, com módulos específicos para bloqueios, leitura e anexos. |
| 17. Banco | Concluído | Schema atualizado, Prisma validado, client gerado e migração aditiva aplicada sem reset. |
| 18. Relatório | Concluído | Inventário, contratos, evidências e roteiro manual neste documento. |

A classificação “concluído” se refere à implementação e às verificações automatizadas descritas aqui. A validação visual no celular permanece pendente. A atualização de mensagens usa consultas periódicas a cada 2 segundos na conversa em primeiro plano; listagens de chats/fóruns consultam a cada 5 segundos enquanto focadas. Não foi introduzido WebSocket.

## Mobile — arquivos

Criados nesta entrega:

- `mobile/src/constexts/ProContext.tsx`: status central do PRO, atualização periódica e proteção contra respostas tardias/troca de conta.
- `mobile/src/components/UserSearch.tsx`: busca de usuárias da Home com debounce e abertura do perfil existente.

Componentes e infraestrutura alterados:

- `mobile/app.tsx`: instalação do provider PRO dentro da autenticação.
- `mobile/src/components/ChatPanel.tsx`: imagens, prévia, cancelamento, leitura, perfil pelo cabeçalho e histórico durante bloqueio.
- `mobile/src/components/PersonModal.tsx`: apresentação pública, bloquear/desbloquear e comunicação da alteração ao chat.
- `mobile/src/services/social.service.ts`: contratos de leitura, bloqueio, filtros de fórum, detalhe de chat e imagens.
- `mobile/src/services/image.service.ts`: upload privado e AbortSignal, preservando fotos/capas públicas.
- `mobile/src/services/api.ts`: cabeçalho de autenticação para imagens privadas no mobile.
- `mobile/src/types/models.ts`: novos campos dos DTOs.
- `mobile/src/utils/conversations.ts`: última mensagem, data e contador na lista unificada de conversas/conexões.
- `mobile/src/utils/media.ts`: resolução da origem dos anexos privados.

Telas alteradas:

- `HomeScreen.tsx`, `ForumScreen.tsx`, `ChatScreen.tsx`, `ChatForumScreen.tsx`.
- `ConexoesScreen.tsx`, `ConversasScreen.tsx`, `ConteudosScreen.tsx`.
- `ConstellaProScreen.tsx`, `DetalheProScreen.tsx`, `PerfilScreen.tsx`.

Testes alterados: `mobile/scripts/integration-api.cjs`, `test-images.cjs`, `test-social-ui.cjs`.

## Backend — arquivos e endpoints

Criados:

- `src/services/bloqueio.service.js`, `src/controllers/bloqueio.controller.js`, `src/routes/bloqueio.routes.js`.
- `src/services/leitura.service.js`, `src/controllers/leitura.controller.js`.
- `src/services/anexo.service.js`, `src/routes/anexo.routes.js`.
- `src/prisma/migrations/20261023000200_social/migration.sql`.
- `backend/contracts/social.md`: contratos, regras e códigos HTTP.

Alterados: `server.js`, schema Prisma, controllers de chat/fórum, rotas de chat/fórum/upload, services de chat, fórum, postagem, conexão, usuária e recomendação. Teste ajustado: `tests/social.test.js`.

Endpoints novos:

| Método | Rota | Finalidade |
| --- | --- | --- |
| GET | `/api/bloqueios` | Perfis bloqueados pela conta autenticada. |
| GET | `/api/bloqueios/:id` | Estado do bloqueio. |
| POST | `/api/bloqueios/:id` | Bloquear outra usuária. |
| DELETE | `/api/bloqueios/:id` | Desfazer somente o próprio bloqueio. |
| POST | `/api/chats/:id/leitura` | Avançar marcador da conta até a mensagem informada. |
| POST | `/api/foruns/:id/leitura` | Avançar marcador da participação até a postagem informada. |
| GET | `/api/anexos/:nome` | Imagem privada com JWT e autorização da conversa/fórum. |

Endpoints alterados:

- `/api/chats`: listagem inclui última mensagem e quantidade não lida; criação por destinatária respeita bloqueios.
- `GET /api/chats/:id`: destinatária pública e indicadores de bloqueio para o modal/campo de envio.
- `POST /api/chats/:id/mensagens`: imagem opcional, texto opcional quando houver imagem e bloqueio no servidor.
- `GET /api/foruns?filtro=meus|explorar`: filtro de participação no servidor e contadores; `GET /api/foruns/meus` também inclui contadores.
- `POST /api/foruns/:id/entrar`: inicia o marcador na postagem mais recente existente.
- `POST /api/foruns/:id/postagens`: aceita imagem sem texto; edição de imagem também valida propriedade.
- `POST /api/uploads/imagens`: opção `privada: true`, sem alterar o comportamento de fotos/capas públicas.
- `/api/usuarios` e `/api/recomendacoes/usuarios`: excluem bloqueios em qualquer sentido; detalhe público inclui apresentação e estado do bloqueio.
- Envio e resposta de conexão respeitam bloqueios entre as contas.

Prisma: tabelas `bloqueio` e `chat_leitura`, coluna opcional `mensagem.imagem_msg` e `usuaria_forum.ultima_postagem_lida` com padrão zero. Marcadores são monotônicos e não possuem FK para a mensagem/postagem, permitindo excluir conteúdo sem quebrar a leitura. A coluna `postagem.img_post` já existia e foi reutilizada.

## Verificações realizadas

- `prisma validate`: schema válido.
- `prisma migrate deploy`: `20261023000200_social` aplicada no banco local autorizado.
- `prisma generate`: client gerado com sucesso.
- Suíte completa do backend: **68 aprovados, 4 opcionais ignorados, zero falhas**. A execução inicial encontrou restrição do ambiente Windows no teste do seed; a execução completa fora do sandbox passou.
- Integração real mobile → Express → Prisma → PostgreSQL: **8 resultados aprovados**, incluindo reinício do servidor, persistência de bloqueios/leitura, anexos, filtros e terceira conta sem permissão.
- Suíte completa do mobile: **39 testes aprovados, zero falhas**; testes do componente de conversa repetidos após o ajuste final de imports: **8 aprovados**.
- TypeScript: `tsc --noEmit` passou. Lint completo: **zero erros e 11 avisos preexistentes**. `git diff --check` passou.
- `prisma migrate status`: banco local atualizado, sem migrações pendentes.
- Export Android: bundle Hermes gerado em `mobile/.expo/social-export`; isso não é um APK e não comprova execução no aparelho.

Os testes de integração criam contas sintéticas identificadas com `TESTE` e e-mails `example.invalid`, fóruns, mensagens e arquivos no banco/servidor local. Esses registros não foram apagados automaticamente. Não foram inventados perfis reais, preços ou pagamentos.

## Roteiro manual no celular

Pré-requisitos: PostgreSQL e backend atualizados em execução; mobile apontando para a API alcançável pelo celular. Usar duas contas próprias, A e B, e uma terceira C para testar isolamento. Quando necessário, aceitar uma conexão A↔B. Para demonstração PRO local, iniciar o backend com `npm run demo`; isso não ativa pagamento real.

1. **Fóruns na Home:** ter pelo menos três fóruns dos quais A não participa. Abrir Home e percorrer horizontalmente os cartões; tocar em cada um e confirmar o fórum correto. Conferir estado vazio quando não houver recomendações.
2. **Busca de usuárias:** digitar parte do nome de B em Buscar usuária, aguardar a busca e tocar no resultado. Conferir foto, nome, apresentação e interesses; buscar nome inexistente e testar retry com backend indisponível.
3. **Explorar:** A entra em um fórum; voltar à lista e verificar que saiu de Explorar e está em Meus fóruns. Se A não for criadora, sair do fórum e confirmar o retorno a Explorar.
4. **Criar fórum:** rolar uma lista longa em tela pequena; o “+” deve permanecer no cabeçalho sem cobrir abas ou itens. Criar fórum e conferir a capa e participação automática.
5. **PRO bloqueado:** com A sem acesso, abrir Conteúdos. Itens exclusivos devem ter identificação/cadeado; tocar abre detalhes bloqueados, nunca o material completo.
6. **Última mensagem:** enviar texto A→B e voltar à lista. Conferir prévia e horário/data. Enviar imagem sem texto; a prévia deve indicar imagem. Conversa vazia deve apresentar convite neutro.
7. **Não lidas no chat:** B permanece fora da conversa; A envia duas mensagens. B vê badge 2 na lista; abrir a conversa zera a badge. Fechar e reabrir sessão/servidor e conferir que a leitura permanece. Mensagens próprias não devem somar.
8. **Não lidas no fórum:** A e B participam; B fica fora. A publica e B vê a badge em Meus fóruns. Abrir o fórum deve confirmar leitura. Publicações anteriores à entrada de uma nova participante não devem somar.
9. **Bloquear/desbloquear:** B bloqueia A pelo perfil. Conferir aba Bloqueadas e preservação do histórico; ambas ficam impedidas de enviar/iniciar interações diretas e deixam de aparecer nas buscas/recomendações uma da outra. B desbloqueia; conferir novo envio. Bloquear a própria conta deve falhar na API.
10. **Modal pelo chat:** tocar na foto e no nome de B no cabeçalho do chat de A; ambos devem abrir o mesmo perfil público. Fechar pelo controle da folha e pelo botão voltar do Android.
11. **PRO compartilhado:** ativar a demonstração local explicitamente identificada; voltar a Conteúdos e Perfil. A promoção deve desaparecer, os exclusivos devem abrir mediante validação do servidor e Perfil deve mostrar Gerenciar assinatura. Encerrar demonstração restaura bloqueios. A conta B continua sem acesso.
12. **Imagem no chat:** escolher arquivo, conferir prévia e remover; selecionar novamente e enviar imagem sozinha e depois texto+imagem. Conferir recebimento por B. Testar cancelamento da galeria, cancelamento durante upload lento, imagem grande e falha de rede. C e requisição sem JWT não devem conseguir abrir a URL privada.
13. **Imagem no fórum:** repetir seleção, prévia, cancelamento e envio com A/B participantes. Após sair do fórum, a conta não deve conseguir ler os novos anexos privados da conversa. Conferir recarregamento e persistência depois de reiniciar o backend.

## Pendências de operação

- Homologação visual/funcional em aparelho físico, incluindo o fluxo nativo de galeria e permissões.
- Pagamento e gerenciamento financeiro real dependem de provedor; não são simulados como assinatura concluída.
- Deploy deve aplicar a migração e preservar o diretório de uploads. Arquivos privados não associados, por exemplo após cancelamento de upload, não têm expurgo automático nesta entrega.
