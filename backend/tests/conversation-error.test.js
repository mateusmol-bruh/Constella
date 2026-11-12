const test = require('node:test');
const assert = require('node:assert/strict');
const { responderErroConversa } = require('../src/utils/conversation-error');

function response() {
  return { statusCode: 0, headers: {}, status(value) { this.statusCode = value; return this; },
    set(name, value) { this.headers[name] = value; }, json(body) { this.body = body; return this; } };
}

test('schema pendente retorna 503 e referência; logs não expõem SQL, tokens ou conteúdo', () => {
  const lines = [], previous = console.error;
  console.error = (...args) => lines.push(args.join(' '));
  try {
    const error = Object.assign(new Error('TOKEN_SECRETO SQL_SENSIVEL CONTEUDO_PRIVADO'), { code: 'P2022', meta: { modelName: 'mensagem', query: 'SQL_SENSIVEL' } });
    error.stack = 'Error: TOKEN_SECRETO\n    at Object.listarMensagens (C:\\Constella\\backend\\src\\services\\chat.service.js:242:21)';
    const res = response(); responderErroConversa(res, error, 'chat');
    assert.equal(res.statusCode, 503); assert.equal(res.body.codigo, 'CONVERSAS_ATUALIZACAO_PENDENTE');
    assert.equal(res.headers['Retry-After'], '5');
    assert.ok(lines[0].includes(res.body.referencia));
    assert.ok(lines[0].includes('src/services/chat.service.js:242:21'));
    assert.doesNotMatch(lines.join(' ') + JSON.stringify(res.body), /TOKEN_SECRETO|SQL_SENSIVEL|CONTEUDO_PRIVADO/);
  } finally { console.error = previous; }
});

test('indisponibilidade temporária e erro interno recebem códigos distintos', () => {
  const previous = console.error; console.error = () => {};
  try {
    for (const code of ['P1001', 'P2024', 'ECONNRESET']) {
      const res = response(); responderErroConversa(res, { code }, 'postagem');
      assert.equal(res.statusCode, 503); assert.equal(res.body.codigo, 'CONVERSAS_TEMPORARIAMENTE_INDISPONIVEIS');
    }
    const res = response(); responderErroConversa(res, new Error('detalhe privado'), 'forum');
    assert.equal(res.statusCode, 500); assert.equal(res.body.codigo, 'ERRO_INTERNO_CONVERSA');
    assert.doesNotMatch(JSON.stringify(res.body), /detalhe privado/);
  } finally { console.error = previous; }
});

test('não encontrado, autenticação e autorização preservam status e não viram erro interno', () => {
  for (const statusCode of [401, 403, 404]) {
    const res = response(); responderErroConversa(res, { statusCode, message: 'Mensagem adequada' }, 'chat');
    assert.equal(res.statusCode, statusCode); assert.equal(res.body.mensagem, 'Mensagem adequada');
  }
});
