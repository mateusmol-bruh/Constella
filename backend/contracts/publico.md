# Acesso público do Constella

Base `/api/publico`. Rotas somente de leitura, sem JWT, sem criar conta, assinatura ou sessão fictícia. Limite: 120 consultas/minuto por IP; listas limitadas aos 100 registros mais recentes. Nenhuma dessas consultas registra progresso, acesso, participação ou outra ação vinculada a conta. Os serviços usam seleções explícitas e serialização restrita.

Autorização de produto: os conteúdos normais da tabela `conteudo` podem ser lidos publicamente; o material exclusivo da tabela `conteudo_pro` permanece protegido nas rotas originais. O modelo atual não possui um campo adicional de visibilidade nos conteúdos normais. Uma mudança futura dessa regra exige revisar estas consultas.

| Método | Caminho | Resposta200 | Erros |
| --- | --- | --- | --- |
| GET | `/conteudos` | `[{id,titulo,descricao,duracao,data_publicacao,interesses:[{id,nome}]}]` | 429,500 |
| GET | `/conteudos/:id` | `{id,titulo,descricao,duracao,data_publicacao,interesses:[{id,nome}],material}` | 400 ID inválido,404 ausente,429,500 |
| GET | `/foruns` | `[{id_for,titulo,descricao,capa,dt_criacao,quantidade_membros,quantidade_postagens}]` | 429,500 |
| GET | `/pro` | Apresentação e catálogo abaixo | 429,500 |

IDs são strings decimais positivas até BIGINT PostgreSQL. Datas são ISO8601; textos opcionais e durações podem ser nulos. `duracao` de conteúdo normal é número; no catálogo Pro é string ou nulo, preservando o tipo BIGINT. Lista vazia retorna `[]`. Payload não é necessário. Parâmetros não mudam a projeção nem concedem acesso a outros dados.

Exemplo de `/pro` (sem conta, assinatura, preço ou material inventado):

```json
{
  "nome": "Constella Pro",
  "autenticada": false,
  "assinatura": null,
  "provedor_disponivel": false,
  "motivo": "PROVEDOR_NAO_CONFIGURADO",
  "mensagem": "Conheça os conteúdos exclusivos do Constella Pro. As assinaturas ainda não estão disponíveis para contratação.",
  "beneficios": ["Acesso a conteúdos exclusivos do catálogo Pro."],
  "planos": [],
  "catalogo": []
}
```

Cada item de `catalogo` contém somente `{id,titulo,descricao,duracao,data_publicacao}`. Não retorna material ou anexos. A resposta não representa o status de assinatura de uma usuária; somente rotas privadas consultam esse status. A provedora de cobrança ainda não está integrada.

Fóruns públicos não expõem criadora, moderadora, participantes, autoras ou conteúdo das postagens. Não existe detalhe de conversa no prefixo público. Operações POST/PUT/PATCH/DELETE não foram adicionadas. Rotas pessoais originais, mensagens, postagens, conexões, assinatura e conteúdo exclusivo continuam exigindo JWT e autorização.

Erros JSON: `{ "mensagem": "..." }`. Um erro no banco é retornado como erro; não há fallback para dados demonstrativos.

Exemplos sem credenciais: `GET /api/publico/conteudos`, `GET /api/publico/foruns`, `GET /api/publico/pro`; para o detalhe, substituir `:id` por ID retornado na listagem real.

Testes: `node --test tests/publico.test.js` verifica projeções, recusas de acesso e falhas; `NODE_ENV=development` e `RUN_DATABASE_TESTS=true` habilitam `tests/publico.database.test.js`, que compara respostas HTTP com consultasSQL reais sem alterar dados. O teste de cadastro persistente em dois processos de backend é `tests/distribution-persistence.test.js`; cria somente uma conta sintética identificada como TESTE em desenvolvimento, que permanece no banco. Esse teste não substitui teste da interface Android ou de instalação do APK.
