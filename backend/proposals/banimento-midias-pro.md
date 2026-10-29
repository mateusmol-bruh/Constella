# Proposta: banimentos administrativos e mídias PRO

Migração: src/prisma/migrations/20261029000200_banimento_midias_pro/migration.sql.

- usuaria: banida (padrão false), data, motivo e moderadora responsável. Reversão preserva os metadados do último banimento; ambas as ações ficam no relatorio_moderacao existente. Bloqueios pessoais permanecem independentes.
- arquivo_pro: somente metadados, UUID, SHA-256, tamanho, dimensões/duração e responsável pelo upload. Binários ficam em uploads/pro, fora da rota pública de imagens. Sem base64 no banco.
- conteudo_pro: duas referências opcionais a arquivo_pro (imagem e vídeo), sem duplicar a estrutura de conteúdos. Registros existentes continuam com referências nulas.
- Ao banir, revogar as sessões da usuária e desativar seus dispositivos push na mesma transação. Desbanir exige novo login; não reativa tokens antigos.

Riscos: bloqueio breve das tabelas usuaria/conteudo_pro para ALTER TABLE e validação das FKs; lock_timeout de 5s e statement_timeout de 30s abortam em caso de contenção. Nenhum DROP, DELETE, reset ou seed. O armazenamento local requer cópia de segurança do banco E de uploads/pro; não há hospedagem externa.

Aplicar SOMENTE após autorização explícita no PostgreSQL de desenvolvimento. Validar Prisma antes, comparar contagens antes/depois e executar testes transacionais com rollback após aplicação. Não há autorização para aplicar esta migração até confirmação específica.

## Aplicação autorizada

Em 29/10/2026 a usuária autorizou explicitamente esta migração no banco de desenvolvimento. Aplicada com prisma migrate deploy e client gerado. Contagens antes/depois: usuaria 23, moderadora 6, conteudo 4, conteudo_pro 4, denuncia 9, mensagem 12, postagem 11. Nenhum registro removido.
