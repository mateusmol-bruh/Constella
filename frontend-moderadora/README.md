# Constella — Front-end da Moderadora

Implementação do **módulo web da moderadora**, conforme as seis telas do protótipo recebido, com uma tela adicional para consulta dos relatórios. O front-end foi construído em **Next.js (App Router), React, JavaScript e SCSS**. O repositório existente não tinha front-end; este módulo foi adicionado como uma pasta independente, sem substituir o back-end.

## Telas

| Tela do protótipo | Rota |
| --- | --- |
| Login da moderadora | `/moderadora` |
| Painel / resumo / denúncias / fóruns | `/moderadora/painel` |
| Criar Post (publicação de conteúdo informativo) | `/moderadora/criar-conteudo` |
| Gerar relatório | `/moderadora/gerar-relatorio` |
| Ver Relatórios (relatórios manuais, histórico de ações, pesquisa e detalhes) | `/moderadora/ver-relatorios` |
| Detalhes da denúncia | `/moderadora/denuncias/[id]` |
| Detalhes do fórum | `/moderadora/foruns/[id]` |

## Como executar (Windows / PowerShell)

São necessários Node.js **20.9 ou superior**, npm, PostgreSQL e o backend do Constella configurado com sua base de dados.

**Terminal 1 — Backend Express:**

```powershell
cd Constella-dev\backend
npm install
Copy-Item .env.example .env
# Abra o arquivo .env e configure DATABASE_URL e JWT_SECRET.
npx prisma generate --schema=src/prisma/schema.prisma
npm run dev
```

> A configuração de Prisma do seu backend pode usar `prisma7.config.ts` e exigir parâmetros próprios para migrar a base. Configure o banco de acordo com o projeto original antes de testar o login real. Para cadastrar uma moderadora, use `node scripts/cadastrar-moderadora.js` após o banco estar funcional.

**Terminal 2 — Front-end Next.js:**

```powershell
cd Constella-dev\frontend-moderadora
npm install
Copy-Item .env.example .env.local
npm run dev
```

Abra **http://localhost:3001/moderadora** caso a porta 3000 esteja ocupada pelo backend. Por padrão o Next pode perguntar se você quer usar outra porta; alternativamente rode `npm run dev -- -p 3001` para escolher explicitamente a porta.

Se o Next rodar em 3001 e o backend em 3000, o navegador chama `/api/backend/...` e o Next encaminha a requisição para `BACKEND_URL=http://localhost:3000`. Assim, não é preciso mudar URLs em cada componente. Se quiser usar outra porta para o backend, ajuste `BACKEND_URL` em `.env.local` e reinicie o Next.

## Testar sem banco de dados

Na tela de login, clique em **Explorar demonstração sem login**. Esta opção usa dados de exemplo no navegador para mostrar navegação, edição, exclusão, publicação e mudanças de status **sem fazer requisições nem modificar o banco**. O painel mostra uma etiqueta indicando o modo demonstração. O estado da demonstração é guardado em `localStorage`; a sessão fica em `sessionStorage`.

## API integrada

Rotas **existentes no ZIP original**:

- `POST /api/moderacao/login` — login da moderadora com JWT.
- `GET /api/moderacao/denuncias` — listar denúncias.
- `GET /api/moderacao/denuncias/:id` — detalhes da denúncia.
- `PATCH /api/moderacao/denuncias/:id/status` — atualizar status (`PENDENTE`, `EM_ANALISE`, `RESOLVIDA` ou `REJEITADA`).
- `GET /api/moderacao/relatorios` — listar registros da moderadora autenticada, incluindo relatórios manuais e ações de moderação. A nova tela **Ver Relatórios** usa essa rota (não necessita de alteração do banco).
- `POST /api/moderacao/conteudos` — cadastrar conteúdo informativo com título, descrição, texto e duração.

Rotas **adicionadas no backend exclusivamente para o painel**, todas protegidas por `moderadora.middleware.js`:

- `GET /api/moderacao/resumo` — contadores reais do painel.
- `GET /api/moderacao/foruns` — listar fóruns.
- `GET /api/moderacao/foruns/:id` — detalhes do fórum e suas postagens.
- `PATCH /api/moderacao/foruns/:id` — editar título e descrição.
- `DELETE /api/moderacao/foruns/:id` — excluir fórum, postagens e vínculos de participação; operação irreversível e sujeita a confirmação na interface.
- `POST /api/moderacao/relatorios` — criar relatório textual no modelo `relatorio_moderacao` existente.

## Limites atuais do sistema

1. **Banir usuária:** o projeto original não tem uma regra/coluna de bloqueio de conta. O botão foi reproduzido visualmente, mas **não bane ninguém**; ele informa a limitação com clareza. "Manter usuária" rejeita a denúncia, sem efetuar alterações na conta. A denúncia também pode ser marcada como resolvida.
2. **Anexos:** os campos de envio exibem uma prévia local. Como o backend não tem endpoint de upload, a interface impede publicar com arquivo selecionado e explica a razão. Não simula um envio bem-sucedido.
3. **Criar Post:** no protótipo a tela usa esse título, mas a função real disponível na API é `POST /conteudos` (conteúdo informativo), **não** uma postagem em fórum. O formulário manda `titulo`, `texto`, `descricao` (o mesmo texto) e `duracao` informada em minutos.
4. **Fórum / conversas:** o painel exibe as **postagens reais** do fórum no formato de balões, não mensagens de chat privado. O modo demonstração usa mensagens fictícias.
5. **Relatórios:** o título e o conteúdo são registrados juntos na coluna de descrição, pois o modelo atual não tem campos independentes para ambos. A tela **Ver Relatórios** interpreta essa separação para os registros manuais e mostra os demais como registros de ações da moderação. Os dados são obtidos via `GET /api/moderacao/relatorios`; a API não oferece exclusão, edição nem consulta por ID para relatórios, portanto essas operações não são simuladas.
6. **Segurança de sessão:** por simplicidade, este MVP usa `sessionStorage` para o JWT. Para produção, considere usar cookie HTTP-only, CSP, proteção contra XSS, rotinas de sessão e auditoria adicionais.

## Organização

```text
frontend-moderadora/
├── app/
│   ├── globals.scss
│   ├── layout.js
│   ├── page.js
│   └── moderadora/
│       ├── page.js                         # Login
│       ├── painel/page.js
│       ├── criar-conteudo/page.js
│       ├── gerar-relatorio/page.js
│       ├── ver-relatorios/page.js
│       ├── denuncias/[id]/page.js
│       └── foruns/[id]/page.js
├── components/                            # Componentes reaproveitáveis
├── lib/                                   # API, demonstração, formatação
├── public/                                # Logo recortado e estrelas SVG
├── .env.example
├── next.config.mjs
└── package.json
```

**Nota:** Os arquivos do back-end modificados estão restritos a `src/routes/moderacao.routes.js`, `src/controllers/moderacao.controller.js` e `src/services/moderacao.service.js`. Não foi necessária migração no Prisma para essas ações.

## Refinamentos de layout (versão 1.1)

- Em desktops e tablets de largura superior a **700 px**, o **painel principal ocupa a altura da janela** e não apresenta rolagem vertical da página. Caso haja muitos fóruns, a lista de fóruns passa a rolar **internamente**, preservando os botões e o resumo. Em celulares de até 700 px, a rolagem da página permanece disponível para manter a interface utilizável.
- Os formulários **Criar Post** e **Gerar relatório** foram compactados e os botões **Publicar** e **Concluir** passaram a ficar **dentro** do respectivo painel, sem a margem negativa que os recortava.
- Textos, títulos, descrições e botões receberam reduções discretas de fonte, sem alterar a identidade visual.

## Tela adicional: Ver Relatórios (versão 1.3)

- Acesso por **Ver Relatórios**, novo terceiro botão logo abaixo de **Gerar relatório** no painel da moderadora.
- Lista cronológica, pesquisa por título/descrição/data e duas seções separadas: **Relatórios** e **Histórico de Moderação**.
- Ao selecionar um registro, sua data, tipo de ação e descrição aparecem ao lado, no mesmo layout roxo/rosa do painel.
- O botão **Atualizar relatórios** faz uma nova consulta ao back-end. A opção **Gerar novo relatório** leva ao formulário já existente.
- O endpoint `GET /api/moderacao/relatorios` filtra por ID da moderadora autenticada no JWT, conforme `moderacao.service.js`; não retorna relatórios de outras moderadoras.
- A API retorna apenas `{ id, acao, descricao, data }`. Em relatórios manuais, o título é extraído do começo de `descricao` (formato `título\n\nconteúdo`). As ações automáticas são exibidas com títulos baseados no campo `acao`.
- O modo demonstração contém exemplos de registros, sem fazer requisições reais. **Se você já tiver dados antigos no navegador**, eles permanecem no `localStorage` e podem não incluir os novos exemplos.
- **Sem rolagem vertical na página inicial em desktop**: os três atalhos foram compactados; a lista do painel continua podendo ter rolagem interna se necessário.


## Carregamentos animados — astronauta (versão 1.4)

- Componente **`components/AstroLoader.jsx`** com estilos isolados em **`components/AstroLoader.module.scss`**, inspirado no astronauta e nas estrelas enviados no exemplo do **Uiverse.io, por JkHuger**.
- Estrelas em movimento e astronauta rotativo, com cores de capacete, visor e mochila adaptadas à paleta roxa e rosa do Constella.
- **`fullscreen`**: preparação de sessão, autenticação e transição de rotas (`app/moderadora/loading.js`).
- **`section`**: consulta ao painel, denúncias, fóruns e relatórios. A animação ocupa apenas a área onde os dados estão sendo buscados.
- **`overlay`**: publicação de conteúdo e gravação de relatório, sem perder o estado dos formulários. O overlay é removido depois da resposta da API.
- Inclui `role="status"`, rótulos acessíveis, responsividade, isolamento dos elementos para não interferir no design e `prefers-reduced-motion` para usuários que reduzem animações.
- Os carregamentos são exibidos **apenas durante operações reais** (não existe atraso artificial para prolongar a animação). Quando uma operação falha, a tela normal mostra a mensagem de erro existente.

## Correção dos carregamentos (versão 1.5)

A animação CSS funcionava, mas frequentemente **não aparecia**: no modo demonstração as funções do `lib/demo.js` terminam quase imediatamente; o React desmontava o componente antes que o navegador pudesse desenhar os quadros. Além disso, o arquivo `app/moderadora/loading.js` não garante uma tela de carregamento nas trocas rápidas entre rotas client-side.

- O novo utilitário `lib/loading.js` garante **900 ms de visibilidade mínima** para carregamentos de dados, login e operações de escrita rápidas. Se a API demorar mais, não é acrescentado tempo após a resposta. Os resultados e erros continuam vindo das mesmas APIs.
- O novo `components/RouteLoadingOverlay.jsx`, montado no `SessionProvider`, exibe o astronauta quando a moderadora clica em links internos e o remove após a troca de página, com limite de segurança para navegações canceladas. O `loading.js` do App Router continua ativo para carregamentos de streaming.
- Em **Explorar demonstração sem login**, a animação aparece antes de abrir o painel; também aparece ao consultar dados, relatórios e ao publicar/gravar em modo demonstração.
- Atualização de denúncia, edição e exclusão de fórum passaram a usar a animação de envio enquanto aguardam a operação, preservando as mensagens e regras anteriores.
- O arquivo CSS mantém `prefers-reduced-motion: reduce`: se **Reduzir movimento** estiver ativo nas configurações de acessibilidade do sistema/navegador, astronauta e estrelas serão exibidos sem movimento intencionalmente.

**Como conferir:** execute `npm run dev -- -p 3001`, entre em `http://localhost:3001/moderadora` e clique em **Explorar demonstração sem login**. Verifique o astronauta no login, nas trocas de páginas e ao atualizar **Ver Relatórios**. Para testar a rotação e o movimento das estrelas, confirme que a preferência de animação reduzida não está ativada no sistema.

**Validação:** a animação foi inspecionada num navegador Chromium e o `transform` do astronauta e do grupo de estrelas mudou entre quadros. Os componentes JavaScript/JSX passaram por verificação estática. Não foi possível testar o Next.js integrado neste ambiente porque a instalação via npm depende de acesso ao registro externo.

## Histórico de moderação separado (versão 1.6)

- A tela `/moderadora/ver-relatorios` não possui mais o filtro de **tipo de relatório**. Os registros são divididos visualmente em duas seções, sem precisar selecionar um filtro.
- **Relatórios** contém entradas com `acao=RELATORIO_MANUAL`, criadas no formulário **Gerar relatório**. O formulário permanece apenas com os campos título e conteúdo.
- **Histórico de Moderação** mostra ações realmente registradas pelo back-end: `ALTERACAO_STATUS_DENUNCIA`, `CRIACAO_CONTEUDO`, `CRIACAO_CONTEUDO_PRO`, `EDICAO_FORUM` e `EXCLUSAO_FORUM`, além de possíveis outros códigos já existentes no banco.
- Ambas as seções utilizam `GET /api/moderacao/relatorios` com o token da moderadora autenticada; não foi necessária uma rota nova, mudança no Prisma ou alteração da API.
- A barra de pesquisa atua nas duas seções, e clicar em qualquer registro apresenta a descrição detalhada logo abaixo.
- No modo demonstração, a edição/exclusão de fóruns, as mudanças de status das denúncias e a criação de conteúdos geram entradas locais de histórico para ilustrar o comportamento que já existe no back-end. Os exemplos do modo demonstração não representam registros reais do banco de dados.
- O back-end retorna **somente registros da moderadora autenticada**. Não existe uma rota administrativa para consultar ações de todas as moderadoras e essa funcionalidade não foi presumida.

## Correção de auditoria de denúncias (versão 1.7)

**Problema relatado:** após selecionar **Marcar denúncia como resolvida** em `/moderadora/denuncias/[id]`, a ação parecia não constar em **Ver Relatórios → Histórico de Moderação**.

**Comportamento atualizado:**

1. O front-end realiza `PATCH /api/moderacao/denuncias/:id/status`, enviando `{ "status": "RESOLVIDA" }` com o JWT da moderadora.
2. Somente depois de um `PATCH` bem-sucedido, consulta `GET /api/moderacao/relatorios` com parâmetro de atualização para evitar resposta antiga em cache.
3. Verifica se o histórico retornado contém `ALTERACAO_STATUS_DENUNCIA`, com o ID e o novo status da denúncia e horário compatível com a operação.
4. Se o registro estiver no servidor, a interface confirma que ele aparece no **Histórico de Moderação**.
5. Se não estiver, informa a ausência da confirmação e mostra, **somente nesta sessão e identificado como não confirmado**, um aviso em **Ver Relatórios**. O aviso **não grava nada no banco e nunca se apresenta como uma ação persistida**.
6. Ao atualizar a lista ou retornar à aba, a tela faz nova consulta. Quando a API passa a retornar a ação, o aviso local desaparece, substituído pelo registro verdadeiro.

O modo demonstração continua independente do banco e usa apenas `localStorage` para as ações fictícias.

### Teste manual (com banco real)

1. Inicie o back-end correto do Constella e o front-end atualizado (em geral, portas 3000 e 3001, respectivamente).
2. Entre **com a conta real da moderadora** (não use o modo demonstração para validar o PostgreSQL).
3. No painel, abra uma denúncia com status pendente. Clique em **Marcar denúncia como resolvida**.
4. Confira a mensagem de confirmação e clique em **Ver Relatórios e Histórico de Moderação**.
5. Localize **Atualização de denúncia** na seção **Ações de Moderação** e verifique a descrição `Denúncia <ID> alterada para RESOLVIDA.`.
6. Se o registro aparecer como **Pendente de confirmação**, a versão da API executada não está retornando a ação. Confirme que o back-end em execução implementa a criação de `relatorio_moderacao` na mesma transação do `PATCH` e que `GET /api/moderacao/relatorios` usa o **mesmo JWT de moderadora**. Essa divergência não pode ser resolvida apenas pelo front-end.

Arquivos afetados: `lib/api.js`, `lib/audit.js` (novo), `app/moderadora/denuncias/[id]/page.js`, `app/moderadora/ver-relatorios/page.js` e `app/globals.scss`.


## Atualização 1.8 — relatórios unificados e conteúdo PRO com vídeo

**Somente o front-end foi alterado.** O back-end Express, o Prisma e o banco de dados permanecem intactos.

### Ver Relatórios

A página `moderadora/ver-relatorios` agora mostra **uma lista única**, do registro mais recente ao mais antigo, reunindo relatórios manuais e ações de moderação. Não existem mais duas áreas de tipos de relatório, nem filtro por tipo. A pesquisa, os detalhes e os avisos de auditoria não confirmada foram preservados.

### Criar Conteúdo

A página `moderadora/criar-conteudo` tem duas opções:

- **Conteúdo normal:** usa a mesma rota existente `POST /api/moderacao/conteudos`. O fluxo original permanece.
- **Conteúdo PRO:** usa a rota existente `POST /api/moderacao/conteudos/pro`. Inclui título, descrição, texto, duração e seleção de um vídeo MP4/WebM/MOV de até 100 MB, com player de pré-visualização e botão de remoção. O vídeo é opcional.

O Express **não possui endpoint para receber arquivos binários nem campo de URL de vídeo**. Para permitir upload real sem modificá-lo, o front-end pode fazer upload direto para **Cloudinary** usando um preset unsigned e gravar a URL retornada ao final de `texto`:

```
Texto do material

Vídeo PRO: https://res.cloudinary.com/SEU_CLOUD/video/upload/ARQUIVO.mp4
```

O registro de conteúdo PRO e a auditoria continuam sendo realizados **pela API existente**. A aplicação mobile que consumir `mat_text_cont_pro` precisará interpretar a linha `Vídeo PRO:` e renderizá-la em um player; isso **não foi implementado no mobile** e não é responsabilidade deste front-end.

**Para configurar upload de vídeo:**

1. Crie uma conta Cloudinary e um *upload preset unsigned* adequado para vídeos. Configure limites de tamanho, formatos e outras restrições possíveis para evitar uploads indevidos. Consulte as políticas atuais do provedor.
2. Copie `.env.example` para `.env.local` dentro de `frontend-moderadora`, preenchendo:

   ```env
   BACKEND_URL=http://localhost:3000
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=nome-do-cloud
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=nome-do-preset-unsigned
   ```

3. Execute `npm install` e `npm run dev -- -p 3001`. Reinicie o Next.js após editar `.env.local`.
4. Entre com a moderadora real, selecione **Criar Conteúdo → Conteúdo PRO**, escolha o vídeo, confira a prévia e publique.
5. Se o Cloudinary não estiver configurado, o formulário **não envia o vídeo** e mostra mensagem clara. É possível publicar PRO apenas como texto, sem vídeo.

**Limitações importantes:**

- Por padrão, URLs de vídeo enviados com Cloudinary unsigned são **públicas para quem conhece o endereço**. Isso **não fornece proteção de assinatura**. Para servir vídeos PRO com acesso restrito, será necessária uma solução de autenticação/autorização no armazenamento/servidor no futuro; não foi introduzida alteração no back-end nesta entrega.
- Se o vídeo for enviado, mas a criação do registro no Express falhar, o arquivo poderá ficar no Cloudinary sem cadastro associado. O formulário reutiliza o mesmo URL na tentativa seguinte para evitar uploads duplicados, mas a limpeza de arquivos órfãos não está automatizada.
- No **modo demonstração**, o vídeo só é visualizado no navegador e **não é enviado** ao Cloudinary ou ao banco. A criação fictícia do conteúdo PRO fica restrita ao estado local, como antes.
- Nunca inclua `CLOUDINARY_API_SECRET` em variáveis `NEXT_PUBLIC_*`. Um preset unsigned é público; limite os uploads no painel do Cloudinary e monitore uso/consumo.

Arquivos modificados: `app/moderadora/criar-conteudo/page.js`, `app/moderadora/ver-relatorios/page.js`, `app/globals.scss`, `lib/api.js`, `.env.example`; adicionados: `components/VideoUploadBox.jsx`, `lib/video.js`.


## Atualização 1.9 — relatórios separados e visualização em modal

**Somente o front-end foi alterado.** O conteúdo PRO (inclusive o upload configurável de vídeo), a autenticação e as chamadas da API permanecem iguais à versão anterior.

- Em **Ver Relatórios**, os registros vindos de `GET /api/moderacao/relatorios` são agrupados em duas colunas: **Relatórios Manuais** (`acao === 'RELATORIO_MANUAL'`) e **Ações de Moderação** (demais códigos de ação, inclusive ações pendentes de confirmação). A pesquisa continua funcionando nas duas listas.
- Ao clicar no ícone de visualização de qualquer registro, abre-se um **modal centralizado**, em vez de expandir um painel no final da página.
- O modal mostra título, data, identificador e descrição completa. Textos longos têm rolagem **dentro** do modal.
- O modal pode ser fechado pelo botão **X**, pelo botão **Fechar**, pela tecla **Esc** ou clicando fora dele. Durante a visualização, o fundo não rola e a navegação por Tab fica restrita ao modal; ao fechar, o foco retorna ao registro selecionado.
- Não foi reintroduzido nenhum campo de **tipo** no formulário **Gerar Relatório**. A separação é feita apenas na listagem, usando o campo `acao` da API já existente.
- As notificações de histórico ainda não confirmado foram mantidas, sem criar registros falsos no banco.

**Arquivos alterados nesta versão:** `app/moderadora/ver-relatorios/page.js`, `app/globals.scss` e `README.md`. **Nenhuma alteração no back-end.**
