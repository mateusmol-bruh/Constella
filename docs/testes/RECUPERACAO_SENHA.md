# Recuperação de senha do Constella — Gmail e Nodemailer

Entrega de **30/10/2026**, branch **feat/integracao-final**, workspace `Desktop/Constella`. O fluxo atual utiliza e-mail e preserva JWT/bcrypt e React Navigation. Não depende de aprovação no painel.

**Revisado em 05/11/2026:** código, integração e testes conferidos novamente; 201 aprovações Node, zero falhas, TypeScript/Prisma e autenticação Gmail aprovados. Sem mudança funcional ou alteração do `.env` nesta revisão. Recebimento externo e aparelho físico continuam pendentes. [Relatório atualizado](testes/REVISAO_RECUPERACAO_SENHA_2026-11-05.md).

**Verificado:** APIs, PostgreSQL, mobile, template/identidade, testes e autenticação SMTP Gmail. **Pendente:** autorização do destinatário para envio real e confirmação de recebimento/logo nos clientes de e-mail. A autenticação SMTP passou sem enviar mensagem; não comprova chegada à caixa. O `.env` existente foi preservado.

## Funcionamento e segurança

Login → Esqueci minha senha → e-mail → verificação do código → nova senha e confirmação → login. O backend responde genericamente antes da busca/envio assíncronos. Para conta existente, obtém o endereço no PostgreSQL e envia pelo Gmail. Não há restrição de domínio destinatário: Gmail, Hotmail, Outlook, Yahoo e outros e-mails válidos seguem a mesma implementação.

- Seis dígitos com `crypto.randomInt`, HMAC-SHA256 vinculado à geração UUID, usuária, e-mail e código. Segredo exclusivo, diferente do JWT; comparação em tempo constante.
- Validade de dez minutos, uso único, até cinco erros somados entre verificação/reset. Verificação não autentica, consome ou renova prazo; reset revalida tudo.
- Intervalo mínimo de 60 segundos e até cinco emissões/hora, persistidos no banco. Novo envio invalida o anterior.
- Limites HTTP: solicitação cinco/IP por 15 minutos e cinco/e-mail por hora; verificação/reset compartilham 30/IP e 20/e-mail por 15 minutos. Chaves por e-mail são HMAC; 429 inclui Retry-After.
- Mesma política do cadastro: mínimo de oito caracteres e máximo de 72 bytes UTF-8. Senha igual à atual é recusada sem consumo.
- Bloqueio da própria linha de usuária, bcrypt com 12 rounds, atualização/consumo/revogação de sessões e desativação de push em uma transação. Duas chamadas concorrentes permitem um único consumo. Login relê o hash após emitir sessão para impedir corrida com comparação antiga.
- Mantém banimento/onboarding; IDs e permissões arbitrários no corpo não determinam a conta. Sem códigos, senhas, HMAC ou credenciais em respostas/logs.
- Falha SMTP invalida a geração, mantendo 202 genérico para não revelar contas. `enviado_em` representa aceite SMTP, não recebimento ou leitura.

A fila possui 100 tarefas e dois envios simultâneos. É memória, não outbox durável: encerramento antes de enviar pode exigir nova solicitação. Código já aceito pelo SMTP permanece no banco e sobreviveu ao teste de reinício. Contadores HTTP reiniciam com o processo; tentativas e emissões persistidas não.

## E-mail e logo

Serviço: `backend/src/services/email.service.js`. Template: `backend/src/templates/recuperacao-senha.js`. Logo: `backend/assets/email/constella-logo.png`, cópia idêntica de `frontend-moderadora/public/constella-logo.png`, 179 × 52 pixels. Não foi criada outra logo.

Anexo Buffer PNG inline, CID `constella-logo@constella.local`, referenciado no HTML com `cid:` e texto alternativo. O cabeçalho claro tem bloco roxo para dar contraste à logo branca. Tabelas, CSS inline, fonte de sistema, rodapé e versão de texto simples mantêm o conteúdo legível sem imagens; sem JavaScript ou recursos de estilo externos. MIME related/alternative e CID foram verificados. Prévia desktop/320 px aprovada; aparência em cada cliente real permanece pendente. [Referência CID do Nodemailer](https://nodemailer.com/message/embedded-images).

## Instalação e configuração

Versões locais conferidas: Node 24.14.0, Express 5.2.1, Prisma/Client 7.10.0, bcryptjs 3.0.3, Nodemailer 10.3.1, Expo 58.0.19 e TypeScript mobile 6.0.3. O registro npm confirmou Nodemailer 10.3.1 estável e Node ≥20. Dependência/lockfile foram atualizados; em outra cópia, usar `npm ci` no backend e mobile.

Preencher manualmente as chaves necessárias, preservando as demais linhas do `.env`; não substituir pelo `.env.example`:

```dotenv
EMAIL_USER=
EMAIL_APP_PASSWORD=
EMAIL_FROM_NAME=Constella
PASSWORD_RESET_SECRET=
```

EMAIL_USER: conta Gmail remetente. EMAIL_APP_PASSWORD: senha de aplicativo dessa conta, 16 caracteres; o serviço normaliza os espaços de agrupamento. EMAIL_FROM_NAME: nome do remetente, padrão Constella. PASSWORD_RESET_SECRET: segredo aleatório de pelo menos 32 bytes, exclusivo e estável entre reinícios. Nenhuma dessas variáveis pertence ao mobile.

Transporte `smtp.gmail.com:465`, TLS implícito, certificado validado, TLS ≥1.2, timeouts de conexão/saudação/socket; debug/logger desativados. Mensagens não podem ler arquivos ou URLs arbitrários: logo é lida de caminho fixo e enviada como Buffer. Não verifica ou envia e-mail automaticamente no start.

Senha de aplicativo requer verificação em duas etapas; políticas da conta podem bloqueá-la, e mudar a senha Google revoga as senhas de app. [Google](https://support.google.com/accounts/answer/185833?hl=pt-BR), [Gmail no Nodemailer](https://nodemailer.com/guides/using-gmail).

Diagnóstico sem enviar mensagem, na pasta backend:

```powershell
npm run email:verify
```

Resultado real: **“Conexão TLS e autenticação Gmail verificadas. Nenhum e-mail foi enviado.”** Não foram exibidos valores nem alterado o `.env`.

## PostgreSQL e migrações

Configuração: `backend/prisma7.config.ts`; schema: `backend/src/prisma/schema.prisma`. Banco **Constella**, schema **public**, tabela física **recuperacao_senha**. Campos: UUID, FK única para usuaria.id_usr, codigo_hash, expira_em, utilizado_em, enviado_em, tentativas, criado_em, janela_inicio e solicitacoes. Índice por expiração, restrições de tentativas 0..5 e emissões 1..5; uma linha por conta. Não armazena código ou senha em texto puro.

A pasta restaurada não tinha dois arquivos que continuavam aplicados no banco. Foram recuperados `20261030000100_add_password_recovery` e `20261030000200_recuperacao_moderada`, ambos com checksum **exato** ao `_prisma_migrations`. Nos dois arquivos mais antigos, diferenças brutas são somente CRLF/LF; conteúdo normalizado confere. Modelos históricos de solicitação/auditoria foram remapeados para corresponder ao banco, sem rotas de aprovação no fluxo atual.

**Nenhuma nova migração ou reexecução de CREATE foi necessária.** Tabelas, registros e histórico foram preservados. Prisma validate/generate/status/diff passaram: nove migrações reconhecidas, banco atualizado, nenhuma diferença. Não houve reset, drop, truncate, seed ou edição de checksums. [Conferência detalhada](../backend/proposals/recuperacao-gmail.md).

Baseline: usuaria 30, moderadora 6, conteudo 6, conteudo_pro 5, denuncia 12, mensagem 31, postagem 21, sessao 16; três tabelas de recuperação vazias. Testes usam rollback ou limpam somente a conta artificial recém-criada por eles, conferindo ID/nome/e-mail. Não removem registros anteriores.

### Beekeeper

Instalação 6.0.5 identificada. A GUI não foi operada; a estrutura foi conferida por SQL no mesmo banco. Abra a conexão, atualize a árvore ou reconecte, selecione public e execute:

```sql
SELECT current_database(), current_schema(), to_regclass('public.recuperacao_senha');
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='recuperacao_senha'
ORDER BY ordinal_position;
SELECT c.conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='public' AND t.relname='recuperacao_senha';
SELECT expira_em, utilizado_em IS NOT NULL AS utilizada,
       enviado_em IS NOT NULL AS aceita_pelo_smtp, tentativas, solicitacoes
FROM public.recuperacao_senha;
```

Em outro ambiente que precise de migração, revisar o destino e obter autorização específica conforme AGENTS.md. Não resolver divergência com reset ou edição manual de checksums.

## APIs

Públicas, sem JWT. Código é string de seis dígitos, preservando zeros iniciais. Exemplos usam placeholders.

| POST | Corpo | Sucesso |
| --- | --- | --- |
| `/api/auth/forgot-password` | `{email}` | 202: `{message:"Se existir uma conta associada a este e-mail, você receberá as instruções de recuperação."}` |
| `/api/auth/verify-reset-code` | `{email,codigo}` | 200: `{message:"Código verificado. Defina sua nova senha."}` |
| `/api/auth/reset-password` | `{email,codigo,novaSenha}` | 200: `{message:"Sua senha foi redefinida com sucesso."}` |

Erros: padrão `{mensagem,codigo?}`; 400 validação; 400/RECUPERACAO_CODIGO_INVALIDO para incorreto/expirado/usado/não enviado/esgotado; 429 limite; 503/RECUPERACAO_INDISPONIVEL configuração ou fila; 503/RECUPERACAO_MIGRACAO_PENDENTE tabela ausente. 202 não confirma entrega. Não retorna código ou ID de conta na solicitação.

## Insomnia

Arquivo **[insomnia_constella.yaml](insomnia_constella.yaml)**: 11 requests em **Autenticação / Recuperação de Senha**; inclui os oito pedidos, verificação opcional, senha fraca e login com a anterior. Comparação estrutural confirmou preservação de todas as requisições/ambientes anteriores.

Insomnia **13.4.0** identificado, sem janela acessível à automação mesmo após tentativa de abertura. Não houve configuração/execução pela GUI. YAML v5 foi preparado e validado, formato oficialmente [suportado](https://developer.konghq.com/insomnia/import-export/).

1. **Import > File**, selecionar YAML e o ambiente local.
2. Configurar base_url como origem do backend, por exemplo `http://127.0.0.1:3000`, sem `/api`; os requests já acrescentam `/api/auth/...`. Conferir a composição existente de esquema/host/caminho no ambiente.
3. test_email deve ser conta sua de teste autorizada. new_password, old_password, reset_code, expired_code e used_code ficam vazios no export; preencher apenas localmente.
4. Solicitar recuperação, conferir HTTP, caixa de entrada e spam; obter o código no e-mail e preencher reset_code. Não há endpoint que revele o código.
5. Verificar código opcionalmente, redefinir, fazer login novo (200) e antigo (401).
6. Para expirado, aguardar dez minutos; para usado, repetir geração consumida; wrong_code sintético deve diferir do válido. Limites podem bloquear outros requests temporariamente.

Não versionar exports posteriores com senhas, códigos ou JWTs reais. Não foi realizado envio em massa.

## Iniciar e testar o mobile

PostgreSQL ativo e dois terminais:

```powershell
# Terminal 1
cd C:\Users\45806396851\Desktop\Constella\backend
npm run email:verify
npm run dev
```

```powershell
# Terminal 2
cd C:\Users\45806396851\Desktop\Constella\mobile
npm run start:lan
```

O script detecta IPv4; com múltiplas interfaces, `npm run start:lan -- http://IPv4_DO_PC:3000`. Celular/computador na mesma rede; escanear QR no Expo Go compatível. API no aparelho físico usa IP do computador. Não foi fixado IP no código.

Telas têm validação, loading, mostrar/ocultar senha, espera de reenvio, erros de rede/timeout e retorno ao login. Inputs começam vazios. Código fica somente na memória do provider, sem URL/parâmetros/storage. Interceptor não envia bearer nas rotas públicas. Sucesso limpa o formulário e transmite somente um booleano ao login. Bundle Android/Hermes exportado; aparelho físico/APK não testados.

## Qualidade, limites e arquivos

[Relatório de testes](testes/RECUPERACAO_SENHA_GMAIL_2026-10-30.md): **201 aprovações Node, zero falhas, 12 ignorados**; TypeScript, export Android/web e sete verificações de navegador passaram. SMTP real autenticado sem envio. Recebimento em Gmail/Outlook/Hotmail/Yahoo, aparência nesses clientes, GUI do Insomnia/Beekeeper e aparelho físico não foram apresentados como aprovados.

Erros comuns: 503 requer conferir quatro variáveis e reiniciar API; EAUTH exige conferir conta/senha de app; timeout requer rede/TLS porta 465. 202 sem recebimento exige conferir spam/caixa e diagnóstico, não consultar HMAC. 429 exige aguardar Retry-After; reiniciar API não zera limites persistidos. Código inválido requer geração mais recente dentro do prazo, sem cinco erros ou uso anterior.

Novos arquivos: serviços de e-mail/recuperação, template, logo, controller/route de recuperação, utils de configuração/validação, script verify-recovery-email, proposta e migrações restauradas, três testes backend e dois helpers; contexto/serviço/schemas mobile, três telas em screens/recuperacao e teste mobile; documentação, relatório e evidências.

Alterados: backend .env.example/package/lockfile/schema/rotas auth/serviço auth/middleware erros/teste auth-onboarding/contrato auth; mobile RecuperarSenha/Login/API/tipos/validação; export Insomnia e notas em três documentos anteriores. O painel web não foi alterado.

Branch mantida; nenhum commit, push, merge, troca de branch ou alteração do `.env`. Nenhum segredo real foi inserido em arquivos versionáveis. A entrega registra separadamente testes executados e dependências externas pendentes.
