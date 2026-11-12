# Proposta de persistência do onboarding

Estado: **aprovada e aplicada em desenvolvimento em 23/10/2026**. Autorização explícita do usuário: “Sim, autorizo e confirmo banco de desenvolvimento”. Migração aplicada: `src/prisma/migrations/20261023000100_onboarding/migration.sql`. Cliente gerado: Prisma ORM 7.10.0. PostgreSQL 17.11.

Inspeção inicial, anterior à aprovação: banco consultado somente para leitura, `0_init` concluída e ambos os campos ausentes. `NODE_ENV` estava ausente; o caráter de desenvolvimento foi confirmado depois pelo usuário. A aplicação não alterou `.env` nem exibiu credenciais.

Campos adicionados somente ao modelo `usuaria`:

```prisma
onboarding_concluido Boolean @default(false)
apresentacao        String? @db.VarChar(500)
```

SQL de revisão original: `onboarding.sql`, fora da pasta de migrations, arquivado. **Não executar novamente.** A aplicação autorizada usou a migration acima.

Impacto: duas colunas novas, sem exclusão ou transformação de registros. O `ALTER TABLE` exige lock breve; limite de espera de 5 segundos aborta em caso de disputa. Todas as contas existentes começam com `false` e apresentação nula. Não é possível deduzir conclusão histórica pela quantidade de interesses; contas existentes passarão pelo fluxo uma vez até concluírem explicitamente. Reversão que remova as colunas perderia os novos dados e exige nova aprovação.

Execução realizada após aprovação: `prisma validate --config ./prisma7.config.ts`; status inicial confirmado; migration aditiva revisada aplicada com `prisma migrate deploy --config ./prisma7.config.ts`; `prisma generate --config ./prisma7.config.ts`. Status final: duas migrations reconhecidas, banco atualizado. Nenhum reset, exclusão ou alteração de dados antigos foi executado. A aprovação desta proposta abrangeu somente as duas colunas.

Validação executada: 10 testes HTTP com banco simulado aprovados; um teste HTTP com PostgreSQL aprovado, cadastrando duas novas contas identificadas como TESTE e confirmando conclusão com lista vazia, novo login com indicador persistido, apresentação e isolamento entre contas; um teste do bloqueio de seed fora de desenvolvimento aprovado. As contas de teste permaneceram no banco de desenvolvimento; registros anteriores foram preservados.

Seed existente revisado e executado duas vezes após a confirmação de desenvolvimento, conforme a missão. A senha foi gerada somente em memória. Exige opt-in `NODE_ENV=development`, `ALLOW_DEVELOPMENT_SEED=true` e `SEED_PASSWORD` local; não expõe credenciais e usa o Prisma Client compartilhado. Quantidades das 21 tabelas envolvidas foram comparadas: nenhuma inserção na primeira execução (fixtures existentes), nenhuma duplicação ou mudança de contagem na segunda. Isso valida repetição sequencial do seed no banco inspecionado, sem alegar pagamento real para assinaturas de exemplo.

Compatibilidade para outras instalações ainda sem esta migration: login e perfil informam `onboarding_concluido: null` se o cliente gerado não contiver os campos. Conclusão responde `503 ONBOARDING_MIGRACAO_PENDENTE`; o aplicativo deve oferecer erro e nova tentativa, sem assumir nova conta.
