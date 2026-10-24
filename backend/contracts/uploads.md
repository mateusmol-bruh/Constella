# Upload de fotos

`POST /api/uploads/imagens` exige JWT Bearer de usuária existente.

Corpo JSON: `{ "imagem": "<bytes da imagem em base64, sem prefixo data:>" }`.
Limites: 2 MB decodificados, JPG/PNG, até 20 megapixels; JSON até 3 MB; 40 envios por hora por conta. O servidor verifica assinatura do formato e dimensões, gera o nome do arquivo e não aceita nome/caminho fornecido pelo cliente.

Resposta 201: `{ "caminho": "/uploads/<uuid>.png" }` (ou `.jpg`). Salvar esse caminho nos campos existentes `foto` de PUT /api/perfil ou `capa` de POST /api/foruns. O envio do arquivo e a gravação de perfil/fórum são duas operações; o mobile só indica sucesso depois da gravação correspondente.

`GET /uploads/:nome` lê a imagem pública, sem token, para exibição de fotos/capas entre usuárias. Só aceita nomes gerados pelo servidor; não fornece listagem nem caminhos arbitrários. As respostas incluem tipo de imagem, nosniff, CSP e cache imutável.

Armazenamento padrão: backend/uploads. Configure UPLOADS_DIR para diretório persistente gravável quando necessário. Em Docker, monte volume em /app/uploads com permissão para o usuário node. Arquivos não entram no Git ou no contexto Docker; devem integrar backups e ser compartilhados entre réplicas do servidor. Não há contratação de armazenamento externo nem migração de banco.

Trocar/remover foto desfaz a referência, sem exclusão automática dos arquivos anteriores. Falha depois do upload pode deixar arquivo não associado. Limpeza de arquivos requer processo separado, após verificar referências; não foi executada.

Cobertura disponível: testes HTTP em `tests/upload.test.js` e roteiro de integração
em `mobile/scripts/integration-api.cjs` para arquivo, vínculo no PostgreSQL e leitura
depois do reinício da API. A disponibilidade desses testes não implica execução
em cada alteração; veja o relatório da rodada para os resultados efetivos.

## Seletor de conversas

Chats e fóruns usam seleção sem recorte. O mobile normaliza a foto para JPEG,
limita a maior dimensão a 2048 px e comprime preservando a proporção. Se o resultado
ainda exceder 2 MB após uma segunda compressão, informa o limite antes da rede.
O transporte continua sendo o JSON/base64 deste contrato, com JWT; não utiliza
multipart/FormData nem cabeçalho de multipart manual. Timeout de upload: 60 s.

A prévia usa o arquivo otimizado local. O caminho confirmado é reaproveitado
quando só a gravação da mensagem falha. A mensagem aparece como enviada após a
confirmação da API, com `envio_id` para repetição segura. O visualizador usa JWT
para anexos privados e permite abrir a foto inteira em `contain`.
