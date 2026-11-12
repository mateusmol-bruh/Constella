# O Constella — refinamento, limite gratuito e push

## Resultado e limites da entrega

As melhorias foram feitas sobre a implementação existente. Foram reaproveitados `ChatPanel`, `PersonModal`, upload de imagens, sistema de sessão, catálogo/status PRO, componentes de formulário, cabeçalhos, avatares, capas e estados assíncronos. React Navigation, MVC, JWT e TypeScript foram preservados.

**Push ainda não está operacional em aparelhos:** a usuária informou que não possui projeto EAS/credenciais configurados. O código de registro, fila, envio, recibos e navegação está implementado, mas falta configurar EAS/FCM/APNs e homologar um build instalado. Não foi simulado recebimento de push como entrega real. O teste de transporte usa substituto controlado somente nos testes unitários.

Não há aparelho/emulador disponível nesta sessão para homologar câmera, push aberto/fechado, teclado e layouts. A exportação Android não substitui esses testes. A responsividade foi revisada no código e nas regras de layout; não se declara “100% homologada”.

Não houve commit, push, merge, troca de branch, reset, remoção de migrations ou exclusão de dados existentes. A nova migração foi aplicada ao banco local após autorização expressa na conversa. Arquivos `.env` reais não foram sobrescritos.

## Análise e decisões

- Home, busca por nome, filtro de Explorar, bloqueios, leitura persistente, imagens privadas e status central PRO já tinham implementação da entrega anterior; foram preservados e refinados.
- A Home já exibia a lista completa da API em rolagem horizontal; nenhum fórum foi fixado manualmente.
- A busca foi integrada a um campo compacto com foco, contraste e área de limpeza adequados. A troca de termo passou a reiniciar o recurso por identidade, eliminando a chamada duplicada na montagem.
- A API não limitava criações de fóruns por conta. A nova regra conta fóruns atualmente pertencentes à criadora e utiliza status validado pelo servidor, com lock da conta para impedir duas criações simultâneas.
- Conteúdos gratuitos e PRO receberam seções explícitas; catálogo PRO continua somente com metadados para a conta gratuita. Foi reutilizada a arte de capa existente, pois o catálogo não tem campo de imagem real de capa.
- O seletor de imagem já suportava câmera, mas o compositor de fórum só chamava galeria. Agora há escolha de origem e opção de refazer antes de enviar.
- O toast existente era uma faixa simples. Agora há tipos, ícones, animação curta, respeito a movimento reduzido, fechamento e substituição do aviso anterior sem pilha.
- Fóruns passaram de ScrollView com todos os itens para FlatList e páginas de 30. Contadores são calculados em lote. Com push ativo, avisos no primeiro plano invalidam os recursos focados; sem push, a lista mantém atualização periódica de 5 segundos. Chat continua atualizando a cada 2 segundos em primeiro plano.
- A API de conteúdos atual não tem publicação administrativa/broadcast. Não foi inventado um evento de sistema ou um endpoint público para disparar notificações. Também não há threads/respostas encadeadas que justifiquem um evento separado de resposta.

## Status de cada item do pedido

“Concluído” significa código implementado e verificação descrita neste relatório; a homologação visual e nativa está separada nos itens 19 e 27.

| Item | Status | Entrega ou pendência |
| --- | --- | --- |
| 1. Mais fóruns na Home | ✅ Concluído | Lista real completa da recomendação, com rolagem horizontal e estados existentes. |
| 2. Busca da Home | ✅ Concluído | Campo refinado, debounce, foto/nome, erro, vazio e modal público reutilizado. |
| 3. Explorar | ✅ Concluído | Filtro no servidor por não participação; retorno após entrar/sair recarrega o recurso. |
| 4. Limite gratuito | ✅ Concluído | Um fórum por conta gratuita, validação no servidor, código de erro e CTA; concorrência testada no PostgreSQL. |
| 5. Criar fórum | ✅ Concluído | “+” compacto permanece no cabeçalho fixo; lista rola separadamente. |
| 6. Separação de conteúdos | ✅ Concluído | Seções gratuitas e PRO com títulos e contexto explícitos. |
| 7. PRO para gratuitas | ✅ Concluído | Título, capa ilustrativa existente, descrição, identificação e cadeado; material protegido. |
| 8. PRO para assinantes | ✅ Concluído | Exclusivos liberados conforme status do servidor, mantendo a seção própria. |
| 9. Card Conhecer PRO | ✅ Concluído | Contexto central existente preservado; promoção oculta com acesso ativo e Perfil oferece gerenciamento. Compra paga continua indisponível sem provedor. |
| 10. Última mensagem | ✅ Concluído | Prévia, imagem, data, foto e contador existentes preservados; linhas refinadas. |
| 11. Leitura de chat | ✅ Concluído | Persistência e atualização ao abrir mantidas; novas transações validadas com API real. |
| 12. Leitura de fórum | ✅ Concluído | Contador persistente agora calculado por lote, incluindo listagem paginada. |
| 13. Modal no chat | ✅ Concluído | Foto/nome abrem o perfil público; ações e apresentação preservadas. |
| 14. Bloqueios | ✅ Concluído | Mantidos; fila push também respeita bloqueio antes de entregar eventos pendentes. |
| 15. Fotos no chat | ✅ Concluído | Pipeline privado preservado; dimensões da imagem adaptadas à largura útil. |
| 16. Câmera e galeria no fórum | ⚠️ Parcialmente concluído | Origem, permissão, cancelamento, prévia, refazer e envio integrados/testados em código; falta homologação com câmera física. |
| 17. Push real | ⚠️ Parcialmente concluído | Infraestrutura completa no código e fila testada; faltam projeto/credenciais e recebimento real em aparelho. |
| 18. Toasts | ✅ Concluído | Sucesso, erro, aviso e informação; animação, ícone, fechamento, movimento reduzido e sem empilhar. |
| 19. Responsividade 100% | ⚠️ Parcialmente concluído | Componentes e telas revisados; não há comprovação visual em todos os tamanhos/Android/iOS. |
| 20. Layout geral | ✅ Concluído | Refinamento de hierarquia, botões, busca, linhas, margens, cards e modais preservando rosa/roxo. |
| 21. Consistência | ✅ Concluído | Componentes compartilhados refinados; ações de fórum em menu para liberar espaço no cabeçalho. |
| 22. Estados | ✅ Concluído | Loading, vazio, erro/retry, limite e atualização de sucesso tratados nos fluxos alterados. |
| 23. Atualização de UI | ✅ Concluído | Atualização local, retorno por foco, invalidação por push e fallback periódico; sem exigir reinício. |
| 24. Performance | ✅ Concluído | Paginação e virtualização de fóruns, contadores em lote, debounce e remoção de montagem duplicada; sem memoização indiscriminada. |
| 25. Requisitos técnicos | ✅ Concluído | Arquitetura atual preservada; sem mocks permanentes no aplicativo nem rotas de pagamento inventadas. |
| 26. Banco | ✅ Concluído | Schema validado, client gerado e migração aditiva aplicada no PostgreSQL local autorizado. |
| 27. Testes manuais finais | ❌ Não concluído | Sem aparelho/emulador nesta sessão. Os 25 cenários estão preparados abaixo; testes automatizados não são apresentados como testes manuais. |
| 28. Relatório | ✅ Concluído | Inventário, contratos, configuração, resultados e roteiro neste documento. |

## Mobile: arquivos desta entrega

Criados:

- `src/constexts/NotificationsContext.tsx`: registro por conta, permissão, recepção, atualização do token, logout e abertura autenticada do destino.
- `src/services/notifications.service.ts`: integração com Expo Notifications, SecureStore e endpoints reais.
- `src/services/notifications-navigation.ts`: espera pela navegação/sessão prontas e deduplicação de taps.
- `src/utils/notifications.ts`: validação de payload e IDs, sem abrir URLs arbitrárias.
- `src/utils/layout.ts`: margens, colunas por tamanho/fonte e largura útil da imagem de conversa.
- `src/hooks/useDebouncedValue.ts`: debounce reutilizável.
- `scripts/test-notifications.cjs`: payload, navegação e regras de layout.

Modificados:

- `app.tsx`: provider e referência da navegação.
- `app.json`, `app.config.js`: plugin de notificações e configuração externa do projeto/Firebase.
- `package.json`, `package-lock.json`: `expo-notifications ~58.1.6`, compatível com SDK 58.
- `.env.example`, `README.md`: variáveis e instruções; `.env` real preservado.
- `src/constexts/FeedbackContext.tsx`: novo toast mantendo a API `useFeedback`, com tipo opcional.
- `src/constexts/AuthContext.tsx`: revogação do dispositivo antes da saída local.
- `src/hooks/useResource.ts`: identidade do recurso e invalidação por evento, com cancelamento/limpeza.
- `src/components/ui.tsx`: busca, margens adaptativas, botões, alvos de toque e chips.
- `src/components/Social.tsx`: linhas e Sheet com fechamento fixo, rolagem e adaptação ao teclado.
- `src/components/UserSearch.tsx`: debounce compartilhado e uma leitura inicial por termo.
- `src/components/ChatPanel.tsx`: câmera/galeria, imagem responsiva, menu de ações e confirmação rolável com Safe Area/teclado.
- `src/components/PersonModal.tsx`: informação de bloqueio no próprio modal, além do toast.
- `src/screens/HomeScreen.tsx`: busca integrada e margens do painel.
- `src/screens/ForumScreen.tsx`: FlatList, busca/páginas reais e “+” fixo.
- `src/screens/CriarForumScreen.tsx`: limite, feedback/CTA e validação do servidor antes da criação.
- `src/screens/ConteudosScreen.tsx`: seções e grade adaptada ao tamanho da fonte/tela.
- `src/screens/PerfilScreen.tsx`: ativação de notificações por ação explícita.
- `src/screens/InteressesScreen.tsx`: opções flexíveis em telas menores.
- `src/styles/theme.ts`, `src/services/api.ts`, `src/services/image.service.ts`, `src/services/social.service.ts`.
- `scripts/test-session.cjs`, `scripts/test-social-ui.cjs`: contratos atualizados e teste de origem/refazer foto.

Revisão das demais telas: login, cadastro, splash, onboarding, apresentação, verificação de conta, recuperação de senha, interesses, perfil, conexões, chats, fóruns, conteúdos, detalhes, PRO e visitante. Telas sem edição direta recebem as melhorias de Screen, Header, Button e Sheet. Não se alterou a arte real do onboarding, a persistência de conclusão inicial ou o fluxo JWT.

## Backend e banco

Criados:

- `src/services/notificacao.service.js`: dispositivos, fila transacional e autorização de entrega.
- `src/services/push-worker.service.js`: Expo Push API, recibos, tentativa posterior e token inválido.
- `src/controllers/notificacao.controller.js`, `src/routes/notificacao.routes.js`.
- `src/prisma/migrations/20261023000300_push/migration.sql`.
- `contracts/notificacoes.md`.
- `tests/forum-limit.test.js`, `tests/forum-limit.integration.test.js`, `tests/push.test.js`, `tests/push-storage.integration.test.js`.

Modificados:

- `server.js`: rota de dispositivos e worker no processo principal, condicionado à configuração.
- `src/prisma/schema.prisma`: dois models novos e relações com usuária.
- `src/services/forum.service.js`: limite, lock, status PRO, busca/paginação e contadores em lote.
- `src/controllers/forum.controller.js`, `src/routes/forum.routes.js`: endpoint de limites, paginação e código de negócio.
- `src/services/chat.service.js`, `src/services/postagem.service.js`, `src/services/conexao.service.js`: gravação do evento e da fila na mesma transação. Solicitações concorrentes da mesma dupla são serializadas para não gerar conexões/notificações duplicadas.
- Controllers de chat, postagem e conexão: logs internos registram somente código/tipo do erro, evitando incluir argumentos de fila/tokens em erros de transação.
- `.env.example`, `tests/social.test.js`.

Endpoints novos:

| Método | Rota | Contrato |
| --- | --- | --- |
| GET | `/api/foruns/limites` | `criados`, `limite` (null para PRO), `pode_criar`, `pro`. |
| PUT | `/api/notificacoes/dispositivo` | JWT + token/plataforma; associa o aparelho à conta atual. |
| DELETE | `/api/notificacoes/dispositivo` | JWT + token; desativa somente o vínculo da própria conta e cancela pendências. |

Alterados: criação/listagem de fóruns e gravação de mensagens, postagens e conexão/aceite. O POST de criação retorna 403 com `codigo=LIMITE_FORUNS_GRATUITO` quando necessário. A lista suporta `pagina`, `limite` e `busca`, com `tem_mais` e ordenação estável por data/ID. Contratos completos: `backend/contracts/notificacoes.md`.

Banco:

- `dispositivo_push`: `token`, `id_usr`, `plataforma`, `ativo`, `atualizado_em`.
- `notificacao_push`: `id_push`, `chave`, `token`, `id_usr`, `dados`, `estado`, `tentativas`, `ticket`, `erro`, `proxima_tentativa`, `criado_em`.
- Índice único por evento/dispositivo e índices de busca da fila. Nenhum campo anterior removido ou tabela anterior apagada.
- Migração **`20261023000300_push` aplicada no banco local**, sem reset. Outros ambientes precisam aplicá-la antes de iniciar esta versão com push habilitado.

## Configuração local e push

A dependência já foi instalada neste workspace. Para reproduzir em outro checkout:

```powershell
cd mobile
npm.cmd install

cd ../backend
npm.cmd install
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

`migrate deploy` já foi executado no banco local desta sessão; não execute comandos de reset. Para rodar normalmente:

```powershell
# Terminal 1, na raiz
cd backend
npm.cmd run dev

# Terminal 2, na raiz
cd mobile
npm.cmd run configure:api
npm.cmd start
```

Para push real, ainda é necessário fazer a configuração externa:

1. Criar/vincular o projeto EAS real do Constella e obter seu projectId. O aplicativo usa `com.constella.app` no Android; o cadastro Firebase deve corresponder a esse identificador.
2. Configurar FCM v1 no EAS para Android e informar o `google-services.json` correto ao build. O JSON de service account privado do FCM é uma credencial diferente e deve ser configurado no EAS, nunca inserido no código mobile.
3. Se houver distribuição iOS, definir o bundle identifier real e configurar as credenciais APNs com a conta Apple correspondente.
4. Definir no ambiente local/EAS do mobile:

```dotenv
EXPO_PUBLIC_API_URL=<origem real da API alcançável pelo aparelho>
EXPO_PUBLIC_EAS_PROJECT_ID=<projectId real do EAS>
GOOGLE_SERVICES_JSON=<caminho do google-services.json real para o build Android>
```

5. No backend, após migração e configuração:

```dotenv
CONSTELLA_PUSH_ENABLED=true
# Opcional, se enhanced push security estiver habilitada no Expo:
EXPO_PUSH_ACCESS_TOKEN=<segredo somente no servidor>
```

6. Gerar/instalar um build próprio. Os comandos abaixo são instruções para a usuária; **não foram executados** e não se criou conta/build na nuvem automaticamente:

```powershell
cd mobile
npx.cmd eas-cli login
npx.cmd eas-cli init
npx.cmd eas-cli credentials -p android
npx.cmd eas-cli build -p android --profile preview
```

O perfil preview existente exige API HTTPS pública real no ambiente EAS. Informe as variáveis pelo ambiente do build; não coloque segredos em `EXPO_PUBLIC_*`. Depois de instalar, entrar na conta e tocar em **Perfil → Ativar notificações**.

Fontes oficiais utilizadas: [Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [configuração de push](https://docs.expo.dev/push-notifications/push-notifications-setup/), [FCM v1](https://docs.expo.dev/push-notifications/fcm-credentials/) e [envio/recibos Expo](https://docs.expo.dev/push-notifications/sending-notifications/).

Câmera e galeria usam `expo-image-picker` já existente e o plugin de permissões já configurado. Não exigem outro servidor de imagem. Fotos continuam limitadas a 2 MB/JPG/PNG e armazenadas como arquivos; base64 é somente transporte. No fórum, “Tirar foto” abre a câmera e a prévia permite refazer/remover antes de enviar.

## Evidências de validação

- Prisma: schema válido, migração aplicada e client gerado.
- Mobile: **44 testes aprovados**, incluindo sessão, imagens, origem câmera/galeria, refazer, cancelamento, leitura, navegação, payload push e logout durante registro do token.
- TypeScript: `tsc --noEmit` passou.
- Lint completo: **zero erros e 11 avisos preexistentes**. Os novos componentes/contextos também passaram na checagem direcionada.
- Backend: **78 testes aprovados, seis opcionais ignorados e zero falhas** na suíte completa; as duas novas integrações de banco foram executadas separadamente e passaram. Houve atualização de fixtures para a nova gravação transacional.
- Integração real de limites/API/PostgreSQL: passou, incluindo criações concorrentes, PRO de demonstração, duas páginas sem repetição, conexão concorrente, aceite, chat, postagem e contador real.
- Integração real da fila/PostgreSQL: passou, validando chave única e exclusão da autora. Tokens sintéticos existiram somente dentro de uma transação revertida, sem persistir ou enviar push externo.
- Export Android: bundle Hermes gerado em `mobile/.expo/refinement-export`, com 1313 módulos. Não é um APK e não comprova execução no dispositivo.
- `git diff --check`: sem erros de whitespace.

Os testes de API criaram contas identificadas por `TESTE` e e-mails `example.invalid`, fóruns, conexão e conteúdo sintéticos. Nada foi apagado no final, respeitando o pedido. Não se rodou a integração antiga que excluía um fórum de teste.

`npm audit` apontou alerta alto transitivo em `node-forge`, propagado na árvore do Expo, sem correção automática reportada pelo npm nesta instalação. Não se alterou o SDK nem se executou `npm audit fix --force`. Trata-se de pendência de dependência, não de resultado de teste de push.

## Roteiro dos 25 testes manuais pendentes

Usar duas contas A/B, conexão aceita quando necessário, build instalado e API alcançável. Para verificar apenas o PRO de demonstração local, usar o comando já existente `npm run demo` no backend; nenhuma compra é efetuada.

| Cenário | Como conferir |
| --- | --- |
| 1. Fóruns na Home | Ter pelo menos três recomendações reais da API, percorrer horizontalmente e abrir o fórum correto. |
| 2. Busca de usuárias | Digitar parte do nome de B, abrir o resultado e buscar um nome inexistente. |
| 3. Design da busca | Conferir foco, ícone, limpeza do termo, fonte ampliada e teclado em tela pequena. |
| 4. Explorar | Entrar/sair de um fórum e voltar; conferir que a participação altera a aba sem reiniciar. |
| 5. Limite gratuito | A cria o primeiro fórum; o segundo deve mostrar limite/CTA e a API deve recusar mesmo com requisição direta. |
| 6. PRO e criação | Ativar acesso validado pelo servidor; voltar à criação e conferir liberação sem relogin. |
| 7. Botão de criação | Rolar lista longa e conferir o “+” fixo, sem cobrir abas/itens ou Safe Area. |
| 8. Conteúdos | Conferir seções gratuitas e PRO e comportamento da busca nas duas. |
| 9. PRO bloqueado | Conta gratuita vê metadados/cadeado, mas nunca o material completo. |
| 10. Card PRO | Com acesso ativo, a promoção desaparece; ao encerrar/expirar, o bloqueio retorna. |
| 11. Gerenciamento | Perfil mostra Gerenciar assinatura com acesso ativo e a tela reflete status real/demonstração; não confirma pagamento. |
| 12. Última mensagem | Texto, foto sem texto, data e conversa vazia apresentam a prévia correta. |
| 13. Badge chat | A envia enquanto B está fora; abrir em B confirma leitura persistente e atualiza a listagem. |
| 14. Badge fórum | Repetir em fórum participado, excluindo postagens próprias e histórico anterior à entrada. |
| 15. Modal do chat | Tocar na foto/nome, conferir apresentação/interesses e fechamento em tela menor. |
| 16. Bloqueio | Bloquear B, conferir histórico preservado e envio impedido; desbloquear e testar novamente. |
| 17. Galeria | Selecionar, remover, cancelar upload e enviar foto com/sem texto; verificar recebimento. |
| 18. Câmera | Negar/conceder permissão, fotografar, refazer, cancelar e enviar no fórum. Verificar falha de câmera e alternativa da galeria. |
| 19. Push aberto | Com EAS/credenciais prontos, B recebe evento fora da conversa; dentro da conversa correspondente não há banner redundante. |
| 20. Push em segundo plano | Minimizar em B; enviar mensagem/foto/solicitação por A, receber e tocar para abrir o destino correto. |
| 21. Push fechado | Encerrar normalmente o app e testar a abertura pelo push. “Forçar parada” do Android tem restrições do próprio sistema e não equivale a encerrar normalmente. |
| 22. Toasts | Verificar sucesso/erro/aviso/informação, substituição sem empilhar, fechamento e movimento reduzido. |
| 23. Responsividade | Conferir aparelhos pequenos/grandes e escala de fonte ampliada, em Android/iOS suportado. |
| 24. Teclado | Cadastro, edição de perfil, denúncia e compositor devem continuar acessíveis com teclado aberto. |
| 25. Telas menores | Conferir título do fórum, menu de ações, modais roláveis, imagens, grid de conteúdo e opções de interesse. |

Recebimento real de push e homologação dos cenários visuais/nativos continuam pendentes. Configuração externa, pagamento real e atualização da dependência vulnerável não foram apresentados como concluídos.
