# Autenticação, perfil e interesses

Base: `/api`. JSON UTF-8. IDs BIGINT são strings decimais positivas. Exemplos usam placeholders, nunca credenciais reais. Erros seguem `{ "mensagem": "...", "codigo": "..." }`; `codigo` existe somente quando necessário. Rotas privadas usam `Authorization: Bearer <token>` validado para emissor `constella`, público `constella-app`, algoritmo HS256, tipo `usuaria`, subject positivo e expiração. O ID pessoal vem sempre desse JWT.

## POST /auth/cadastro

Pública; limitada a 5 requisições/15 minutos por IP. Payload: `{ "nome": "Conta de exemplo", "email": "conta@example.invalid", "senha": "<senha definida localmente>", "cpf": "<CPF válido da solicitante>" }`.

Validações: nome obrigatório até 255 caracteres; e-mail válido até 255 normalizado para minúsculas; senha de pelo menos 8 caracteres e até 72 bytes UTF-8; CPF com dígitos verificadores, com ou sem máscara. Não aceita campos de permissão nem conclusão de onboarding enviados pelo cliente.

201: `{ "mensagem": "Usuária cadastrada com sucesso!", "token": "<JWT>", "usuaria": { "id": "<id>", "nome": "Conta de exemplo", "email": "conta@example.invalid", "status_verificacao": false, "onboarding_concluido": false, "apresentacao": null }, "proxima_etapa": "interesses" }`. A indicação legada `proxima_etapa` é mantida; a navegação deve consultar o indicador persistido. Nunca retorna CPF, hash nem senha.

Erros: 400 validação, 409 e-mail ou CPF existente, 429 limite, 500 falha interna.

## POST /auth/login

Pública; limitada a 10 requisições/15 minutos por IP. Payload: `{ "email": "conta@example.invalid", "senha": "<senha definida localmente>" }`.

Valida tipos, formato e limite do e-mail, presença de senha e limite de 72 bytes. Compara hash bcrypt. 200: `{ "mensagem": "Login realizado com sucesso", "token": "<JWT>", "usuaria": { "id": "<id>", "nome": "Conta de exemplo", "email": "conta@example.invalid", "status_verificacao": false, "onboarding_concluido": false, "apresentacao": null } }`. JWT dura uma hora; não existe refresh token ou rota de refresh. Logout limpa a sessão no aplicativo; não altera onboarding.

Erros: 400 validação, 401 credenciais inválidas (mesma resposta para conta ausente e senha incorreta), 429 limite, 500 falha interna.

## GET /perfil

Privada; sem payload. 200: `{ "id_usr": "<id>", "nome_usr": "Conta de exemplo", "email_usr": "conta@example.invalid", "foto_usr": null, "status_verificacao": false, "onboarding_concluido": true, "apresentacao": "", "interesses": [] }`. Seleção vazia não é usada para inferir conclusão. Nunca retorna CPF nem hash.

Erros: 401 JWT ausente/inválido/expirado, 403 tipo de conta inadequado, 404 usuária não encontrada, 500 falha interna.

## PUT /perfil

Privada. Atualização parcial com pelo menos um campo: `{ "nome": "Conta de exemplo", "email": "conta@example.invalid", "foto": null, "apresentacao": "" }`. Nome até 255; e-mail válido até 255; foto nula ou string até 500; apresentação string até 500. Campos omitidos preservados; textos são aparados. Não modifica `onboarding_concluido`, mesmo quando enviado pelo cliente.

200: `{ "mensagem": "Perfil atualizado com sucesso.", "perfil": { "id_usr": "<id>", "nome_usr": "Conta de exemplo", "email_usr": "conta@example.invalid", "foto_usr": null, "status_verificacao": false, "onboarding_concluido": true, "apresentacao": "" } }`.

Erros: 400 validação, 401/403 autenticação, 404 conta ausente, 409 e-mail existente, 503 migração de onboarding pendente, 500 falha interna.

## PUT /perfil/onboarding

Novo endpoint necessário para salvar atomicamente a apresentação, interesses e indicador persistido, independente da quantidade de interesses. Privado. Payload obrigatório: `{ "apresentacao": "", "interesses": [] }`.

Apresentação pode ser vazia e tem limite de 500 caracteres. Interesses: de 0 a 10 IDs em strings positivas, sem duplicatas e presentes em `GET /interesses`. Não aceita IDs arbitrários de outra usuária para determinar o destino. Transação substitui os relacionamentos, salva o texto e define `onboarding_concluido = true`; falhas revertem todas as alterações. Reenvio é permitido e não cria relacionamentos duplicados.

200: `{ "mensagem": "Onboarding concluído com sucesso.", "perfil": { "id_usr": "<id>", "nome_usr": "Conta de exemplo", "email_usr": "conta@example.invalid", "foto_usr": null, "status_verificacao": false, "onboarding_concluido": true, "apresentacao": "", "interesses": [] } }`.

Erros: 400 texto/IDs inválidos ou inexistentes, 401/403 autenticação, 404 conta ausente, 409 relacionamento alterado concorrentemente, 503 `{ "codigo": "ONBOARDING_MIGRACAO_PENDENTE", "mensagem": "A persistência do onboarding aguarda migração autorizada no servidor." }`, 500 falha interna. Cliente ou banco sem os campos não deve presumir conclusão; leitura pode retornar `onboarding_concluido: null` e exigir nova tentativa.

## GET /interesses

Privada; sem payload. 200: `[{ "id_intr": "<id>", "nome_intr": "Leitura" }]`, ordenados por nome. Catálogo vazio retorna `[]`; o aplicativo não deve inventar IDs ou opções.

Erros: 401/403 autenticação, 500 falha interna.

## GET /interesses/meus

Privada; sem payload. 200: `{ "interesses": [{ "id_intr": "<id>", "nome_intr": "Leitura" }] }` ou `{ "interesses": [] }`.

Erros: 401/403 autenticação, 500 falha interna.

## PUT /interesses/meus

Privada. Payload: `{ "interesses": [] }` ou `{ "interesses": ["<id válido do catálogo>"] }`. Valida 0 a 10 IDs positivos em strings, sem duplicatas, dentro do BIGINT PostgreSQL e presentes no catálogo. Substitui interesses da conta do JWT, sem alterar o indicador de onboarding.

200: `{ "mensagem": "Interesses atualizados com sucesso.", "interesses": [] }`. Erros: 400 array ou IDs inválidos/inexistentes, 401/403 autenticação, 409 relacionamento inválido, 500 falha interna.

## Execução e verificação

`npm start` e `npm run dev` iniciam `server.js` na porta `PORT` (padrão 3000), ouvindo `0.0.0.0`. Importar `server.js` exporta o Express sem iniciar servidor, permitindo testes HTTP em porta efêmera. Requer `DATABASE_URL` e `JWT_SECRET` locais; exemplos permanecem sem segredo. `GET /` é público e retorna somente mensagem de disponibilidade.

`npm test` executa testes com mocks e ignora testes de banco por padrão. Testes de banco exigem `NODE_ENV=development` e `RUN_DATABASE_TESTS=true`: criam duas contas marcadas TESTE, sem apagar contas existentes ou exibir credenciais. Seed é manual, com `NODE_ENV=development`, `ALLOW_DEVELOPMENT_SEED=true`, `SEED_PASSWORD` local de 12 caracteres ou mais e até 72 bytes; nunca é executado no start. Mantém registros existentes e usa o Prisma Client compartilhado. Registros de assinatura no seed são exemplos legados de banco, sem confirmação de pagamento real.
