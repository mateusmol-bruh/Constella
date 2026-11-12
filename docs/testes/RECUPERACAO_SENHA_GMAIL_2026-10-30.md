# Testes da recuperação Gmail — 30/10/2026

Projeto: **o Constella**, branch **feat/integracao-final**, workspace Desktop/Constella, data America/Sao_Paulo. [Implementação e execução](../RECUPERACAO_SENHA.md).

Registro histórico de 30/10. [Revisão posterior de 05/11/2026](REVISAO_RECUPERACAO_SENHA_2026-11-05.md). [Resumo e capturas desta execução](evidencias/recuperacao-gmail/resultado.json), arquivados em 05/11 com a data original preservada.

| Execução | Contabilizados | Aprovados | Falhas | Ignorados |
| --- | ---: | ---: | ---: | ---: |
| Backend padrão, npm test | 127 | 115 | 0 | 12 |
| PostgreSQL/reinício explícitos | 18 | 18 | 0 | 0 |
| Mobile, npm test | 68 | 68 | 0 | 0 |
| **Total Node** | **213** | **201** | **0** | **12** |

Os 12 opcionais não são aprovações. As duas suítes de recuperação foram executadas separadamente com a flag própria; o runner inclui testes pais em sua contagem. Também passaram TypeScript, schema/Client/status/diff Prisma, export Android/Hermes e web e sete verificações exploratórias de navegador. A conexão TLS/autenticação Gmail real passou **sem enviar mensagem**.

## Condições e evidências

**DB:** PostgreSQL desenvolvimento Constella/public, tabela física existente, contas artificiais e transporte capturado antes de carregar a API. HTTP/SQL reais, sem envio à internet. Datas são ajustadas só no relógio injetado ou na própria fixture.

**UI:** bundle web real do mobile no Edge/Playwright, mesma API/DB, captura de e-mail, 320/390 px. A prévia usa HTML/logo reais e código mascarado. Não é teste em Gmail/Outlook/Yahoo ou Android físico.

**SMTP:** configuração real do `.env`, Nodemailer/Gmail TLS, somente verify(), sem destinatário ou sendMail; nenhum valor impresso.

Logs locais em mobile/.expo: **E1** gmail-recovery-backend-tests.log; **E2** gmail-recovery-integration-tests.log; **E3** gmail-recovery-mobile-tests.log e gmail-recovery-typecheck.log; **E4** gmail-recovery-review/resultado.json e gmail-recovery-browser.log; **E5** gmail-recovery-smtp-verify.log; **E6** gmail-recovery-migration-status.log e gmail-recovery-schema-diff.log; **E7** gmail-recovery-export.log. Resumo e capturas sem segredos em evidencias/recuperacao-gmail/. Logs de execução ficam ignorados pelo Git.

Todos os casos abaixo foram executados em **30/10/2026**. Entradas/códigos/senhas são artificiais e mantidos em memória, sem valores ativos neste relatório.

## Casos

| ID | Objetivo / condição | Passos e entrada | Esperado | Obtido / status | Evidência |
| --- | --- | --- | --- | --- | --- |
| GR-01 | Conta existente / DB | POST forgot com e-mail da fixture; drenar fila | 202, destinatário do banco, HMAC | **Aprovado:** uma mensagem capturada, CID, HMAC hex64, TTL 600.000 ms | E2 |
| GR-02 | Conta ausente / DB | Solicitar endereço fictício sem conta e comparar | Mesmo 202/corpo; sem mensagem | **Aprovado:** resposta só message, sem emissão extra | E1/E2 |
| GR-03 | E-mail inválido / DB/UI | Texto sem formato de e-mail | 400 e bloqueio local | **Aprovado:** sem envio | E1/E2/E3/E4 |
| GR-04 | Código válido / DB | Verificar e redefinir com senha válida | 200, consumo e bcrypt | **Aprovado:** 12 rounds e uso único | E1/E2 |
| GR-05 | Código incorreto / DB | Seis dígitos diferentes do válido | 400, tentativa persistida | **Aprovado:** sem troca de senha | E1/E2/E4 |
| GR-06 | Expirado / DB | Expirar fixture; reset; relógio entre verify/reset | 400 sem alteração | **Aprovado:** prazo revalidado | E1/E2 |
| GR-07 | Reuso / DB | Repetir geração consumida | 400 | **Aprovado** | E1/E2 |
| GR-08 | Solicitações excessivas / DB | Repetir antes de 60 s, até cinco/hora e limite HTTP | Emissão limitada; 429/Retry-After | **Aprovado:** janela persistida e HTTP | E1/E2/E3 |
| GR-09 | Erros excessivos / DB | Cinco erros; depois correto | Código esgotado | **Aprovado:** contador cinco persistido | E1/E2 |
| GR-10 | Falha SMTP / DB | Transporte injetado recusa conexão; drenar fila | 202 e geração invalidada | **Aprovado com falha induzida:** enviado_em nulo, utilizado_em preenchido | E1/E2 |
| GR-11 | Política de senha / DB/UI | Curta, excesso UTF-8, igual à atual, confirmação diferente | Bloqueio/400 sem consumo | **Aprovado:** formulário não envia fraca/divergente | E1/E2/E3/E4 |
| GR-12 | Persistência/revogação / DB | Reset e consulta da própria fixture/sessão/push | Atualização atômica | **Aprovado:** JWT antigo 401, push inativo, onboarding preservado | E2 |
| GR-13 | Login novo / DB/UI | Autenticar com senha nova | 200/Home | **Aprovado** | E2/E4 |
| GR-14 | Login antigo / DB/UI | Autenticar com senha anterior | 401/erro | **Aprovado** | E2/E4 |
| GR-15 | Cadastro original / DB/processo | Cadastrar fixture pela API e autenticar | 201/JWT/contrato | **Aprovado:** só fixture nova | E2 |
| GR-16 | Login original e corrida | Hash muda durante emissão de sessão | Normal funciona; comparação antiga é revogada | **Aprovado:** regressão específica | E1/E2 |
| GR-17 | Reinício / DB | Emitir em A, encerrar, iniciar B com outro PID | Código válido sem nova emissão | **Aprovado:** verify 200 em outro processo | E2 |
| GR-18 | Concorrência / DB real | Duas redefinições simultâneas | Um 200 e um 400 | **Aprovado:** consumo único | E2 |
| GR-19 | Independência/domínios | Quatro domínios e código de A na B | Destinatários dinâmicos; isolamento | **Aprovado capturado:** Gmail/Hotmail/Outlook/Yahoo; não comprova entrega externa | E1/E2 |
| GR-20 | Template / MIME/UI | Compilar MIME e abrir prévia desktop/320 px | Logo CID/texto/HTML legíveis | **Aprovado:** related/alternative, logo idêntica, sem overflow | E1/E4 |
| GR-21 | Rede e UX / UI | Abortar primeiro forgot, repetir, esperar, mostrar senha, concluir | Erro sem envio falso; fluxo funciona | **Aprovado:** sete verificações; código fora de URL/storage | E4 |
| GR-22 | Gmail / SMTP real | npm run email:verify | TLS/auth sem mensagem | **Aprovado:** conexão/autenticação confirmadas, sem envio | E5 |

Também aprovados: tabela/FK verificadas por SQL; geração anterior invalidada em reenvio; verify não consome/renova; recuperação de fixture banida mantém 403/CONTA_BANIDA; IDs/papel enviados no corpo não alteram outra conta.

## Bloqueados e não executados

| Item | Estado | Motivo / próximo passo |
| --- | --- | --- |
| Envio e recebimento em Gmail autorizado | **Bloqueado por destinatário não confirmado** | Autorização perguntada; nenhum envio enquanto não houver confirmação |
| Hotmail/Outlook e Yahoo reais | **Bloqueado** | Nenhuma conta autorizada disponibilizada |
| Logo/formatação dentro dos clientes | **Pendente** | MIME/navegador passaram; conferir e-mail recebido em cada cliente |
| Insomnia GUI | **Não executado** | 13.4.0 sem janela acessível mesmo após tentativa de abertura; YAML v5 validado com 11 requests |
| Beekeeper GUI | **Não executado** | 6.0.5 identificado; estrutura conferida por SQL equivalente |
| Expo Go/Android físico | **Não executado** | Export Android/Hermes e UI web passaram; aparelho não utilizado |

verify() não equivale a envio, aceite de mensagem ou chegada à caixa. Transporte capturado não é recebimento real. Nenhum envio em massa ou para endereço não autorizado foi realizado.

## Dados e histórico

Baseline: usuaria 30, moderadora 6, conteudo 6, conteudo_pro 5, denuncia 12, mensagem 31, postagem 21 e sessao 16; recuperação/solicitação/auditoria zero. Suítes com rollback conferem contagens. Reinício cria e limpa apenas a própria conta nova/sessões/recuperação, após conferir ID/nome/e-mail exatos. Nenhum registro preexistente é removido.

Migrações restauradas conferem com o banco; antigas diferenças CRLF/LF são somente fim de linha. Sem nova migração, reexecução de CREATE, reset ou edição do histórico. `.env` não alterado e valores privados não impressos.

## Reproduzir

Em backend/:

```powershell
npm test
npm run prisma:validate
npm run email:verify
$env:RUN_PASSWORD_RECOVERY_DB_TESTS='1'
node --test --test-concurrency=1 tests/recuperacao-senha.database.test.js tests/recuperacao-senha.restart.test.js
Remove-Item Env:\RUN_PASSWORD_RECOVERY_DB_TESTS
```

Em mobile/:

```powershell
npm run typecheck
npm test
npx expo export --platform android --platform web --output-dir .expo/gmail-recovery-check
```

Usar somente PostgreSQL de desenvolvimento confirmado. O ensaio exploratório usa ferramentas locais em .expo, sem adicionar Playwright ao aplicativo. Repetição manual: iniciar API/Expo e seguir a documentação com conta autorizada.

## Ocorrências corrigidas

Auxiliar de leitura: `Error: Cannot find module '../backend/node_modules/dotenv'`, corrigido o caminho. Patches de auxiliares/documentação foram recusados por BOM na primeira linha; reaplicados com âncoras corretas, sem escrita parcial. Gerador da coleção: `AssertionError [ERR_ASSERTION]` em `assert.ok(start>=0)` devido a CRLF, corrigido antes de gravar o export.

No navegador, pg 8.23.1 avisou `DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.` no cliente único da transação de revisão. O ensaio terminou com sete verificações, zero erros de página e rollback. O servidor normal mantém seu pool. Avisos NO_COLOR/FORCE_COLOR na exportação não impediram o bundle.

Nenhum teste funcional executado foi reprovado. Itens externos/gráficos permanecem explicitamente pendentes.
