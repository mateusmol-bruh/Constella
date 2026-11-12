# Revisão de integração — 23/10/2026

Revisão limitada aos arquivos alterados da missão e aos contratos efetivamente consumidos. Não foram lidos arquivos `.env` nem executadas operações de banco nesta revisão.

## Achados

- **Médio, corrigido:** IDs positivos acima de `9223372036854775807` passavam pela validação dos services e alcançavam o Prisma, embora não caibam em BIGINT PostgreSQL. A validação agora limita a 19 dígitos e confere o valor antes de consultar o banco. Arquivos: `src/services/chat.service.js:11`, `forum.service.js:9`, `postagem.service.js:17`, `denuncia.service.js:9`, `pro.service.js:15`, `assinatura.service.js:10`, `usuario.service.js:9` e `conteudo.service.js:14`.
- Nenhum achado impeditivo ou alto identificado no escopo inspecionado. Isso não substitui teste em aparelho ou auditoria de produção.

## Contratos e controles inspecionados

- Login/cadastro e perfil não retornam CPF nem hash de senha. JWT da usuária valida algoritmo, emissor, público, tipo, expiração e subject dentro do BIGINT; a identidade das operações privadas vem desse subject.
- Conclusão do onboarding é persistida em campo próprio e salva em transação junto com apresentação e interesses. Seleção vazia é aceita; logout não altera a conclusão. O aplicativo usa o indicador do backend e inicia os campos de primeira entrada vazios.
- Chats privados conferem participação e conexão aceita. Fóruns usam postagens próprias, exigem vínculo para leitura/envio, conferem autoria para edição/exclusão e oferecem denúncias com participação verificada. As rotas e envelopes correspondem aos services Axios inspecionados.
- Histórico tem ordem determinística e paginação de até 50 registros; o painel atualiza por consultas periódicas controladas, suspende leituras ao perder foco e limpa conteúdo quando perde acesso. Não há declaração de WebSocket.
- Sem provedor, o servidor mantém Pro inativo, inclusive para registros legados de assinatura. Catálogo traz apenas metadados; material e anexos têm middleware no servidor. Criação/cancelamento retornam indisponibilidade sem simular pagamento ou cancelamento efetivo.
- Splash substitui a rota por Login após 2 segundos. O PNG de onboarding foi comparado byte a byte com o PNG embutido no asset oficial `mobile/assets/images/imagem_meninas.svg`: iguais. A logo compacta usa a proporção `2453/1380` do asset oficial e está presente em Home, Perfil e Pro.

## Verificação executada nesta revisão

Na pasta `backend`:

```text
node --test tests/id-limits.test.js tests/social.test.js tests/pro.test.js
```

Resultado: **29 aprovados, 0 falhas, 0 ignorados**. Os quatro testes novos verificam 45 requisições HTTP com IDs inválidos sem alcançar o Prisma, os limites inclusivos 1/BIGINT máximo e os services Pro/assinatura. O Prisma é simulado e não há escrita SQL. As verificações TypeScript, Expo Doctor e integração com PostgreSQL pertencem à execução principal; não foram repetidas pelo revisor.

Tentativas auxiliares corrigidas: os caminhos `mobile/AGENTS.md` e `mobile/.codex/agents/revisor_qualidade.toml` retornaram `PathNotFound`; foram utilizadas as instruções da raiz e `.codex/agents/revisor_qualidade.toml`. A primeira comparação de asset via `node -e` falhou por aspas do PowerShell com `ReferenceError: Cannot access 'fs' before initialization`; a comparação foi reexecutada via stdin e aprovada.

## Limites e pendências

- Compra, validação de recibos, expiração e cancelamento real dependem de provedor; o acesso fica bloqueado até essa integração.
- Recuperação de senha informa indisponibilidade na interface; não foi inventado endpoint.
- Não foi realizada validação visual em dispositivo físico nesta revisão.
