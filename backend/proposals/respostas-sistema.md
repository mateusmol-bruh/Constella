# Respostas, eventos de saída e reenvio seguro

Status em 23/10/2026: aplicada no banco de desenvolvimento após autorização
explícita na solicitação de correção urgente. Backup completo verificado e SQL
validado em transação revertida antes da aplicação. Dados existentes preservados.
Ver `docs/RECUPERACAO_CONVERSAS_2026-10-23.md` para evidências e testes.

Proposta: migração aditiva `20261023000400_respostas_sistema` em `mensagem` e
`postagem`. Adiciona `resposta_id` com FK anulada ao excluir a original, `envio_id`
opcional com unicidade por autora e `postagem.tipo_post` (padrão `MENSAGEM`).
Os services conferem a conversa/fórum da original antes de gravar. Eventos de saída
são criados pelo servidor, na transação que remove a participação.

Nenhuma tabela ou dado é removido. Risco: ALTER TABLE/índices podem bloquear escritas
durante a aplicação; esta versão do backend exige as novas colunas. Fazer backup,
validar primeiro em banco de desenvolvimento e coordenar a atualização do servidor.
Em outros ambientes, não aplicar automaticamente: a aplicação depende de
autorização explícita, conforme o AGENTS.md da raiz.

Depois da autorização, no diretório `backend`:

```powershell
npx prisma migrate deploy --config ./prisma7.config.ts
npm run prisma:generate
```
