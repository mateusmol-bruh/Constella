# Integração local do Constella

Raiz utilizada: `Desktop/Constella/`. A outra cópia indicada em algumas abas do IDE não foi modificada.

## Execução

Em terminais separados, a partir da raiz:

```powershell
cd backend
npm run dev
```

```powershell
cd mobile
npx expo start --clear
```

O backend usa o `.env` já existente. O mobile usa `EXPO_PUBLIC_API_URL` em seu arquivo local, sem segredos. Use a origem HTTP acessível pelo celular; a URL do Metro/Expo não substitui a URL da API. Os serviços acrescentam `/api`; um sufixo `/api` na configuração é normalizado para evitar duplicação. Os arquivos `.env` existentes foram preservados e estão ignorados pelo Git.

## Banco de desenvolvimento

PostgreSQL 17.11; Prisma e client 7.10.0. A migração aditiva `20261023000100_onboarding` foi autorizada explicitamente em 23/10/2026 e aplicada: `usuaria.onboarding_concluido` booleano NOT NULL default false e `apresentacao` varchar(500) opcional. Não houve reset. Registro e impacto: [proposta aprovada](../backend/proposals/onboarding.md).

O seed exige `NODE_ENV=development`, `ALLOW_DEVELOPMENT_SEED=true` e `SEED_PASSWORD` fornecida de modo privado, com no mínimo 12 caracteres. Não é executado ao iniciar o servidor. Duas execuções foram verificadas sem duplicações. Não use o SQL arquivado da proposta para reaplicar a migração.

Testes de integração deixaram contas claramente identificadas como TESTE no banco de desenvolvimento. Dados anteriores foram preservados.

## Contratos utilizados

Todas as rotas abaixo, exceto login/cadastro, exigem JWT Bearer. A identidade vem do JWT, nunca do ID da remetente no corpo.

| Fluxo | Rotas | Contrato e controle |
| --- | --- | --- |
| Autenticação | POST /api/auth/login; POST /api/auth/cadastro | Login por email/senha; cadastro também nome/CPF. Resposta token e usuaria com estado explícito do onboarding. Detalhes em [auth/perfil/interesses](../backend/contracts/auth-perfil-interesses.md). |
| Perfil | GET/PUT /api/perfil | Apenas própria conta; nome, email, foto e apresentação suportados; CPF/hash não são retornados. |
| Onboarding | PUT /api/perfil/onboarding | {apresentacao, interesses: string[]}; zero a dez IDs válidos. Transação grava escolhas e conclusão; lista vazia não significa pendência. |
| Interesses | GET /api/interesses; GET/PUT /api/interesses/meus | Catálogo real e escolhas da própria usuária. Editar depois não reinicia onboarding. |
| Conexões | GET /api/usuarios?busca=; GET /api/usuarios/:id; GET /api/conexoes; GET /api/conexoes/recebidas e /enviadas; POST /api/conexoes/:id; PATCH /api/conexoes/:id/aceitar ou /recusar | Busca no servidor, solicitação e resposta pelo destinatário autorizado. IDs e status retornados pelo servidor. |
| Chats privados | GET/POST /api/chats; GET/POST /api/chats/:id/mensagens; DELETE /api/chats/:id/mensagens/:idMensagem | Criação com id_destinataria e conexão aceita; envio {conteudo}; leitura só participantes. Histórico pagina/limite até 50, cronológico no cliente; exclusão própria. |
| Fóruns | GET/POST /api/foruns; GET /api/foruns/:id; POST /api/foruns/:id/entrar; DELETE /api/foruns/:id/sair | Metadados autenticados permitem decidir participar; criadora não sai do próprio fórum. Criação {titulo, descricao, capa}. |
| Conversa do fórum | GET/POST /api/foruns/:id/postagens; DELETE /api/postagens/:id | Postagens existentes reutilizadas, sem misturar chat privado. Participação obrigatória para ler/enviar/editar/excluir; exclusão só da autora. Paginação pagina/limite, padrão/máximo 50, resposta {pagina, limite, postagens}; servidor desc, cliente cronológico. |
| Denúncias | POST /api/denuncias/mensagens/:id; POST /api/denuncias/postagens/:id | {motivo}; acesso ao alvo validado. A moderação administrativa permanece nas APIs existentes; não há botão administrativo concedendo permissões pelo cliente. |
| Conteúdos | GET /api/conteudos; GET /api/conteudos/:id | Catálogo e material normal reais; pesquisa local no catálogo retornado. |
| Recomendações | GET /api/recomendacoes/usuarios, /foruns e /conteudos | Lógica existente do backend; nenhum algoritmo novo no aplicativo. |
| Pro | GET /api/pro; GET /api/assinatura; GET /api/pro/catalogo | Estado verificado no servidor e catálogo somente com metadados. Registro legado não comprova pagamento. |
| Exclusivos | GET /api/pro/conteudos e /api/pro/conteudos/:id | Sem provedor homologado, leitura do material fica bloqueada no servidor, inclusive para registros legados. |
| Compra/gerenciamento | POST/DELETE /api/assinatura | HTTP 503 sem criar, ativar ou excluir registros. Valor/status arbitrário enviado pelo cliente não concede acesso. |

## Mobile

Sessão nativa em SecureStore, autenticação restaurada pelo perfil do servidor, tratamento de 401 e estados de rede/timeout. Onboarding depende apenas do indicador explícito da conta. Apresentação e interesses iniciais começam vazios; edição posterior carrega dados salvos.

A imagem de garotas utilizada é o PNG original incorporado em `imagem_meninas.svg`, extraído sem alteração dos pixels para `onboarding-garotas.png`. A proporção é preservada. A marca compacta vem de `logo_menor.svg`; a principal continua disponível. Nenhuma nova ilustração foi gerada.

Chats e fóruns têm atualização periódica controlada e cancelamento ao sair/background; não há WebSocket. A prévia é sempre identificada e separada das APIs reais.

## Testes reproduzíveis

```powershell
cd backend
npm test
```

Os testes com PostgreSQL são opt-in e escrevem somente seus registros TESTE no banco de desenvolvimento confirmado:

```powershell
$env:NODE_ENV='development'
$env:CONSTELLA_INTEGRATION_TESTS='1'
node --test tests/integration-social.test.js
```

```powershell
cd mobile
npx tsc --noEmit
npm test
```

## Limitações

Pro sem provedor, produtos/recibos, validação de transações e webhook: nenhuma compra foi simulada como concluída. Não há estados históricos de expiração/cancelamento confiáveis no schema atual; o app não inventa esses dados. Chats enviam texto; envio de áudio/imagens e recuperação de senha continuam sem contrato implementado.

Validação em Expo Go/aparelho físico ainda é necessária. Bibliotecas e SDK existentes foram preservados; a auditoria anterior registrou alertas em dependências transitivas preexistentes, sem aplicar downgrade automático.

## Resultados verificados em 23/10/2026

- Prisma validate/generate/status aprovados; migração autorizada aplicada; seed duas vezes sem duplicações.
- Backend: 36 testes passaram no comando geral (dois cenários de banco ignorados sem opt-in); mais quatro testes de limites BIGINT passaram na revisão, que também repetiu os testes sociais/Pro com sucesso. Os cenários de banco foram executados separadamente com opt-in: autenticação/onboarding e oito testes do fluxo social.
- Mobile: `npx tsc --noEmit` aprovado; `npm test` com 22/22 aprovados; `expo-doctor` com 20/20.
- Exportação de bundles Android/iOS (Hermes) e web aprovada após os ajustes finais.
- Prévia no navegador: navegação, formulários, conexões, chats, fórum, conteúdos, perfil e Pro; larguras 390 e 320 sem erros de renderização.
- Navegador autenticado com Express/PostgreSQL reais: cadastro, onboarding com apresentação e zero interesses, perfil, novo login sem repetir onboarding, Pro bloqueado e falha de rede; sem erros de renderização.
- Imagem oficial conferida visualmente e sem overflow em 320/390 px. PNG verificado idêntico ao incorporado no SVG original.
- `npm run dev` iniciou o backend em porta temporária de teste; os processos de teste foram encerrados. Nenhum teste em aparelho físico foi declarado.

## Arquivos e módulos da integração

- Backend: `server.js`, `package.json`, `.env.example`, `src/config/prisma.js`, `src/prisma/schema.prisma`, `src/prisma/migrations/20261023000100_onboarding/migration.sql`, `src/prisma/seed.ts`.
- APIs: controllers/services de auth, cadastro, perfil, interesses, chat, fórum, postagem, denúncia, assinatura e Pro; validação de IDs em usuario/conteudo; rotas de perfil/Pro; middlewares auth/error/Pro; `src/utils/onboarding.js`; testes em `backend/tests/`.
- Mobile: `src/constexts/AuthContext.tsx`, `src/components/Brand.tsx`, `src/components/ChatPanel.tsx`, `src/constants/compact-logo.ts`, `src/constants/demo.ts`, `src/navigation/AppNavigator.tsx`, `src/types/navigation.ts`, `src/types/models.ts`, tipos de Pro/conteúdos, serviços auth/API/community/social/contents/Pro, utilitário Pro.
- Telas: Login, Cadastro, Onboarding, SobreVoce, Interesses, VerificarConta, Home, Conexoes, Perfil, Chat, ChatForum, Conteudos, DetalheConteudo, ConstellaPro e DetalhePro.
- Asset derivado sem alteração: `mobile/assets/images/onboarding-garotas.png`; fontes originais `imagem_meninas.svg` e `logo_menor.svg` preservadas.
- Testes mobile: `scripts/test-core.cjs`, `test-api.cjs`, `test-pro.cjs`, `test-session.cjs`; comando `test` em `package.json`; proteção de env em `.gitignore`.
- Contratos/revisão: `backend/contracts/auth-perfil-interesses.md`, `backend/contracts/revisao-integracao.md`, `backend/proposals/onboarding.md` e SQL de proposta arquivado.

As alterações e exclusões já presentes antes desta tarefa foram preservadas. Não houve commit, publicação ou alteração na outra cópia do repositório.

