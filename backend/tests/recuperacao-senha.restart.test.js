const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { randomBytes, randomInt } = require('node:crypto'),
  { startApi } = require('./helpers/recovery-process');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function cpf() {
  let s = String(randomInt(1000000000)).padStart(9, '0');
  for (let n = 9; n < 11; n++) {
    let total = 0;
    for (let i = 0; i < n; i++) total += Number(s[i]) * (n + 1 - i);
    s += String(((total * 10) % 11) % 10);
  }
  return s;
}
test(
  'recuperação: reinício real, cadastro/login e redefinição concorrente',
  { skip: process.env.RUN_PASSWORD_RECOVERY_DB_TESTS !== '1', timeout: 120000 },
  async (t) => {
    require('dotenv').config({ quiet: true });
    const db = require('../src/config/prisma');
    const models = [
        'usuaria',
        'moderadora',
        'sessao',
        'mensagem',
        'postagem',
        'recuperacao_senha',
      ],
      counts = () => Promise.all(models.map((m) => db[m].count())),
      before = await counts();
    const suffix = randomBytes(12).toString('hex'),
      email = suffix + '@restart-recovery.example.invalid',
      name = 'TESTE reinício Gmail ' + suffix,
      password = randomBytes(24).toString('hex'),
      newPassword = randomBytes(24).toString('hex');
    const env = {
      NODE_ENV: 'test',
      JWT_SECRET: randomBytes(32).toString('hex'),
      PASSWORD_RESET_SECRET: randomBytes(32).toString('hex'),
      EMAIL_USER: 'remetente@gmail.com',
      EMAIL_APP_PASSWORD: 'abcdefghijklmnop',
      EMAIL_FROM_NAME: 'Constella',
    };
    let api, userId, token, code;
    const call = async (route, body, bearer) => {
      const r = await fetch(api.base + route, {
        method: body ? 'POST' : 'GET',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    };
    try {
      api = await startApi(env);
      await t.test(
        'cadastro e login originais criam somente uma conta artificial',
        async () => {
          const r = await call('/api/auth/cadastro', {
            nome: name,
            email,
            senha: password,
            cpf: cpf(),
          });
          assert.equal(r.status, 201);
          userId = BigInt(r.body.usuaria.id);
          token = r.body.token;
          assert.ok(token);
          assert.equal(
            (await call('/api/auth/login', { email, senha: password })).status,
            200,
          );
        },
      );
      await t.test(
        'solicitação persiste HMAC e transporta código apenas por canal privado do teste',
        async () => {
          assert.equal(
            (await call('/api/auth/forgot-password', { email })).status,
            202,
          );
          const until = Date.now() + 10000;
          while (!api.messages.length && Date.now() < until) await wait(20);
          assert.equal(api.messages.length, 1);
          code = api.messages[0].code;
          let row;
          while (Date.now() < until) {
            row = await db.recuperacao_senha.findUnique({
              where: { usuaria_id: userId },
            });
            if (row?.enviado_em) break;
            await wait(20);
          }
          assert.ok(row?.enviado_em);
          assert.ok(row.codigo_hash !== code);
        },
      );
      const pid = api.pid;
      await api.stop();
      api = await startApi(env);
      assert.notEqual(api.pid, pid);
      await t.test(
        'código persistido continua válido em processo diferente',
        async () => {
          assert.equal(
            (await call('/api/auth/verify-reset-code', { email, codigo: code }))
              .status,
            200,
          );
          assert.equal(api.messages.length, 0);
        },
      );
      await t.test(
        'duas redefinições simultâneas permitem exatamente um consumo',
        async () => {
          const results = await Promise.all([
            call('/api/auth/reset-password', {
              email,
              codigo: code,
              novaSenha: newPassword,
            }),
            call('/api/auth/reset-password', {
              email,
              codigo: code,
              novaSenha: newPassword,
            }),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
        },
      );
      await t.test(
        'senha nova funciona; anterior, JWT anterior e reutilização são recusados',
        async () => {
          assert.equal(
            (await call('/api/auth/login', { email, senha: newPassword }))
              .status,
            200,
          );
          assert.equal(
            (await call('/api/auth/login', { email, senha: password })).status,
            401,
          );
          assert.equal(
            (await call('/api/perfil', undefined, token)).status,
            401,
          );
          assert.equal(
            (
              await call('/api/auth/reset-password', {
                email,
                codigo: code,
                novaSenha: password,
              })
            ).status,
            400,
          );
        },
      );
    } finally {
      await api?.stop();
      if (userId)
        await db.$transaction(async (tx) => {
          const current = await tx.usuaria.findUnique({
            where: { id_usr: userId },
            select: { nome_usr: true, email_usr: true },
          });
          if (
            !current ||
            current.nome_usr !== name ||
            current.email_usr !== email
          )
            throw new Error(
              'Limpeza recusada: a fixture não corresponde à conta criada neste teste.',
            );
          await tx.recuperacao_senha.deleteMany({
            where: { usuaria_id: userId },
          });
          await tx.sessao.deleteMany({ where: { id_usr: userId } });
          await tx.usuaria.delete({
            where: { id_usr: userId, email_usr: email, nome_usr: name },
          });
        });
    }
    assert.deepEqual(await counts(), before);
    await db.$disconnect();
  },
);
