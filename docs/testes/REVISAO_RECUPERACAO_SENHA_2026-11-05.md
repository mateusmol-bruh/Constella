# Revisão da recuperação de senha — 05/11/2026

O fluxo de recuperação do Constella está implementado e integrado ao mobile, Express e PostgreSQL. Não foram encontradas falhas funcionais nos cenários revisados e executados. A revisão não alterou código funcional, dependências, `.env` ou estrutura do banco.

## Verificações executadas nesta revisão

| Verificação | Resultado |
| --- | --- |
| Backend: `npm test` | 115 aprovados, zero falhas, 12 opcionais ignorados |
| Recuperação com PostgreSQL/HTTP e reinício real da API | 18 aprovados, zero falhas, nenhum ignorado |
| Mobile: `npm test` | 68 aprovados, zero falhas |
| Mobile: `npm run typecheck` | Aprovado |
| Prisma: validate / migrate status / migrate diff | Schema válido; nove migrações aplicadas; nenhuma diferença entre banco e schema |
| Gmail: `npm run email:verify` | TLS e autenticação reais aprovados; nenhum e-mail enviado |
| Coleção Insomnia | 11 requisições de recuperação válidas; requisições e ambientes anteriores preservados |
| Logo inline | PNG idêntico ao arquivo oficial; MIME/CID cobertos pelo teste backend |
| Segredos / dados | Valores privados ausentes dos arquivos alterados; `.env` e contagens preservados durante a revisão |
| Git | `diff --check` aprovado; branch mantida, sem commit ou publicação |

**Total: 201 testes Node aprovados, zero falhas e 12 opcionais ignorados.** Os testes de banco usam transporte capturado: HTTP, SQL e bcrypt são reais; o Gmail não recebe mensagens desse ensaio.

## Fluxo e proteção revisados

- Login abre as três etapas reais: solicitar código, verificar código e definir/confirmar nova senha. Os campos começam vazios e o sucesso retorna ao login.
- O destinatário vem da conta no banco, com resposta genérica para conta existente ou ausente. Não há dependência de aprovação da moderação.
- Código aleatório de seis dígitos, HMAC com segredo separado do JWT, validade de dez minutos e uso único. Verificação não renova o prazo nem consome o código; a troca revalida tudo.
- Limites por IP/e-mail, até cinco erros por geração e intervalo de reenvio persistido. Código anterior é invalidado no reenvio e códigos de contas diferentes são isolados.
- Nova senha com bcrypt de 12 rounds. Atualização da senha, consumo do código, revogação de sessões e desativação de push ocorrem na mesma transação.
- Senha antiga e JWT antigo são recusados após a troca. Duas trocas simultâneas permitem exatamente um consumo. Código já emitido continua válido após reinício da API, dentro do prazo.
- Banimento e onboarding são preservados; campos arbitrários de identidade/permissão não escolhem outra conta. O código não é enviado em URL ou salvo no storage do aplicativo.
- Falha SMTP induzida foi tratada sem validar a geração não enviada. Nenhum código, senha ou credencial foi exposto no relatório.

## Limites e pendências

O código está concluído e as verificações acima passaram. **Recebimento em caixa externa ainda não está confirmado:** autenticar no Gmail não comprova envio ou entrega. Nesta revisão não foi enviado e-mail real nem alterada a senha de conta preexistente.

Falta testar manualmente com uma conta cadastrada sob controle da pessoa responsável: iniciar a API e o mobile, solicitar recuperação, conferir entrada/spam, usar o código recebido e entrar com a nova senha. A aparência final da logo deve ser conferida no cliente de e-mail. Expo Go/aparelho físico também não foram utilizados nesta revisão.

A fila de envio está em memória; encerrar a API antes do envio pode exigir nova solicitação. Código persistido e aceito pelo SMTP sobrevive ao reinício. Os limites de tentativas/emissões no banco persistem; os contadores HTTP em memória reiniciam com o processo.

## Evidências e reprodução

[Resultado desta revisão em JSON](evidencias/recuperacao-gmail/revisao-2026-11-05/resultado.json). Logs locais ignorados pelo Git em `mobile/.expo/review-2026-11-05-*.log`. As [capturas visuais anteriores](evidencias/recuperacao-gmail/resultado.json) são de **30/10/2026**, arquivadas na documentação em 05/11; não representam nova execução no navegador.

Os testes usaram o PostgreSQL de desenvolvimento `Constella/public`, com rollback ou limpeza apenas da conta artificial criada pelo próprio teste, conferindo sua identidade. Contagens anteriores e posteriores foram comparadas. Não houve reset, seed, aplicação de migração ou edição do histórico.

Na pasta `backend`:

```powershell
npm test
npm run email:verify
npm run prisma:validate
npm run prisma:status
$env:RUN_PASSWORD_RECOVERY_DB_TESTS='1'
node --test --test-concurrency=1 tests/recuperacao-senha.database.test.js tests/recuperacao-senha.restart.test.js
Remove-Item Env:\RUN_PASSWORD_RECOVERY_DB_TESTS
```

Na pasta `mobile`:

```powershell
npm test
npm run typecheck
```

[Configuração, contratos e inicialização](../RECUPERACAO_SENHA.md).
