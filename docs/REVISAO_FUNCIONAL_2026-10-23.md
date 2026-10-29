# Revisão funcional do Constella — 23/10/2026

## Escopo e estado final

Implementação feita sobre o projeto existente, preservando React Navigation, componentes e identidade visual. Nenhuma alteração no schema do Prisma, migração, branch, commit, merge ou push nesta etapa. As modificações anteriores do workspace foram mantidas.

## Correções entregues

- Fóruns: Explorar abre a listagem completa e identifica os fóruns dos quais a conta participa; Meus fóruns continua filtrando a participação retornada pelo servidor. A conversa usa título e capa do fórum consultado, não uma imagem da usuária ou avatar humano gerado. Capa sem imagem/erro usa ícone de fórum; imagens recebem chave por origem para não manter a foto anterior na troca.
- Ações: ícones próprios de atualizar, sair, editar e excluir. Participante comum vê Sair; criadora vê Editar/Excluir, com confirmação de exclusão. O backend continua sendo a autoridade. Fóruns com postagens retornam conflito e não são apagados em cascata. A edição reutiliza a tela de criação, inclusive capa por arquivo.
- Feedback: provider de avisos acessíveis e temporários, reaproveitado para criar/editar/excluir/entrar/sair de fórum, salvar interesses/perfil, aceitar/enviar conexão e denunciar. Erros continuam nos componentes Notice/ResourceState existentes, sem falso sucesso.
- Denúncia de usuária: modal com motivo obrigatório de até 255 caracteres, confirmação, carregamento, trava contra envio simultâneo e estado Denúncia enviada. Usa a rota real de denúncias; bloqueia reenvio no mesmo modal após sucesso.
- Recomendações em Conexões: seção própria em Descobrir, usando o endpoint existente. Exibe foto, nome e interesses em comum. Recomendações com interesses em comum vêm antes da descoberta geral, sem repetir pessoas ou misturar conexões já aceitas/pendentes.
- Interesses: catálogo real, seleção inicial vazia, edição de escolhas salvas, gravação real e aviso de sucesso. As telas recarregam ao recuperar foco; as recomendações também são consultadas periodicamente enquanto visíveis. Testado com duas contas: atribuir interesse em comum altera recomendação; remover a escolha elimina a compatibilidade anterior. Nenhuma conclusão de onboarding inferida pela quantidade de interesses.
- Imagens: ações separadas de galeria e câmera; somente Tirar foto pede permissão e abre câmera. Recusa, cancelamento e falha são tratados. Resposta tardia do seletor após fechar o formulário é ignorada. Abrir outro fórum reinicia o estado do formulário; cancelar edição do perfil não reutiliza rascunho/foto anterior. Upload continua real, autenticado e associado ao perfil/fórum ao salvar.

## PRO de demonstração

Modo isolado em `backend/src/services/pro-demo.service.js`, com ativação por conta autenticada, prazo de uma hora e estado apenas em memória. Reiniciar o servidor encerra o modo. Não cria assinatura, não registra pagamento e não modifica o banco.

Exige simultaneamente `NODE_ENV=development` e `CONSTELLA_PRO_DEMO=true`. Produção recusa a demonstração mesmo com a variável habilitada. O cliente não escolhe o ID beneficiado: o servidor usa somente a identidade do JWT. Outro ID no corpo não concede acesso a outra conta.

Para usar, encerre o backend que estiver usando a porta e, dentro de backend:

```powershell
npm.cmd run demo
```

O comando exige conexão local de desenvolvimento e não sobrescreve .env. Depois, crie uma conta nova no mobile, abra Constella Pro e toque Ativar demonstração PRO. O status passa a PRO · Demonstração e o material exclusivo é liberado pelas rotas reais protegidas. Encerrar demonstração revoga esse acesso. Nenhum preço foi inventado.

O simulador visual de pagamento anterior continua sendo somente demonstrativo; ativação de conta PRO é uma ação separada confirmada pelo servidor. Para remover a funcionalidade, retirar o serviço de demonstração, a rota `/api/pro/demonstracao`, o ramo de status em assinatura.service e o botão no mobile. As rotas de material e a regra de pagamentos reais permanecem protegidas.

## Lacunas preservadas e documentadas

- Recuperação de senha: não existe endpoint, armazenamento de token de recuperação, expiração/uso único nem serviço de envio de e-mail no backend atual. Criada tela dedicada e tipada, com validação do e-mail e feedback explícito de indisponibilidade. Nenhuma requisição foi enviada a rota inventada e nenhum e-mail foi confirmado como enviado. Integração real permanece pendente desses contratos.
- Bloqueio de usuária: não existe rota nem modelo/contrato de bloqueio. A opção no modal informa a indisponibilidade; não afirma sucesso, não oculta uma pessoa localmente como se houvesse bloqueio no servidor e não reutiliza denúncia como bloqueio. Para bloqueio efetivo será necessária decisão de backend e persistência compatível, fora desta execução que proíbe alterar schema.
- Denúncias duplicadas após fechar/reabrir o modal: não há unicidade de denúncia pendente por alvo no contrato do banco. O frontend impede simultaneidade e reenvio no modal atual, sem alegar deduplicação global.
- Câmera/seleção em dispositivo físico: validação manual ainda necessária. Em APK já instalado, a nova configuração de permissão exige nova compilação; no Expo Go, a permissão é solicitada em tempo de execução.

## Endpoints utilizados

| Área | Rotas |
| --- | --- |
| Fóruns | GET/POST `/api/foruns`; GET/PUT/DELETE `/api/foruns/:id`; POST `/api/foruns/:id/entrar`; DELETE `/api/foruns/:id/sair` |
| Conversa/moderação | GET/POST `/api/foruns/:id/postagens`; DELETE `/api/postagens/:id`; POST `/api/denuncias/postagens/:id` e `/mensagens/:id` |
| Usuárias | GET `/api/usuarios/:id`; POST `/api/denuncias/usuarias/:id` |
| Recomendações | GET `/api/recomendacoes/usuarios`, `/foruns`; GET/PUT `/api/interesses/meus`; GET `/api/interesses` |
| Perfil/conexões | GET/PUT `/api/perfil`; POST `/api/conexoes/:id`; PATCH `/api/conexoes/:id/aceitar` e `/recusar`; leituras de conexões existentes |
| Fotos | POST `/api/uploads/imagens`; GET `/uploads/:nome` |
| PRO | GET `/api/pro`, `/api/pro/catalogo`, `/api/pro/conteudos/:id`; nova POST `/api/pro/demonstracao` exclusiva de desenvolvimento explícito |

## Testes executados antes da limpeza

- TypeScript aprovado e lint sem erros, com 13 avisos existentes.
- 35 testes mobile aprovados, incluindo atualização de chat/fórum, capa correta no cabeçalho, visibilidade de sair/excluir, confirmação de exclusão, permissão da câmera e cancelamento.
- 49 testes backend aprovados: autenticação/onboarding, social, upload, público e PRO. Novos cenários demonstram isolamento entre contas, ausência de escrita de assinatura, retorno ao bloqueio após desativação e recusa em produção.
- Integração real mobile/Axios/Express/Prisma/PostgreSQL: oito resultados aprovados. Inclui upload persistido, reinício da API, leitura real de material PRO em demonstração, recomendações após alterar interesses, criação/edição/saída/exclusão de fórum, recusa de exclusão por outra conta e isolamento de chat.
- Exportação Android registrada ao concluir o comando, sem equivaler a APK instalado. Teste físico e build nativo não realizados.

Não foram executados testes que criam registros após a limpeza, para manter o banco pronto para novos cadastros.

## Limpeza do banco local

Autorizada no pedido anexado. Relações e foreign keys inspecionadas, com prévia antes da aplicação. Execução transacional por DELETE em ordem de dependência, com limite de espera por lock; sem TRUNCATE, reset de IDs, DROP, alteração de schema ou migração.

Preservados: seis interesses, dois conteúdos comuns, quatro vínculos conteúdo/interesse, dois conteúdos PRO e quatro moderadoras essenciais (seed ou responsáveis pelo conteúdo preservado).

Removidos: 37 usuárias, 13 chats, 45 mensagens, 21 conexões, 12 fóruns, 31 postagens, sete denúncias, seus sete vínculos, duas assinaturas legadas, quatro registros de moderação e os vínculos pessoais de conteúdo, interesses e participação. Tabelas de dados pessoais/sociais terminaram zeradas. As sequências não foram reiniciadas, evitando reutilizar IDs de contas antigas enquanto seus JWTs ainda puderem existir.

Colunas, constraints e histórico de migrações foram comparados antes/depois e permaneceram iguais. Relatório de contagens: [LIMPEZA_BANCO_2026-10-23.json](LIMPEZA_BANCO_2026-10-23.json). Uploads em disco não foram apagados: o pedido de limpeza se restringe ao banco.

Script com prévia por padrão: `NODE_ENV=development node scripts/clean-development.cjs`. A opção `--apply` apaga registros e foi usada somente para a limpeza autorizada. Não execute novamente depois de começar novos testes sem intenção de remover essas novas contas.

## Arquivos desta etapa

Criados:

- backend/src/services/pro-demo.service.js
- backend/scripts/start-demo.cjs
- backend/scripts/clean-development.cjs
- mobile/src/constexts/FeedbackContext.tsx
- mobile/src/components/ForumCover.tsx
- mobile/src/screens/RecuperarSenhaScreen.tsx
- docs/REVISAO_FUNCIONAL_2026-10-23.md
- docs/LIMPEZA_BANCO_2026-10-23.json

Modificados:

- Backend: package.json, src/services/assinatura.service.js, src/routes/pro.routes.js, src/middlewares/pro.middleware.js, tests/pro.test.js.
- Mobile: app.tsx, app.json; components/Artwork, Social, Icon, ChatPanel, ImageField e PersonModal; navigation/AppNavigator; screens/Forum, ChatForum, CriarForum, Home, Conexoes, Interesses, Perfil, Login, ConstellaPro e DetalhePro; services/social, pro, image e api; types/models, navigation e pro; utils/pro; scripts/test-images.cjs, test-social-ui.cjs e integration-api.cjs.

Os caminhos de componentes/telas/serviços acima são relativos a mobile/src, com suas extensões .tsx/.ts existentes. Nenhum arquivo do schema ou das migrações foi modificado nesta etapa.
