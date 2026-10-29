# Proposta: integração administrativa e sessões — 29/10/2026

Arquivo: src/prisma/migrations/20261029000100_moderacao_sessoes/migration.sql.

- Preserva as tabelas compartilhadas de conteúdos gratuitos e PRO. Acrescenta publicado (padrão true para manter os registros existentes visíveis), capa, categoria e data de atualização; PRO recebe referência opcional à moderadora autora.
- Acrescenta descrição opcional de até 2.000 caracteres às denúncias; motivo e estados existentes são mantidos. Decisões continuam em relatorio_moderacao, na mesma transação do status.
- Cria sessao para usuárias e moderadoras. Armazena apenas hash de identificador aleatório, titular, datas e revogação; não armazena JWT, senha ou cookie em texto. Expiração absoluta de 1 hora; inatividade máxima de 30 minutos no painel. Logout invalida a sessão no servidor. JWTs antigos exigirão novo login.
- Painel recebe cookie HttpOnly, SameSite=Strict, Secure em produção, validação de origem e token CSRF. Mobile mantém Bearer no SecureStore, agora com sessão revogável.

Risco: ALTER TABLE e criação dos índices exigem bloqueio breve. lock_timeout de 5s cancela se a tabela estiver ocupada; a transação impede aplicação parcial. Nenhuma tabela é apagada, nenhum registro existente é removido e nenhum seed é executado. Sessões novas passam a depender desta migration; executar backend atualizado sem ela retorna indisponibilidade explícita.

Plano: conferir migrations atuais, validar Prisma/SQL e aplicar somente após autorização explícita em banco confirmado de desenvolvimento; verificar contagens antes/depois e testar autenticação, revogação, publicação/despublicação e denúncias. Não aplicar em produção nesta tarefa.

## Aplicação confirmada

Aplicada em 29/10/2026, após autorização explícita para desenvolvimento. Prisma validate passou, migrate status informa as 6 migrations aplicadas. Contagens anteriores preservadas. Validação funcional e limites estão documentados em ../../docs/INTEGRACAO_FINAL_MODERACAO.md.
