# Correções finais do Constella — 29/10/2026

Implementação local em `C:\Users\45806396851\Desktop\Constella`. Este relatório descreve esta rodada; as integrações anteriores estão em `INTEGRACAO_FINAL_MODERACAO.md`.

## Desktop

- `frontend-moderadora/components/ContentEditor.jsx`: edição/criação dos conteúdos existentes, capa pública separada das mídias exclusivas, categoria com sugestões, publicação/rascunho e texto opcional quando o PRO tem imagem ou vídeo.
- `components/ProMediaUpload.jsx` e `lib/api.js`: prévia local e do arquivo persistido, seleção/substituição/remoção, validação de formato/tamanho, progresso por XHR, mensagens de erro e nova tentativa com o mesmo UUID. Salvar fica indisponível enquanto existir mídia pendente. O UUID também funciona em HTTP de rede local sem depender de `crypto.randomUUID`.
- `app/moderadora/usuarias/page.js` e `app/moderadora/usuarias/[id]/page.js`: status Permitida/Banida, detalhes, histórico administrativo, motivo obrigatório e diálogo de confirmação. Banimento/reversão atualizam a interface sem recarregamento manual.
- `app/globals.scss`: formulários, upload, ações, tabelas com rolagem interna, cabeçalho/navegação, campos com largura limitada, modal com altura máxima e foco visível. Preservadas as cores, marca e componentes existentes.
- `next.config.mjs`: limites de encaminhamento compatíveis com vídeos de até 50 MB e tempo de 120 s. Na versão instalada Next 15.5.28, a opção suportada é `experimental.middlewareClientMaxBodySize`; uma atualização futura do Next deve rever esse nome.

## Mobile

- `ChatPanel.tsx` aceita `mode="forum"`, passado apenas por `ChatForumScreen.tsx`. Postagens próprias/recebidas, imagens e respostas têm avatar, autora acima e alinhamento à esquerda. Eventos de sistema permanecem centralizados. Excluir/denunciar continua respeitando a autoria.
- Chats privados mantêm próprias à direita e recebidas à esquerda.
- `ProMedia.tsx`, `DetalheProScreen.tsx`, `types/pro.ts`: imagem exclusiva, player `expo-video`, controles de reprodução, pausa/continuação, proporção preservada, tratamento de falhas e pausa ao sair da tela. Catálogo e detalhe bloqueado exibem a capa pública.
- `ConversationImage.tsx` e `utils/media.ts`: suporte a rotas privadas PRO, imagem completa ao toque e leitura correta de dimensões no Android/iOS e na web. Na web, arquivos privados são obtidos com Bearer e convertidos em URLs Blob temporárias; as URLs são revogadas ao desmontar. No nativo, os headers seguem na requisição do arquivo.
- `AuthContext.tsx` e `services/api.ts`: `CONTA_BANIDA` encerra a sessão local correspondente, limpa SecureStore e exibe uma mensagem. Respostas antigas de outra sessão continuam sem encerrar a conta atual.
- `package.json`, lock e `app.config.js`: `expo-video` instalado na versão compatível com SDK 58 e plugin configurado. Mantida React Navigation.

## Backend e armazenamento

Arquivos centrais: `banimento.service.js`, `midia-pro.service.js`, `mp4-worker.js`, `sessao.service.js`, `auth.service.js`, `moderacao.service.js`, `pro.service.js`, `upload.service.js`, rotas de moderação/PRO e tratamento de erros.

### Endpoints adicionados

| Método e rota | Autorização e finalidade |
| --- | --- |
| `GET /api/moderacao/usuarias/:id` | Moderadora: detalhes seguros, estado e histórico de banimento |
| `PATCH /api/moderacao/usuarias/:id/banimento` | Moderadora + CSRF por cookie; corpo `{banida: boolean, motivo: string}` |
| `POST /api/moderacao/midias/pro/:uploadId` | Moderadora + CSRF; arquivo binário, `Content-Type`, `X-File-Name`, UUID v4 para repetição segura |
| `GET /api/moderacao/midias/pro/:id` | Prévia privada; upload ainda não vinculado acessível somente à responsável |
| `GET /api/pro/conteudos/:id/midias/:arquivo` | Sessão válida + acesso PRO validado pelo servidor + conteúdo publicado + vínculo do arquivo |

Os endpoints existentes de conteúdo PRO do painel aceitam `imagem_pro_id` e `video_pro_id` opcionais. O detalhe completo inclui os metadados e as rotas privadas; o catálogo seleciona explicitamente somente metadados públicos, sem IDs/URLs dos arquivos exclusivos.

- Imagens: JPG/PNG, até 2 MB e 20 megapixels; assinatura binária e dimensões validadas no backend.
- Vídeo: MP4 H.264 com áudio AAC-LC opcional, até 50 MB, 4K/8,3 megapixels e 60 minutos. Metadados, estrutura e limites são analisados com MP4Box em worker isolado com timeout e limite de memória. Extensão/MIME sozinhos não liberam o arquivo.
- Binários em `backend/uploads/pro` (ou `UPLOADS_DIR/pro`), fora da rota pública de imagens. Banco contém somente referências e metadados, incluindo SHA-256, tamanho, dimensões, duração e responsável.
- Upload em fluxo tem limite de bytes mesmo sem Content-Length. Arquivos incompletos/temporários são descartados. Repetir UUID e bytes pela mesma moderadora reutiliza o registro; outro arquivo com o mesmo UUID gera conflito. A chave não substitui a autorização.
- Arquivos publicados são entregues com `no-store`, tipo validado e suporte a Range. Cada nova requisição, inclusive de trecho, verifica autenticação/assinatura/publicação/vínculo. Remover/substituir a referência impede o acesso pelo conteúdo anterior; binários antigos permanecem privados, sem exclusão automática.
- Banimento é transacional: atualiza estado/motivo/data/responsável, registra auditoria, revoga sessões e desativa dispositivos push. Reversão audita e exige novo login; não reativa tokens antigos. A consulta de sessão verifica banimento no banco em cada requisição protegida, e a emissão de sessão verifica novamente banimento concorrente ao login.
- Bloqueios pessoais, mensagens, fóruns e denúncias continuam nas estruturas anteriores; banir não apaga históricos. Usuária comum não acessa as rotas administrativas, mesmo enviando campos de permissão.

## Banco

Migração `20261029000200_banimento_midias_pro` proposta em `backend/proposals/banimento-midias-pro.md`, autorizada explicitamente e aplicada somente ao PostgreSQL de desenvolvimento.

- `usuaria`: estado `banida` (padrão false), data, motivo e FK da moderadora. A reversão preserva metadados do último banimento; o histórico de ambas as ações usa `relatorio_moderacao`.
- `arquivo_pro`: tabela de metadados, sem binários/base64.
- `conteudo_pro`: referências opcionais de imagem e vídeo; nenhum segundo catálogo de conteúdos foi criado.
- Alinhados no schema os nomes das FKs de `sessao` e o default já existente de `dispositivo_push.atualizado_em`. Essas correções de mapeamento não executaram DDL adicional.
- Contagens antes/depois da migração: 23 usuárias, 6 moderadoras, 4 conteúdos gratuitos, 4 PRO, 9 denúncias, 12 mensagens, 11 postagens. Nenhuma remoção, seed ou reset.
- `prisma validate` passou; comparação do schema com o banco: `No difference detected.`

## Validação

- Backend `npm test`: **101 passaram, 10 ignorados por dependerem de execução opt-in/ambiente**, zero falhas.
- `RUN_MODERATION_DB_TESTS=1 node --test tests/banimento-midias.database.test.js`: **12 passaram**; upload real de imagem/MP4, assinatura falsa, truncamento, limite, fluxo sem Content-Length, UUID repetido, referências/edição, catálogo sem vazamento, URLs recusadas, Range, despublicação, recriação do servidor, banimento, JWT antigo e reversão.
- `RUN_MODERATION_DB_TESTS=1 node --test tests/moderacao.database.test.js`: **11 passaram**, preservando sessão/cookie/CSRF, conteúdo, denúncias, auditoria e consultas administrativas.
- `CONSTELLA_CONVERSATION_INTEGRATION=1 node --test tests/conversas-recovery.database.test.js`: **1 passou**, HTTP + PostgreSQL para chats/fóruns vazios, histórico, mensagem, imagem privada e resposta.
- Mobile: **62 testes passaram** e TypeScript passou. Incluem modos de conversa, sessão banida e imagem nativa/web. A regressão do evento web foi reproduzida e corrigida, com teste específico acrescentado à suíte de imagens.
- Exportações web e Android/Hermes executadas; não equivalem a instalação em aparelho.
- Painel: build Next passou. Conferência em navegador real executou upload com perda de resposta/repetição, MP4 de 12 MB pelo proxy, catálogo bloqueado, imagem/vídeo no aplicativo, reprodução/pausa/continuação, banimento e reversão. Dez rotas administrativas foram verificadas em 1920/1366/768/390 px e modal com zoom CSS de 150%.
- Revalidação final do navegador: **8 verificações de ponta a ponta, zero erros de JavaScript**, com transação revertida, repetidas após corrigir a leitura de dimensões da imagem.
- Fórum no navegador com API/PostgreSQL reais: **6 verificações, zero erros de JavaScript**. Próprias/recebidas à esquerda, autoras acima, envio de texto com quebra, resposta com referência real, seleção de imagem pela galeria e upload privado, imagem completa ao toque, evento de sistema centralizado, input focado em 320/390 px e chat privado preservado.
- Evidências locais: mobile/.expo/correcoes-review/result.json, mobile/.expo/forum-review/result.json e screenshots nessas pastas. São artefatos de revisão ignorados pelo Git; não são dependências do produto.

Testes de banco/navegador usam registros explicitamente identificados como TESTE em transações revertidas. Não deixam credenciais administrativas de teste. O vídeo de fixture `backend/tests/fixtures/pro-sample.mp4` foi gerado localmente: três segundos de cor sólida e tom senoidal, H.264/AAC, sem material de terceiros.

## Limites reais

- Provedor de pagamento/assinatura real continua indisponível na implementação anterior. Nenhum pagamento foi simulado como concluído. A prova de acesso positivo de mídia usa exclusivamente o modo PRO de desenvolvimento explícito já existente, marcado como Demonstração. Gratuitas e registros legados continuam bloqueados; produção continua exigindo assinatura validada pelo servidor.
- Não foram instalados APK nem testados Expo Go/teclado físico em celular. A validação de interface usa o bundle web real e a compilação Android.
- Persistência foi verificada em disco/DB, reload da interface e recriação do servidor/serviço; não houve desligamento completo do computador/PostgreSQL. O modo PRO de demonstração, por definição, é temporário e precisa ser ativado novamente após reiniciar o backend.
- O armazenamento é local, conforme solicitado. Preservar tanto o banco quanto `uploads/pro` nas cópias de segurança; referência no banco não substitui o arquivo.

## Para abrir após atualizar

Reinicie os processos para carregar o código e o Prisma Client novos. Na raiz do Constella, em terminais separados:

1. `cd backend` → `npm run dev` (ou `npm run demo` somente para verificar a apresentação PRO de desenvolvimento).
2. `cd frontend-moderadora` → `npm run dev` → abrir `http://localhost:3001/moderadora` no navegador do computador.
3. `cd mobile` → `npm run start:lan` → ler o QR pelo Expo Go, com celular e computador na mesma rede.

Não é preciso aplicar novamente a migração já autorizada/aplicada neste computador. Não foi feito commit, push, merge, troca de branch ou publicação externa.

## Ocorrências corrigidas durante a verificação

- O instalador informou: `Cannot automatically write to dynamic config at: app.config.js`. A dependência foi instalada e o plugin foi acrescentado manualmente; a exportação foi verificada depois.
- Uma contagem iniciada da raiz retornou `Error: Cannot find module 'dotenv'`. Foi repetida usando a dependência do backend, sem exibir credenciais; os resultados constam acima.
- A primeira execução da imagem na web registrou `Cannot read properties of undefined (reading 'width')`. O evento DOM foi corrigido e a repetição completa terminou com zero erros de JavaScript.
- Cancelar a prévia registrava `Error: Request aborted`. O callback agora ignora desconexões esperadas, preservando erros reais de armazenamento.
- O harness transacional PostgreSQL emitiu o aviso `Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0.` e uma reconsulta durante o encerramento registrou `P2028`. Os testes funcionais aprovados são as asserções e evidências enumeradas acima; esses avisos de encerramento não foram tratados como provas de funcionamento.

O player usa a API de [expo-video](https://docs.expo.dev/versions/latest/sdk/video/), e a inspeção dos MP4 utiliza [MP4Box.js](https://github.com/gpac/mp4box.js/). O encaminhamento segue a [configuração de limite do Next 15](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/middlewareClientMaxBodySize), além do limite independente no backend.
