# O Constella — integração verificada em 23/10/2026

Este relatório corresponde ao workspace atual. A primeira etapa preservou o backend e registrou bloqueios; em seguida o usuário autorizou expressamente corrigir esses erros, incluindo a migração aditiva local já apresentada. Os dois bloqueios foram resolvidos.

## Diagnóstico e correções

Atualização posterior: consulte [a revisão funcional e a limpeza autorizada do banco](REVISAO_FUNCIONAL_2026-10-23.md). O novo relatório substitui os estados antigos de bloqueio de demonstração PRO e informa os dados efetivamente removidos/preservados.

### Fotos selecionadas como arquivo

- Autorizado expressamente o upload no backend. Perfil e capa do fórum agora usam a galeria do aparelho, com recorte, prévia, troca e remoção; nenhum campo de URL é exibido. Upload ocorre ao salvar, e o caminho local do celular nunca é gravado no banco. Cancelar a seleção mantém a foto anterior.
- POST /api/uploads/imagens exige JWT e conta existente, limita envio a 40 imagens/hora por conta e aceita JPG/PNG até 2 MB e 20 megapixels. O corpo JSON com base64 tem limite próprio de 3 MB, sem ampliar o limite geral da API. Arquivos recebem nomes aleatórios e são servidos por GET /uploads/:nome, com tipo de imagem e nosniff, sem navegação de diretório.
- Banco guarda caminho relativo /uploads/UUID.ext nos campos existentes de perfil/fórum; nenhuma migração. O mobile resolve esse caminho contra a origem da API, inclusive para outras usuárias e capas exibidas na Home. URLs antigas continuam compatíveis.
- Arquivos ficam em backend/uploads por padrão, ignorados pelo Git e pelo contexto Docker. UPLOADS_DIR permite usar diretório persistente. Em hospedagem/container, montar volume persistente e gravável pelo usuário node em /app/uploads, incluir arquivos no backup e manter a mesma pasta entre instâncias/reinícios. Dockerfile prepara permissões da pasta; build Docker não executado nesta etapa.
- Remover/trocar foto desfaz sua associação ao perfil, sem apagar automaticamente arquivos do disco. Se o upload concluir e a gravação do perfil/fórum falhar, pode restar arquivo não associado; nenhuma limpeza destrutiva automática foi introduzida.
- Verificado por HTTP real e PostgreSQL: upload, gravação da foto, leitura binária idêntica após reiniciar a API e persistência da capa do fórum. Testes de upload cobrem autenticação, conta inexistente, conteúdo inválido/HTML/SVG, tamanho, dimensões e tentativa de leitura fora da pasta. Seleção nativa e permissões em aparelho físico ainda pendentes.
- Resultados desta etapa: 33 testes mobile, 22 testes backend de upload/autenticação/público, 14 testes da configuração de implantação e oito resultados da integração real aprovados; TypeScript e lint sem erros (15 avisos existentes). Contrato em backend/contracts/uploads.md.

### Ajustes de conversas e organização solicitados depois

- Retirado o botão Continuar sem conta do login e sua explicação. As APIs públicas continuam protegidas conforme seus contratos; nenhuma permissão foi ampliada.
- Chat privado e fórum consultam novas mensagens a cada dois segundos após terminar a consulta anterior. O intervalo não cresce ao carregar histórico. A atualização pausa ao sair da tela ou colocar o app em background. Não é WebSocket: soma-se ao intervalo o tempo de resposta da rede.
- Abas de fóruns, conexões e conversas atualizam suas listas a cada cinco segundos enquanto estiverem abertas, além da atualização ao recuperar foco.
- Fóruns separados entre Meus fóruns e Explorar; botão Criar fórum acima da pesquisa/listagem.
- Conexões separadas entre Minhas conexões, Solicitações recebidas/enviadas e Descobrir. Conexões aceitas e pendentes não são misturadas à descoberta de novas usuárias.
- A aba de chat combina conversas existentes e conexões aceitas ainda sem conversa, sem duplicar pessoas. O chat persistido é criado/recuperado ao abrir a conexão; a autorização continua no servidor.
- Clicar numa recomendação da Home abre modal do perfil daquela usuária via GET /api/usuarios/:id, com interesses, estado real da conexão e ação de conectar/aceitar/conversar. O mesmo modal é reutilizado em Conexões.
- O usuário confirmou que ainda não tem provedor de pagamento. A tela Pro mostra Assinaturas em breve, em vez de botões desativados que parecem um fluxo quebrado. Compra continua pendente; nenhum benefício pago foi liberado.
- Após pedido explícito de simulação, adicionado botão Simular pagamento no Pro: Pix/cartão de teste, aprovação e recusa demonstrativas e nova tentativa. O modal é identificado como simulação, não coleta dados bancários, não chama APIs de cobrança, não persiste pagamento e não altera assinatura/acesso Pro. Estado local reiniciado a cada abertura; teste visual em aparelho pendente.
- Validação adicional: 29 testes unitários aprovados, incluindo chegada de mensagens com a conversa aberta, pausa em background/saída, histórico expandido e lista de chat sem duplicatas; TypeScript e lint aprovados (15 avisos preexistentes). Integração com banco real também verifica o perfil individual e a conexão aparecendo antes de criar o chat. Validação visual em aparelho permanece pendente.

- Mobile sem EXPO_PUBLIC_API_URL: o interceptor bloqueava cadastro/login antes da rede. Criado configurador local, preservando arquivos existentes; `.env.local` ignorado pelo Git. Esse endereço é apenas de desenvolvimento e muda com a rede.
- Backend sem registro de `/api/publico`: registrado em `backend/server.js` o router existente. Acesso limitado aos endpoints de leitura pública; operações privadas continuam com autenticação.
- PostgreSQL e Prisma Client sem campos de onboarding: aplicada a migração existente `20261023000100_onboarding`, depois de inspecionar banco local, schema e status. Regenerado Prisma Client 7.10.0. Status final: duas migrações aplicadas, banco atualizado.
- A migração adicionou `usuaria.onboarding_concluido` booleano default false e `apresentacao` varchar(500) opcional. As 13 contas anteriores permaneceram presentes, inicialmente com false/null. Não se inferiu conclusão por interesses. Não houve reset, exclusão, seed ou alteração de segredos.
- Perfil do mobile usava resposta parcial do PUT e descartava interesses na tela: agora consulta perfil completo após salvar.
- Troca de conta limpa identidade e JWT anterior antes de autenticar; falha de login não mantém sessão anterior. Header residual removido em rotas públicas/autenticação ou sem sessão.
- Falhas de leitura limpam dados anteriores; ajustes de hooks compatíveis com React Compiler, sem alterações no layout, estilos ou assets.

Mocks removidos do runtime nesta execução: nenhum encontrado em mobile/src; os serviços já eram reais. Fixtures demonstrativas permanecem somente nos testes. Não há fallback demonstrativo para falha da API.

## Contratos reais utilizados

| Fluxo | Rotas | Validação |
| --- | --- | --- |
| Cadastro/login | POST /api/auth/cadastro e /api/auth/login | Serviço mobile real, SELECT PostgreSQL, recusa de duplicado/senha incorreta, reinício de Express e novo login |
| Perfil e onboarding | GET/PUT /api/perfil; PUT /api/perfil/onboarding | Conclusão com zero interesses, apresentação vazia, flag no SQL, novo login e reinício preservando conclusão; isolamento entre contas |
| Interesses | GET /api/interesses; GET/PUT /api/interesses/meus | Seleção vazia gravada e relida |
| Recomendações | GET /api/recomendacoes/usuarios e /foruns | Coleções reais consultadas |
| Usuárias/conexões | GET /api/usuarios; GET /api/conexoes, /recebidas, /enviadas; POST /api/conexoes/:id; PATCH /api/conexoes/:id/aceitar | Solicitação e aceite entre contas sintéticas |
| Chats | GET/POST /api/chats; GET/POST /api/chats/:id/mensagens | Envio, leitura pela destinatária, SELECT em mensagem, HTTP 403 para terceira conta |
| Fóruns/postagens | GET/POST /api/foruns; GET /api/foruns/:id; GET/POST /api/foruns/:id/postagens | Criação, participação, envio e SELECT em postagem |
| Conteúdos/Pro | GET /api/conteudos; GET /api/pro e /api/pro/catalogo | Catálogo e status reais, sem compra simulada |
| Visitante | GET /api/publico/conteudos, /conteudos/:id, /foruns e /pro | Clientes reais do mobile; comparação com PostgreSQL; ausência de dados de contas/material Pro; nenhuma escrita pública; operações pessoais sem JWT recusadas |

## Resultados reais

- Mobile: 25 testes unitários aprovados; TypeScript aprovado; lint sem erros e com 18 avisos; bundle Android/Hermes exportado.
- Integração mobile → Axios → Express → Prisma → PostgreSQL: sete cenários, oito resultados contando o agrupador, aprovados após corrigir o backend. O teste não aceita mais 404/503 como resultado válido dos fluxos corrigidos.
- Backend: suite geral com 60 aprovados, quatro testes de banco ignorados sem opt-in e uma falha de ambiente no teste de bloqueio de seed. Esse teste falhou porque tsx não conseguiu consultar o usuário do Windows dentro do sandbox; repetido fora do sandbox e aprovado. Nenhum seed executado.
- Banco real, execução opt-in: três testes adicionais aprovados — autenticação/onboarding/isolamento; persistência após reinício com SQL independente; visitante sem registrar ações pessoais.
- Prisma: validate, migrate deploy, generate e migrate status aprovados. Nenhum schema novo inventado; usada a migração existente.
- Configuração ESLint e dependências compatíveis instaladas pelo Expo. O instalador reportou 19 ocorrências de vulnerabilidade alta na árvore; nenhuma correção forçada aplicada.

## Comandos reproduzíveis

Dentro de backend:

```powershell
npm.cmd test
npm.cmd run prisma:validate
npm.cmd run prisma:status
$env:NODE_ENV='development'
$env:RUN_DATABASE_TESTS='true'
node --test tests/auth-onboarding.database.test.js tests/publico.database.test.js tests/distribution-persistence.test.js
```

Dentro de mobile:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
$env:CONSTELLA_LOCAL_INTEGRATION='1'
npm.cmd run test:integration
npx.cmd --no-install expo export --platform android --output-dir .expo/integration-export
```

Os testes opt-in criam contas TESTE com e-mails @example.invalid e dados sintéticos, sem imprimir senha/JWT/CPF. Contas, conexões, fórum e mensagens permanecem para inspeção; não apagam registros anteriores. Não reaplique o SQL da proposta: a migração já foi aplicada neste banco. Outras instalações devem aplicar as migrações revisadas e gerar o Client apropriado.

## Situação funcional e limites

| Funcionalidade | Classificação | Limite |
| --- | --- | --- |
| Cadastro/login e persistência | Implementada e testada pelos serviços reais | Formulário em aparelho não exercitado |
| Sessão, restauração, logout, troca de conta | Implementada e testada em unidade | SecureStore nativo não exercitado em aparelho |
| Onboarding por conta | Implementada e testada com PostgreSQL | Conclusão vazia, SQL, novo login e reinício verificados; fluxo visual em aparelho pendente |
| Visitante | Implementada e testada pelas APIs/clientes reais | Navegação em aparelho pendente |
| Catálogos/interesses/recomendações | Implementada e testada pelos serviços reais | Interação em dispositivo pendente |
| Conexões, fóruns e mensagens | Implementada e testada pelos serviços reais | Moderação/exclusão e experiência em dispositivo não revalidadas nesta execução |
| Atualização do perfil no mobile | Implementada e testada isoladamente | GET e edição de apresentação também cobertos no backend com banco real |
| Pro | Parcialmente implementada | Consulta real de status/catálogo; compra exige provedor homologado e validação no servidor |
| Configuração APK/AAB | Implementada, build não testado | Precisa API HTTPS pública, projeto EAS e assinatura |
| APK instalado e uso fora da rede local | Pendente | Nenhum APK ou teste físico produzido |

O design foi preservado. Não houve commit, publicação ou contratação. Nenhuma operação foi apresentada como concluída sem confirmação da API.

## Execução e distribuição

Inicie/reinicie o backend com `npm run dev` dentro de backend e inicie o mobile com `npm start` dentro de mobile. Um processo já aberto precisa reiniciar para carregar o router e o Prisma Client atualizado.

EAS: preview gera APK interno com developmentClient false; production gera AAB. Configure EXPO_PUBLIC_API_URL com a API HTTPS hospedada real nos ambientes correspondentes. Identificador Android com.constella.app sujeito à confirmação de disponibilidade. A configuração bloqueia endereços locais comuns em distribuição, sem comprovar disponibilidade da hospedagem. Nenhuma URL pública foi inventada.

Após vincular o projeto à conta do desenvolvedor e configurar credenciais: `npx eas-cli@latest build --platform android --profile preview`. Referência: [APK com EAS](https://docs.expo.dev/build-reference/apk/). Exportação de bundle não equivale a APK gerado/instalado.

Pendentes: provedor Pro, recuperação de senha e anexos de chat com contratos reais; hospedagem HTTPS; build/instalação Android; fechar/reabrir em aparelho com SecureStore; teste em Wi-Fi externo e rede móvel.
