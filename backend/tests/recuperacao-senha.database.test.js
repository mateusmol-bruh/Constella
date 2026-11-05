const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { randomBytes } = require('node:crypto');
test(
  'recuperação Gmail: HTTP e PostgreSQL reais com transporte capturado e rollback',
  { skip: process.env.RUN_PASSWORD_RECOVERY_DB_TESTS !== '1', timeout: 150000 },
  async (t) => {
    require('dotenv').config({ quiet: true });
    Object.assign(process.env, {
      NODE_ENV: 'test',
      EMAIL_USER: 'remetente@gmail.com',
      EMAIL_APP_PASSWORD: 'abcdefghijklmnop',
      EMAIL_FROM_NAME: 'Constella',
      PASSWORD_RESET_SECRET: randomBytes(32).toString('hex'),
    });
    const prismaPath = require.resolve('../src/config/prisma'),
      prisma = require(prismaPath),
      bcrypt = require('bcryptjs'),
      mail = require('../src/services/email.service'),
      originalSend = mail.enviarCodigo,
      sentinel = Error('ROLLBACK_GMAIL_RECOVERY');
    const models = [
        'usuaria',
        'moderadora',
        'conteudo',
        'conteudo_pro',
        'denuncia',
        'mensagem',
        'postagem',
        'sessao',
        'recuperacao_senha',
        'solicitacao_recuperacao_senha',
        'auditoria_recuperacao_senha',
      ],
      counts = () => Promise.all(models.map((m) => prisma[m].count())),
      before = await counts();
    const messages = [],
      password = randomBytes(24).toString('hex'),
      newPassword = randomBytes(24).toString('hex');
    let rejecting = false,
      server,
      db,
      base,
      service,
      user,
      token;
    mail.enviarCodigo = async (to, code) => {
      if (rejecting)
        throw Object.assign(new Error('Falha SMTP sintética.'), {
          code: 'ECONNECTION',
        });
      messages.push(mail.message(to, code));
    };
    const codeFrom = (message) => {
      const code = /\n(\d{6})\n/.exec(message.text)?.[1];
      assert.ok(code);
      return code;
    };
    const call = async (route, body, bearer) => {
      const r = await fetch(base + route, {
        method: body ? 'POST' : 'GET',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json(), headers: r.headers };
    };
    async function issue(who = user) {
      await db.recuperacao_senha.updateMany({
        where: { usuaria_id: who.id_usr },
        data: {
          criado_em: new Date(Date.now() - 61000),
          janela_inicio: new Date(Date.now() - 3600001),
        },
      });
      await service.processar(who.email_usr);
      return codeFrom(messages.at(-1));
    }
    try {
      await prisma.$transaction(
        async (tx) => {
          db = new Proxy(tx, {
            get(target, key) {
              if (key === '$transaction') return (cb) => cb(db);
              const value = Reflect.get(target, key);
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
          require.cache[prismaPath].exports = db;
          const suffix = randomBytes(8).toString('hex');
          user = await db.usuaria.create({
            data: {
              nome_usr: 'TESTE recuperação Gmail rollback',
              email_usr: suffix + '@recovery.example.invalid',
              cpf_usr: randomBytes(7).toString('hex').slice(0, 11),
              senha_usr: await bcrypt.hash(password, 4),
              onboarding_concluido: true,
            },
          });
          server = require('../server').listen(0, '127.0.0.1');
          await new Promise((r) => server.once('listening', r));
          base = 'http://127.0.0.1:' + server.address().port;
          service = require('../src/services/recuperacao-senha.service');
          const login = await call('/api/auth/login', {
            email: user.email_usr,
            senha: password,
          });
          assert.equal(login.status, 200);
          token = login.body.token;
          await t.test(
            'contas existentes/ausentes recebem o mesmo 202; MIME usa endereço do banco e logo CID',
            async () => {
              const real = await call('/api/auth/forgot-password', {
                email: user.email_usr,
              });
              await service.aguardarFila();
              const absent = await call('/api/auth/forgot-password', {
                email: suffix + 'ausente@example.invalid',
              });
              await service.aguardarFila();
              assert.equal(real.status, 202);
              assert.equal(absent.status, 202);
              assert.deepEqual(real.body, absent.body);
              assert.deepEqual(Object.keys(real.body), ['message']);
              assert.equal(messages.length, 1);
              assert.equal(messages[0].to.address, user.email_usr);
              assert.equal(
                messages[0].attachments[0].cid,
                'constella-logo@constella.local',
              );
              const row = await db.recuperacao_senha.findUnique({
                where: { usuaria_id: user.id_usr },
              });
              assert.ok(row.enviado_em);
              assert.ok(/^[a-f0-9]{64}$/.test(row.codigo_hash));
              assert.ok(row.codigo_hash !== codeFrom(messages[0]));
              assert.equal(+row.expira_em - +row.criado_em, 600000);
            },
          );
          await t.test(
            'e-mail inválido, senha fraca e tipo de código incorreto não alteram credenciais',
            async () => {
              assert.equal(
                (await call('/api/auth/forgot-password', { email: 'invalido' }))
                  .status,
                400,
              );
              assert.equal(
                (
                  await call('/api/auth/reset-password', {
                    email: user.email_usr,
                    codigo: codeFrom(messages[0]),
                    novaSenha: 'curta',
                  })
                ).status,
                400,
              );
              assert.equal(
                (
                  await call('/api/auth/verify-reset-code', {
                    email: user.email_usr,
                    codigo: 123456,
                  })
                ).status,
                400,
              );
              assert.equal(
                (
                  await db.recuperacao_senha.findUnique({
                    where: { usuaria_id: user.id_usr },
                  })
                ).tentativas,
                0,
              );
            },
          );
          await t.test(
            'código incorreto incrementa tentativas; verificação correta não consome nem renova',
            async () => {
              const code = codeFrom(messages[0]),
                wrong = String((Number(code) + 1) % 1000000).padStart(6, '0');
              assert.equal(
                (
                  await call('/api/auth/verify-reset-code', {
                    email: user.email_usr,
                    codigo: wrong,
                  })
                ).status,
                400,
              );
              assert.equal(
                (
                  await call('/api/auth/verify-reset-code', {
                    email: user.email_usr,
                    codigo: code,
                  })
                ).status,
                200,
              );
              const row = await db.recuperacao_senha.findUnique({
                where: { usuaria_id: user.id_usr },
              });
              assert.equal(row.tentativas, 1);
              assert.equal(row.utilizado_em, null);
            },
          );
          await t.test(
            'expiração é recusada no PostgreSQL antes de trocar a senha',
            async () => {
              const code = codeFrom(messages[0]);
              await db.recuperacao_senha.update({
                where: { usuaria_id: user.id_usr },
                data: { expira_em: new Date(Date.now() - 1) },
              });
              assert.equal(
                (
                  await call('/api/auth/reset-password', {
                    email: user.email_usr,
                    codigo: code,
                    novaSenha: newPassword,
                  })
                ).status,
                400,
              );
            },
          );
          await t.test(
            'cinco erros persistidos bloqueiam inclusive a tentativa seguinte correta',
            async () => {
              const code = await issue(),
                wrong = String((Number(code) + 1) % 1000000).padStart(6, '0');
              for (let i = 0; i < 5; i++)
                await assert.rejects(
                  service.verificar(user.email_usr, wrong),
                  (e) => e.statusCode === 400,
                );
              assert.equal(
                (
                  await db.recuperacao_senha.findUnique({
                    where: { usuaria_id: user.id_usr },
                  })
                ).tentativas,
                5,
              );
              await assert.rejects(
                service.verificar(user.email_usr, code),
                (e) => e.statusCode === 400,
              );
            },
          );
          await t.test(
            'reset atômico atualiza bcrypt, consome código, revoga JWT/push e aceita somente senha nova',
            async () => {
              const code = await issue();
              await db.dispositivo_push.create({
                data: {
                  token: 'ExponentPushToken[' + suffix + ']',
                  id_usr: user.id_usr,
                  plataforma: 'android',
                },
              });
              assert.equal(
                (
                  await call('/api/auth/reset-password', {
                    email: user.email_usr,
                    codigo: code,
                    novaSenha: newPassword,
                    usuaria_id: '1',
                    banida: false,
                  })
                ).status,
                200,
              );
              assert.equal(
                (
                  await call('/api/auth/reset-password', {
                    email: user.email_usr,
                    codigo: code,
                    novaSenha: password,
                  })
                ).status,
                400,
              );
              assert.equal(
                (await call('/api/perfil', undefined, token)).status,
                401,
              );
              assert.equal(
                (
                  await call('/api/auth/login', {
                    email: user.email_usr,
                    senha: password,
                  })
                ).status,
                401,
              );
              assert.equal(
                (
                  await call('/api/auth/login', {
                    email: user.email_usr,
                    senha: newPassword,
                  })
                ).status,
                200,
              );
              const row = await db.usuaria.findUnique({
                where: { id_usr: user.id_usr },
              });
              assert.equal(bcrypt.getRounds(row.senha_usr), 12);
              assert.equal(row.onboarding_concluido, true);
              assert.equal(
                (
                  await db.dispositivo_push.findUnique({
                    where: { token: 'ExponentPushToken[' + suffix + ']' },
                  })
                ).ativo,
                false,
              );
            },
          );
          await t.test(
            'novo código invalida anterior; uma conta não usa o código de outra',
            async () => {
              const first = await issue(),
                second = await issue();
              assert.ok(first !== second);
              await assert.rejects(
                service.verificar(user.email_usr, first),
                (e) => e.statusCode === 400,
              );
              const other = await db.usuaria.create({
                data: {
                  nome_usr: 'TESTE outra titular',
                  email_usr: suffix + 'outro@recovery.example.invalid',
                  cpf_usr: randomBytes(7).toString('hex').slice(0, 11),
                  senha_usr: await bcrypt.hash(password, 4),
                },
              });
              const another = await issue(other);
              await assert.rejects(
                service.verificar(other.email_usr, second),
                (e) => e.statusCode === 400,
              );
              await service.verificar(other.email_usr, another);
              await service.verificar(user.email_usr, second);
            },
          );
          await t.test(
            'falha SMTP mantém 202 genérico e invalida a geração não enviada',
            async () => {
              await db.recuperacao_senha.update({
                where: { usuaria_id: user.id_usr },
                data: {
                  criado_em: new Date(Date.now() - 61000),
                  janela_inicio: new Date(Date.now() - 3600001),
                },
              });
              rejecting = true;
              const r = await call('/api/auth/forgot-password', {
                email: user.email_usr,
              });
              assert.equal(r.status, 202);
              await service.aguardarFila();
              rejecting = false;
              const row = await db.recuperacao_senha.findUnique({
                where: { usuaria_id: user.id_usr },
              });
              assert.ok(row.utilizado_em);
              assert.equal(row.enviado_em, null);
            },
          );
          await t.test('limite HTTP retorna 429 com Retry-After', async () => {
            let r;
            for (let i = 0; i < 8; i++) {
              r = await call('/api/auth/forgot-password', {
                email: user.email_usr,
              });
              if (r.status === 429) break;
            }
            assert.equal(r.status, 429);
            assert.ok(r.headers.get('retry-after'));
            await service.aguardarFila();
          });
          await t.test(
            'recuperação não remove banimento ou aceita permissão administrativa no corpo',
            async () => {
              await db.usuaria.update({
                where: { id_usr: user.id_usr },
                data: { banida: true },
              });
              const code = await issue(),
                changed = randomBytes(24).toString('hex');
              assert.equal(
                (
                  await call('/api/auth/reset-password', {
                    email: user.email_usr,
                    codigo: code,
                    novaSenha: changed,
                    banida: false,
                    tipo: 'moderadora',
                  })
                ).status,
                200,
              );
              const r = await call('/api/auth/login', {
                email: user.email_usr,
                senha: changed,
              });
              assert.equal(r.status, 403);
              assert.equal(r.body.codigo, 'CONTA_BANIDA');
            },
          );
          await t.test(
            'tabela física, FK e migração aplicada são verificadas por SQL',
            async () => {
              const table =
                await db.$queryRaw`SELECT current_database() banco,current_schema() esquema,to_regclass('public.recuperacao_senha')::text tabela`;
              assert.equal(table[0].banco, 'Constella');
              assert.equal(table[0].esquema, 'public');
              assert.equal(table[0].tabela, 'recuperacao_senha');
              const fk =
                await db.$queryRaw`SELECT count(*)::int total FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='recuperacao_senha' AND constraint_type='FOREIGN KEY'`;
              assert.equal(fk[0].total, 1);
            },
          );
          throw sentinel;
        },
        { timeout: 120000, maxWait: 10000 },
      );
    } catch (e) {
      if (e !== sentinel) throw e;
    } finally {
      await service?.aguardarFila();
      if (server) await new Promise((r) => server.close(r));
      require.cache[prismaPath].exports = prisma;
      mail.enviarCodigo = originalSend;
    }
    assert.deepEqual(await counts(), before);
    await prisma.$disconnect();
  },
);
