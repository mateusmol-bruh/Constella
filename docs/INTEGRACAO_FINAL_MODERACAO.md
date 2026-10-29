# Integração final do Constella — 29/10/2026

## Resultado e escopo

Workspace utilizado: C:/Users/45806396851/Desktop/Constella. A árvore Git estava limpa antes desta rodada. Mobile em mobile/, painel em frontend-moderadora/, Express/Prisma/PostgreSQL em backend/. Não houve commit, push, merge, troca de branch, seed ou redefinição do banco. Os arquivos .env existentes foram preservados.

Versões consultadas nos projetos: Expo 58.0.19, React Native 0.88, React 19.3 e TypeScript 6.0.3 no mobile; Next 15.5.28 instalado pelo lockfile e React 19 no painel; Express 5.2.1 e Prisma 7.10 no backend. Não foi adicionada dependência de produção. Playwright e Prettier foram instalados somente em diretórios temporários ignorados para validação e formatação.

## Desktop

- Login de moderadora com cookie HttpOnly; restauração pelo servidor, expiração e logout remoto. O JWT deixou o sessionStorage. O modo de demonstração foi retirado do fluxo e seus repositórios locais foram removidos.
- A logo em login e cabeçalho é cópia byte a byte de mobile/assets/images/constella-logo.svg. Brand usa proporção original.
- Dashboard obtém contagens reais: usuárias, fóruns, gratuitos/PRO publicados, denúncias totais, pendentes, em análise e resolvidas. Atualiza a cada 30 segundos e ao recuperar foco.
- Gestão de conteúdos: listagem, busca, filtros de tipo/status, criação, edição, publicação/despublicação e exclusão quando não existe histórico de acesso. Título, descrição, texto, categoria, duração e capa persistem no PostgreSQL.
- Denúncias: listagem paginada por status, contexto do item, descrição opcional, análise, decisão e histórico. Status e auditoria são gravados na mesma transação. Finalização/rejeição exige justificativa.
- Fóruns: consulta paginada e contexto das últimas 100 postagens, edição com auditoria. Exclusão administrativa só aceita fórum sem participantes nem postagens. Não há conversas sociais no painel.
- Usuárias: consulta paginada por nome; somente ID, nome, foto e verificação. CPF, senha, JWT e dados privados de conta não fazem parte desta projeção.
- Relatórios: criação de texto e histórico próprio real. A interface não oferece anexo sem suporte. Não há botão de banimento sem regra de suspensão administrativa implementada.
- Layout preserva a identidade existente, com navegação administrativa, tabelas com rolagem, formulários e estados de erro/carregamento/vazio.

Principais componentes: components/SessionProvider.jsx, Shell.jsx, Brand.jsx, ContentEditor.jsx, UploadBox.jsx; lib/api.js e useAdminResource.js; páginas em app/moderadora. Dados administrativos nunca são buscados diretamente no PostgreSQL pelo navegador.

## Mobile

- Continua sendo a interface social das usuárias, sem painel administrativo.
- Conteúdos e catálogo PRO consomem as mesmas tabelas administradas pelo desktop. Recebem capa, categoria e atualização; detalhes e listagem refazem consultas a cada 15 segundos enquanto focados, ao retomar o app e ao retornar à tela.
- Conteúdos despublicados deixam a lista, recomendações e catálogo e retornam 404 no detalhe gratuito, inclusive pelo ID antigo. As rotas PRO continuam exigindo autorização no servidor antes do material.
- Capas relativas são resolvidas contra a origem da API; proporção preservada e erro de imagem tratado.
- Denúncias de usuária, mensagem e postagem mantêm os vínculos existentes; motivo selecionável/texto e descrição opcional de até 2.000 caracteres. Não foram inventadas denúncias de fórum ou conteúdo editorial, pois o modelo atual não possui esses vínculos.
- JWT permanece no SecureStore nativo, agora associado à sessão persistida. Logout tenta revogar essa sessão antes de limpar o aparelho. Se estiver offline, limpa o aparelho e informa que a revogação remota não foi confirmada; a expiração do servidor continua valendo.
- Onboarding por conta e lista vazia de interesses foram preservados. Imagem original das garotas e logos oficiais foram mantidas. Ícone nativo, ícone adaptativo e splash passam a reutilizar a logo menor oficial, rasterizada em PNG sem redesenho ou distorção. Chats, respostas, imagens privadas, conexões, leitura e notificações mantêm seus serviços.

## Backend e contratos

Reutilizados: /api/auth/login, /cadastro; /api/conteudos; /api/pro/catalogo e /conteudos; /api/publico; /api/denuncias; /api/moderacao/login, /denuncias, /relatorios e criação de conteúdos.

Novos/completados sob /api/moderacao (todos protegidos, exceto login):

| Recurso | Métodos e caminhos |
|---|---|
| Sessão | GET /sessao; POST /logout |
| Indicadores | GET /resumo |
| Denúncias | GET /denuncias e /denuncias/:id; PATCH /denuncias/:id/status com status e decisao |
| Relatórios | GET e POST /relatorios |
| Usuárias | GET /usuarias?q=&pagina=&limite= |
| Fóruns | GET /foruns e /foruns/:id; PATCH e DELETE /foruns/:id |
| Conteúdos | GET /conteudos?tipo=normal ou pro&pagina=&limite=&q=&publicado=; POST /conteudos ou /conteudos/pro; GET/PUT/DELETE /conteudos/:id ou /conteudos/pro/:id; PATCH .../:id/publicacao |
| Capas | POST /capas, autenticado antes de ler o corpo de até 3 MB; imagem JPG/PNG até 2 MB |
| Imagens de contexto | GET /anexos/:nome, somente imagem de postagem de fórum ou mensagem denunciada; nenhuma listagem de chats privados |

Mobile: POST /api/auth/logout revoga o JWT da sessão corrente. As rotas sociais e de push existentes permanecem separadas. Controllers de moderação/denúncias agora encaminham erros ao tratamento global, sem imprimir objetos de banco ou credenciais.

## Sessões e segurança

- JWT HS256 com emissor/audiência, subject validado e identificador aleatório de 256 bits. Somente o hash desse identificador fica em sessao.
- Cada requisição protegida verifica sessão, titular, papel, revogação e expiração no PostgreSQL. Tokens antigos sem sessão precisam de novo login. Remover uma conta invalida as sessões por integridade referencial.
- Expiração absoluta de uma hora. Sessão de moderadora também expira após 30 minutos sem requisições autenticadas. Não há refresh silencioso que prolongue a sessão indefinidamente.
- Cookie do painel: HttpOnly, SameSite=Strict, Path=/api, Secure em produção. CSRF vinculado criptograficamente à sessão, comparação em tempo constante e validação de origem nas escritas com cookie. Login tem limitação de tentativas e validação de origem.
- O backend verifica moderadora a partir da autenticação e da tabela existente; nenhum campo de papel enviado pelo cliente concede acesso. PRO não concede moderação.
- CORS usa lista de origens; localhost/loopback HTTP é permitido em desenvolvimento. O proxy Next mantém chamadas web na mesma origem. Cache de APIs é no-store, com headers contra interpretação de MIME e enquadramento do painel.
- HTTP é usado somente para o teste local autorizado, na Wi-Fi confiável. HTTPS é exigido pelo perfil de produção; não foram contratados serviços nem criada hospedagem.

## Banco de dados

Migração aditiva 20261029000100_moderacao_sessoes, explicitamente autorizada e aplicada no desenvolvimento:

- conteudo e conteudo_pro: publicado (padrão true para manter a visibilidade anterior), capa, categoria e atualizado_em; PRO recebe id_mod opcional.
- denuncia: descricao opcional.
- sessao: hash do identificador, titular, criação, atividade, expiração e revogação; FKs e índices. Nenhuma senha/cookie/JWT é armazenado em texto nesta tabela.
- Reutiliza moderadora, relatorio_moderacao e os relacionamentos de denúncias. Não cria usuárias/conteúdos duplicados nem banco separado.

Contagens antes/depois da migração: 23 usuárias, 6 moderadoras, 3 conteúdos gratuitos, 4 PRO e 8 denúncias. Permaneceram iguais. Os testes desta rodada usam transações com rollback e contas de teste aleatórias, sem conta administrativa permanente.

## Validação executada

| Cenário pedido | Resultado |
|---|---|
| Publicar gratuito | Concluído e testado por HTTP real + PostgreSQL; também criado pela interface desktop e lido pelo bundle web do mobile |
| PRO | Catálogo, publicação e bloqueio de gratuita testados. Assinatura paga efetiva pendente de provedor homologado; não foi simulada |
| Editar conteúdo | Concluído e testado por HTTP real; texto atualizado retornou na consulta mobile |
| Despublicar | Concluído e testado por HTTP real; no navegador o detalhe aberto do mobile perdeu acesso após refetch |
| Enviar denúncia | Concluído por HTTP real; confirmado também pela interface mobile até o painel |
| Decisão de moderação | Persistência transacional e histórico testados com PostgreSQL; confirmada pela interface desktop após reload |
| Segurança | Usuária comum/sem sessão negadas; CSRF ausente/origem inválida negados; replay após logout, sessão sem emissão, titular alterado e expiração negados |
| Dashboard | Contagens comparadas com consultas reais ao banco |
| Imagem | Upload pela interface desktop, bytes servidos pelo Express e capa no bundle web do mobile conferidos |
| Compatibilidade social | 59 testes mobile e 99 testes backend aprovados; teste HTTP/PostgreSQL de chat/fórum, imagem privada e resposta aprovado |

Comandos executados: npm test no backend (99 aprovados, 9 testes de integração opt-in pulados); RUN_MODERATION_DB_TESTS=1 node --test tests/moderacao.database.test.js (11 aprovados); CONSTELLA_CONVERSATION_INTEGRATION=1 node --test tests/conversas-recovery.database.test.js (1 aprovado); npm run typecheck e npm test no mobile (59 aprovados); npm run build no frontend; exports web e Android/Hermes do Expo (bundle Android de 4,1 MB); introspecção Android confirmou INTERNET e usesCleartextTraffic=true no perfil local. Os testes opt-in não estão contabilizados como aprovados na execução padrão que os pulou.

Os exports de JS não equivalem a APK compilado/instalado. A conversão de SVG pelo @expo/image-utils falhou com a mensagem exata “Invalid mimeType for image with source: ./assets/images/logo_menor.svg”; os PNGs nativos foram então obtidos por rasterização do SVG oficial no Edge e conferidos visualmente.

A inspeção de navegador usa Edge/Playwright, frontend Next real, Express real e transação PostgreSQL real. No bundle web do mobile, a URL da API é redirecionada ao servidor HTTP isolado do teste; as respostas vêm do PostgreSQL, sem respostas simuladas. Isso não substitui teste em celular físico. As evidências temporárias ficam em mobile/.expo/final-review.

Os primeiros testes apontaram fechamento de transação de cadastro e validação da descrição não aplicados por diferença de finais de linha; ambos foram corrigidos e as suítes passaram depois. A conferência de navegador identificou nome acessível ambíguo no seletor de status da denúncia; o campo recebeu nome explícito e o fluxo está sendo repetido. A repetição final passou pelos 9 checkpoints de navegador, com zero erros de página, incluindo desktop e mobile web, capa, denúncia, decisão após reload, logout e responsividade em 1366/768/390 pixels. A inspeção visual também corrigiu o recorte vertical do dashboard; a rolagem foi liberada.

## Como iniciar localmente

Abra três terminais na raiz do workspace:

~~~powershell
cd backend
npm start
~~~

~~~powershell
cd frontend-moderadora
npm run dev
~~~

~~~powershell
cd mobile
npm run start:lan
~~~

Painel: http://localhost:3001/moderadora. API: porta 3000 em 0.0.0.0. O comando start:lan seleciona o IPv4 privado ativo e passa somente a URL pública da API ao Expo, preservando .env.

Variáveis: backend/.env contém DATABASE_URL, JWT_SECRET, PORT=3000 e NODE_ENV=development; não copiar esses segredos ao mobile ou painel. CORS_ALLOWED_ORIGINS só precisa de ajuste se o painel usar origem diferente dos endereços locais documentados. Front usa BACKEND_URL interno; mobile usa EXPO_PUBLIC_API_URL. Uploads precisam preservar backend/uploads (ou UPLOADS_DIR) junto do banco.

## APK na mesma Wi-Fi

O perfil preview de mobile/eas.json usa APK interno sem developmentClient e http://192.168.15.30:3000, IPv4 real encontrado no Wi-Fi do computador nesta rodada. O plugin Android permite HTTP somente quando CONSTELLA_LAN_BUILD=1. A introspecção confirmou os arquivos de ícone e ícone adaptativo existentes. O target SDK consultado no React Native instalado é 36: INTERNET é suficiente para rede local nesse target; ao atualizar o target para 37, será necessário revisar a permissão de rede local conforme a documentação Android.

~~~powershell
cd mobile
npm run check:lan
npx eas-cli login
npm run build:apk
~~~

O build do EAS exige conta/projeto e credenciais de assinatura do próprio projeto; autenticar pelo terminal, sem enviar senha/token no chat. Firebase/FCM e EAS project ID são necessários para validar push num aparelho, conforme a configuração existente. Não foi gerado, baixado ou instalado APK nesta rodada. O backend continua local; o EAS apenas compila o aplicativo. Não abrir portas do roteador.

Antes de instalar, confirme no navegador do celular http://192.168.15.30:3000/. Ambos precisam estar na mesma Wi-Fi, sem isolamento de clientes. A porta TCP 3000 deve estar permitida pelo firewall na rede privada. A interface Wi-Fi está classificada como Public no Windows. O firewall e a classificação da rede não foram alterados automaticamente; se esta for uma rede doméstica confiável, configure-a como privada e permita a porta 3000 para a rede local. Se o IP mudar, atualizar a URL do perfil preview e gerar novo APK; a URL é incorporada na compilação. O APK dispensa Expo Go e Metro, mas precisa do backend e do PostgreSQL ligados.

Foi verificado HTTP 200 em / e /api/publico/conteudos pelo IPv4 atual no próprio computador. Isso comprova o caminho Express/PostgreSQL pela interface LAN do PC, não o acesso vindo do celular.

## Pendências e limites reais

- Compra, recibos, cancelamento efetivo, expiração de assinatura paga e webhook aguardam provedor homologado. Registro legado de pagamento não libera Pro. A demonstração de desenvolvimento existente continua identificada como demonstração e é proibida em produção.
- Não há modelo de suspensão administrativa de conta; o botão de banimento sem efeito foi retirado. Bloqueio pessoal continua pertencendo ao mobile.
- Denúncias de fórum/conteúdo editorial e vídeos privados não têm contrato/infraestrutura no modelo atual; não foram inventados. Os tipos suportados são usuária, mensagem e postagem.
- Push real em aparelho depende do build/configuração FCM/Expo e das credenciais externas; a fila, permissões e testes existentes foram preservados, sem enviar notificações fictícias.
- Sessões expiram em uma hora; em troca de backend antigo/novo é obrigatório novo login. Logout offline não comprova revogação remota.
- Listas administrativas e contexto são limitados para evitar cargas sem limite; denúncias/fóruns/usuárias são paginados. Conteúdos também são paginados, com filtros no banco por tipo, status, título/categoria. O histórico de relatórios próprios mostra os 200 registros recentes.
- APK físico, rede do celular e firewall de entrada no telefone permanecem verificação manual. Nenhum .env foi sobrescrito.

Referências de segurança: [sessões e cookies — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [proxy de rotas — Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites), [config plugins — Expo](https://docs.expo.dev/config-plugins/mods/), [permissões de rede local — Android](https://developer.android.com/privacy-and-security/local-network-permission), [APK — Expo](https://docs.expo.dev/build-reference/apk/).
