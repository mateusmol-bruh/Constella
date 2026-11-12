# Recuperação por Gmail — reconciliação segura do banco

30/10/2026, branch `feat/integracao-final`. Após a restauração da pasta, os arquivos de duas migrações estavam ausentes, mas ambas continuavam aplicadas no PostgreSQL de desenvolvimento **Constella/public**.

Foram restaurados `20261030000100_add_password_recovery` e `20261030000200_recuperacao_moderada`. Seus bytes foram comparados por SHA-256 aos checksums registrados em `_prisma_migrations`: correspondência exata. Nas duas migrações mais antigas, as diferenças de checksum bruto são somente CRLF/LF; o conteúdo normalizado corresponde ao histórico. Nenhum registro do histórico foi editado.

O schema Prisma volta a representar as três tabelas físicas já existentes. Somente `recuperacao_senha` é utilizada pela recuperação por Gmail. As estruturas históricas de solicitação/auditoria ficam preservadas, sem rotas ou fluxo de aprovação no painel.

**Não há nova alteração estrutural a aplicar neste banco:** a tabela de recuperação, índices, restrições e FK já existem. Não foram executados reset, drop, truncate, seed nem reaplicação do SQL. A restauração dos arquivos não recria tabelas. Validar o schema, regenerar o Client e conferir status/diff por comandos de leitura.

Contagens iniciais: usuaria 30, moderadora 6, conteudo 6, conteudo_pro 5, denuncia 12, mensagem 31, postagem 21 e sessao 16; as três tabelas de recuperação estão vazias. Conferir novamente após os testes. O `.env` permanecerá sem alteração; credenciais serão preenchidas manualmente pelo responsável.

Caso outro ambiente precise de migração, revisar o destino e obter autorização explícita antes de aplicar, conforme AGENTS.md. Não corrigir divergências de histórico com reset ou alteração manual de checksums.
