const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken'),
  express = require('express');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const sessao = require('./helpers/sessoes')();
require.cache[require.resolve('../src/config/prisma')] = {
  exports: { sessao },
};
const service = require('../src/services/sessao.service');
const app = express();
app.get('/privado', require('../src/middlewares/auth.middleware'), (req, res) =>
  res.json({ id: req.usuarioId }),
);
app.use(require('../src/middlewares/error.middleware'));
let server, origin;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  origin = 'http://127.0.0.1:' + server.address().port;
});
after(async () => new Promise((r) => server.close(r)));
const call = async (token) =>
  (
    await fetch(origin + '/privado', {
      headers: { Authorization: 'Bearer ' + token },
    })
  ).status;
test('JWT emitido vincula sessão persistida e logout impede replay', async () => {
  const token = await service.emitirSessao('usuaria', '1');
  assert.equal(await call(token), 200);
  const claims = service.verificarJWT(token),
    key = service.hash(claims.jti);
  assert.equal(sessao.rows.get(key).id_usr, 1n);
  assert.ok(
    !JSON.stringify([...sessao.rows.values()], (_, v) =>
      typeof v === 'bigint' ? String(v) : v,
    ).includes(token),
  );
  await service.revogarSessao(key);
  assert.equal(await call(token), 401);
});
test('JWT assinado sem sessão emitida e JWT legado são recusados', async () => {
  for (const payload of [
    { sub: '1', tipo: 'usuaria' },
    { sub: '1', tipo: 'usuaria', jti: randomBytes(32).toString('hex') },
  ]) {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      issuer: 'constella',
      audience: 'constella-app',
      expiresIn: '1h',
    });
    assert.equal(await call(token), 401);
  }
});
test('sessão de outro titular, expirada no banco e JWT com algoritmo diferente são recusados', async () => {
  const token = await service.emitirSessao('usuaria', '1'),
    claims = jwt.decode(token),
    row = sessao.rows.get(service.hash(claims.jti));
  row.id_usr = 2n;
  assert.equal(await call(token), 401);
  row.id_usr = 1n;
  row.expira_em = new Date(0);
  assert.equal(await call(token), 401);
  const wrong = jwt.sign(
    { sub: '1', tipo: 'usuaria', jti: claims.jti },
    process.env.JWT_SECRET,
    {
      issuer: 'constella',
      audience: 'constella-app',
      algorithm: 'HS384',
      expiresIn: '1h',
    },
  );
  assert.equal(await call(wrong), 401);
});
test('sessão moderadora tem limite de inatividade e token CSRF vinculado ao JWT', async () => {
  const token = await service.emitirSessao('moderadora', '1'),
    claims = jwt.decode(token),
    row = sessao.rows.get(service.hash(claims.jti));
  assert.ok(await service.validarSessao(claims));
  row.ultima_atividade = new Date(Date.now() - 31 * 60000);
  await assert.rejects(
    service.validarSessao(claims),
    (e) => e.statusCode === 401,
  );
  const c = require('../src/utils/moderacao-cookie'),
    request = {
      headers: {
        origin: 'http://localhost:3001',
        'x-csrf-token': c.csrf(token),
      },
    };
  c.validarCsrf(request, token);
  assert.throws(
    () => c.validarCsrf(request, token + 'alterado'),
    (e) => e.statusCode === 403,
  );
});

test('conta banida perde acesso mesmo com JWT emitido e sessão revogada', async () => {
  const token = await service.emitirSessao('usuaria', '1'),
    row = sessao.rows.get(service.hash(jwt.decode(token).jti));
  row.usuaria = { banida: true };
  row.revogada_em = new Date();
  const response = await fetch(origin + '/privado', {
    headers: { Authorization: 'Bearer ' + token },
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).codigo, 'CONTA_BANIDA');
});
test('banimento concorrente ao login impede a emissão do token e revoga a sessão recém-criada', async () => {
  let revoked = false;
  const db = {
    sessao: {
      create: async () => {},
      findUnique: async () => ({ usuaria: { banida: true } }),
      updateMany: async () => {
        revoked = true;
        return { count: 1 };
      },
    },
  };
  await assert.rejects(
    service.emitirSessao('usuaria', '1', db),
    (e) => e.statusCode === 403 && e.codigo === 'CONTA_BANIDA',
  );
  assert.equal(revoked, true);
});
