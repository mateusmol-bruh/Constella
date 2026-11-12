# Correções de mensagens, imagens e notificações — 23/10/2026

Atualização posterior: a migração foi autorizada e aplicada no banco de
desenvolvimento durante a correção urgente. O carregamento foi restaurado e as
integrações reais de conversas passaram. O texto abaixo registra a primeira
rodada; o estado atual está em `RECUPERACAO_CONVERSAS_2026-10-23.md`.

Implementação preparada no código do Constella. A migração nova não foi aplicada;
o funcionamento completo depende dela e da configuração real do push. Nenhum
commit, push, merge, troca de branch ou alteração de `.env` foi realizado.

## Mobile

Arquivo criado: `mobile/src/components/ConversationImage.tsx`.

Arquivos modificados:

- `src/components/ChatPanel.tsx`: responder por pressão longa ou botão, prévia
  cancelável, citação clicável, busca no histórico paginado, destaque da original,
  aviso de sistema centralizado, prévia da foto, cancelamento e nova tentativa.
- `src/screens/ChatScreen.tsx` e `ChatForumScreen.tsx`: mapeamento de respostas,
  eventos de sistema e envio dos novos campos pelos services existentes.
- `src/services/image.service.ts`: câmera/galeria sem recorte nas conversas,
  normalização JPEG, maior dimensão de 2048 px, compressão e limite de 2 MB;
  transporte JSON/base64 autenticado e timeout de 60 s. Foto/capa com proporção
  explícita mantêm o comportamento anterior do seletor.
- `ConversationImage.tsx` e `src/utils/layout.ts`: dimensões proporcionais,
  carregamento, erro com nova tentativa e modal para a foto completa; anexos
  privados continuam usando JWT. A proporção é preservada, não a resolução original.
- `src/services/social.service.ts`, `community.service.ts`, `api.ts` e
  `src/types/models.ts`: respostas tipadas, chave estável de envio e atualização
  das listas após operações. Repetir um envio confirmado não cria outra mensagem.
- `src/constexts/NotificationsContext.tsx`,
  `src/services/notifications.service.ts`, `notifications-navigation.ts`,
  `src/screens/ConexoesScreen.tsx` e `src/types/navigation.ts`: abertura direta
  das solicitações, perfil da solicitante, atualização ao toque e correção de
  corrida entre logout e registro do token. Dois toques durante uma navegação
  pendente são processados.
- `package.json` e `package-lock.json`: adicionado somente o módulo necessário
  `expo-image-manipulator ~58.0.15`, compatível com o SDK instalado. As alterações
  de versões que já estavam no workspace foram preservadas.
- `scripts/test-images.cjs`, `test-social-ui.cjs` e `test-notifications.cjs`:
  cobertura automatizada dos comportamentos acima.

Em falha transitória durante atualização, o histórico permanece visível com erro
informado. Se a API negar autorização, o conteúdo privado é removido da tela.
Não foi adicionado gesto lateral; a resposta está disponível por pressão longa
e botão acessível. A paleta e o componente compartilhado de conversa foram mantidos.

## Backend

Nenhum endpoint novo. Contratos existentes ampliados:

| Endpoint | Alteração |
| --- | --- |
| `POST /api/chats/:id/mensagens` | `resposta_id` e `envio_id` opcionais; resposta no DTO |
| `GET /api/chats/:id/mensagens` e `GET /api/chats` | Referência à original na mensagem |
| `POST /api/foruns/:id/postagens` | Mesmos campos, com validação de participação |
| `GET /api/foruns/:id/postagens` | Resposta e distinção entre mensagem/sistema |
| `DELETE /api/foruns/:id/sair` | Saída e aviso persistente na mesma transação; repetição idempotente |
| Listagens de fóruns | Eventos de saída não aumentam mensagens não lidas |

Service criado: `backend/src/services/resposta.service.js`.

Modificados: `chat.controller.js`; services `chat`, `postagem`, `forum`, `anexo`,
`notificacao` e `push-worker`. Os arquivos seguem os diretórios existentes de
controllers/services. Os contratos `social.md`, `uploads.md` e `notificacoes.md`
foram atualizados em `backend/contracts`.

As respostas só vinculam uma original da mesma conversa/fórum autorizado. A
unicidade de `envio_id` por autora e a trava transacional permitem repetir a
requisição depois de perder a resposta HTTP, sem duplicar mensagem ou push.
Validação e vínculo de anexos usam a mesma transação. Avisos de saída não podem
ser editados/excluídos como postagens comuns; não têm autora no DTO.

A infraestrutura real de fila/Expo Push foi reutilizada. O worker consulta nome,
prévia de texto e tipo de mensagem após validar acesso, bloqueios, conexão aceita,
participação, leitura e vínculo atual do dispositivo. Essas prévias não são
copiadas para a fila persistente. O texto pode aparecer na tela bloqueada conforme
as preferências do aparelho. Fotos/anexos privados não são anexados ao push.

Agrupamento por conta/conversa utiliza `collapseId` e `tag`, conforme o
[contrato oficial do Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/).
Os contadores continuam vindo do servidor. Avisos de saída não geram broadcast.

O upload permanece em `POST /api/uploads/imagens`, com JSON/base64, JWT, validação
JPG/PNG de até 2 MB e armazenamento privado existente. Não foi trocado por
FormData: o servidor atual não utiliza multipart. Nenhum arquivo de usuária foi
removido, e o diretório persistente de armazenamento continua necessário.

## Banco de dados

Migração criada: `backend/src/prisma/migrations/20261023000400_respostas_sistema/migration.sql`.

| Tabela | Campos adicionados |
| --- | --- |
| `mensagem` | `resposta_id` nullable, `envio_id` nullable |
| `postagem` | `resposta_id` nullable, `envio_id` nullable, `tipo_post` com padrão `MENSAGEM` |

Inclui FKs para as originais, índices e unicidade da chave de envio por autora.
Excluir uma original anula a referência, sem apagar respostas. Registros antigos
continuam como mensagens comuns. Não remove tabelas, registros ou migrações.

Proposta e risco: `backend/proposals/respostas-sistema.md`. ALTER TABLE e criação
de índices podem bloquear escritas temporariamente. O backend atualizado precisa
dessas colunas antes de atender as conversas. A aplicação exige autorização
explícita pelo `AGENTS.md`.

A consulta somente de leitura ao PostgreSQL confirmou as quatro migrações
anteriores aplicadas, incluindo `20261023000300_push`. Não aplicou a nova migração
nem gravou dados. O schema foi validado pelo Prisma e o client foi gerado.

## Investigação e validação

Problemas confirmados no código anterior: recorte obrigatório, ausência de
normalização de fotos grandes antes do limite de 2 MB, dimensão fixa das imagens,
falta de chave de repetição para mensagem e ausência de respostas/aviso de saída.
O fluxo existente de push já enfileirava mensagens e conexões; não foi recriado.

Na configuração local, a URL da API corresponde à interface de rede e à porta do
backend, mas a API não respondeu ao teste HTTP desta rodada. Isso não comprova
acesso pelo celular nem permite atribuir todos os erros observados a uma única
causa de rede. Não foram modificados `.env`, firewall ou credenciais.

Verificações executadas:

- Mobile: `node --test --test-reporter=spec scripts/test-*.cjs`: **55 passaram**.
- Backend: `node --test --test-reporter=spec tests/*.test.js`: **92 passaram,
  7 pulados**, nenhum erro.
- Mobile `npm run typecheck`: passou.
- Mobile `npm run lint`: 0 erros e 11 avisos já existentes.
- Backend `npm run prisma:validate` e `npm run prisma:generate`: passaram.
- `npx expo export --platform android --output-dir dist/messages-review-final`:
  bundle Android gerado. Exportar JavaScript não equivale a testar um build nativo.
- `git diff --check`: passou.

Os testes de resposta, idempotência, imagem e navegação usam dependências simuladas;
os testes HTTP de upload existentes usam arquivos temporários. Não representam
teste real de câmera, compressão nativa ou push no aparelho. O teste novo
`backend/tests/respostas.database.test.js` ficou pulado: aguarda migração
autorizada e usa somente dados TESTE em transação revertida por rollback.

| Cenários solicitados | Resultado desta rodada |
| --- | --- |
| Responder texto/foto no chat e mensagem no fórum | Cobertura automatizada passou; aparelho pendente |
| Cancelar resposta e localizar original antiga | Cobertura automatizada passou; aparelho pendente |
| Selecionar vertical/horizontal/quadrada sem corte | Opções e proporções testadas com mocks; câmera/galeria nativas pendentes |
| Abrir imagem inteira com JWT | Componente testado com mocks; aparelho pendente |
| Falha/repetição de envio e confirmação do backend | Cobertura automatizada passou; rede real pendente |
| Persistência da nova resposta/foto após reiniciar | PostgreSQL e reabertura real pendentes |
| Saída com evento único e estilo de sistema | Cobertura automatizada passou; PostgreSQL/aparelho pendentes |
| Push privado, fórum e solicitação | Fila, autorização, conteúdo e navegação testados com mocks; envio real pendente |
| App aberto, em segundo plano e fechado | Não executado em aparelho físico |

## Pendências e comandos

1. Autorizar a aplicação da migração no banco de desenvolvimento, com backup e
   revisão da proposta. Após a autorização, em `backend`:

   ```powershell
   npx prisma migrate deploy --config ./prisma7.config.ts
   npm run prisma:generate
   $env:CONSTELLA_REPLIES_INTEGRATION = '1'
   node --test tests/respostas.database.test.js
   Remove-Item Env:CONSTELLA_REPLIES_INTEGRATION
   npm run dev
   ```

2. Configurar o projeto EAS real (`EXPO_PUBLIC_EAS_PROJECT_ID`), Firebase Android
   (`GOOGLE_SERVICES_JSON`/credenciais FCM no EAS) e, para iOS, identificador do
   app e credenciais APNs. O push local está desativado e o ID EAS não está
   configurado. Depois da configuração, habilitar `CONSTELLA_PUSH_ENABLED=true`
   no backend e reiniciá-lo. Não foram inventadas nem criadas credenciais.
3. Instalar um build compatível com os módulos nativos, permitir notificações
   pelo Perfil e testar com duas contas de teste. O código não simula push com
   notificações locais. O perfil `preview` existente exige API HTTPS pública;
   para usar API LAN, utilizar build de desenvolvimento configurado para ela.
4. Validar acesso à API a partir do celular e persistência de `UPLOADS_DIR` no
   ambiente de execução. Reiniciar o Expo após mudanças de configuração; em
   `mobile`, `npx expo start --clear`.
5. Executar a matriz manual no aparelho e confirmar mensagens/imagens ao reabrir
   a conversa e push nos três estados do aplicativo.
