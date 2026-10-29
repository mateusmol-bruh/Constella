const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const enabled = process.env.RUN_MODERATION_DB_TESTS === '1';
test(
  'integração real do painel, conteúdo, denúncias e sessões (rollback)',
  { skip: !enabled, timeout: 180000 },
  async (t) => {
    require('dotenv').config({ quiet: true });
    const prisma = require('../src/config/prisma'),
      bcrypt = require('bcryptjs');
    const sentinel = new Error('ROLLBACK_TESTE_MODERACAO');
    const original = require.cache[require.resolve('../src/config/prisma')].exports;
    let server, origin;
    const password = randomBytes(24).toString('hex');
    const before =
      await prisma.$queryRaw`SELECT (SELECT count(*)::int FROM usuaria) usuarias,(SELECT count(*)::int FROM moderadora) moderadoras,(SELECT count(*)::int FROM conteudo) conteudos,(SELECT count(*)::int FROM denuncia) denuncias`;
    try {
      await prisma.$transaction(
        async (tx) => {
          const db = new Proxy(tx, {
            get(target, key) {
              if (key === '$transaction') return (cb) => cb(db);
              const value = Reflect.get(target, key);
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
          require.cache[require.resolve('../src/config/prisma')].exports = db;
          const suffix = randomBytes(8).toString('hex');
          const m = await db.moderadora.create({
            data: {
              nome_mod: 'TESTE integração rollback',
              email_mod: suffix + '@moderacao.example.invalid',
              senha_mod: await bcrypt.hash(password, 4),
            },
          });
          const account = await db.usuaria.create({
            data: {
              nome_usr: 'TESTE denunciante rollback',
              email_usr: suffix + '@usuaria.example.invalid',
              senha_usr: await bcrypt.hash(password, 4),
              cpf_usr: randomBytes(7).toString('hex').slice(0, 11),
              onboarding_concluido: true,
            },
          });
          const target = await db.usuaria.create({
            data: {
              nome_usr: 'TESTE alvo rollback',
              email_usr: suffix + 'alvo@usuaria.example.invalid',
              senha_usr: await bcrypt.hash(password, 4),
              cpf_usr: randomBytes(7).toString('hex').slice(0, 11),
            },
          });
          const app = require('../server');
          server = app.listen(0, '127.0.0.1');
          await new Promise((resolve) => server.once('listening', resolve));
          origin = 'http://127.0.0.1:' + server.address().port;
          const request = async (
            path,
            { method = 'GET', body, token, cookie, csrf, webOrigin } = {},
          ) => {
            const r = await fetch(origin + path, {
              method,
              headers: {
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(cookie ? { Cookie: cookie } : {}),
                ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
                ...(webOrigin ? { Origin: webOrigin } : {}),
              },
              ...(body ? { body: JSON.stringify(body) } : {}),
            });
            return {
              status: r.status,
              body: r.status === 204 ? {} : await r.json(),
              headers: r.headers,
            };
          };
          const mobile = await request('/api/auth/login', {
            method: 'POST',
            body: { email: account.email_usr, senha: password },
          });
          assert.equal(mobile.status, 200);
          const token = mobile.body.token;
          let cookie, csrf, created, report;
          await t.test('moderadora autentica com cookie HttpOnly e JWT fora do corpo', async () => {
            const r = await request('/api/moderacao/login', {
              method: 'POST',
              body: { email: m.email_mod, senha: password },
              webOrigin: 'http://localhost:3001',
            });
            assert.equal(r.status, 200);
            assert.equal(r.body.token, undefined);
            const set = r.headers.get('set-cookie');
            assert.match(set, /HttpOnly/i);
            assert.match(set, /SameSite=Strict/i);
            cookie = set.split(';')[0];
            csrf = r.body.csrf;
            const session = await request('/api/moderacao/sessao', { cookie });
            assert.equal(session.body.moderadora.id, String(m.id_mod));
            assert.equal(session.body.moderadora.senha_mod, undefined);
          });
          await t.test(
            'usuária comum, CSRF ausente e origem cruzada não acessam escritas administrativas',
            async () => {
              assert.equal((await request('/api/moderacao/resumo', { token })).status, 403);
              assert.equal((await request('/api/moderacao/resumo')).status, 401);
              assert.equal(
                (
                  await request('/api/moderacao/relatorios', {
                    method: 'POST',
                    cookie,
                    body: { titulo: 'teste', conteudo: 'teste' },
                  })
                ).status,
                403,
              );
              assert.equal(
                (
                  await request('/api/moderacao/relatorios', {
                    method: 'POST',
                    cookie,
                    csrf,
                    webOrigin: 'https://origem-invalida.example',
                    body: { titulo: 'teste', conteudo: 'teste' },
                  })
                ).status,
                403,
              );
            },
          );
          const content = {
            titulo: 'TESTE conteúdo integrado',
            descricao: 'Descrição real do teste',
            texto: 'Corpo persistido no PostgreSQL',
            duracao: 3,
            categoria: 'Integração',
            publicado: false,
            capa: null,
          };
          await t.test(
            'rascunho não aparece; publicação disponibiliza o mesmo registro ao mobile',
            async () => {
              const r = await request('/api/moderacao/conteudos', {
                method: 'POST',
                cookie,
                csrf,
                body: content,
              });
              assert.equal(r.status, 201);
              created = r.body.conteudo;
              assert.equal((await request('/api/conteudos/' + created.id, { token })).status, 404);
              assert.equal((await request('/api/publico/conteudos/' + created.id)).status, 404);
              assert.equal(
                (
                  await request('/api/moderacao/conteudos/' + created.id + '/publicacao', {
                    method: 'PATCH',
                    cookie,
                    csrf,
                    body: { publicado: true },
                  })
                ).status,
                200,
              );
              const free = await request('/api/conteudos/' + created.id, { token });
              assert.equal(free.status, 200);
              assert.equal(free.body.conteudo.material, content.texto);
              assert.equal(free.body.conteudo.categoria, content.categoria);
              const row = await db.conteudo.findUnique({ where: { id_cont: BigInt(created.id) } });
              assert.equal(row.id_mod, m.id_mod);
              assert.equal(row.publicado, true);
            },
          );
          await t.test(
            'edição, capa validada, atualização e despublicação também bloqueiam ID antigo',
            async () => {
              const png =
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4F8AAAAASUVORK5CYII=';
              // Validação de arquivo real sem gravar arquivo permanente neste teste transacional.
              assert.equal(
                require('../src/services/upload.service').validateImage(png).extension,
                'png',
              );
              const r = await request('/api/moderacao/conteudos/' + created.id, {
                method: 'PUT',
                cookie,
                csrf,
                body: { ...content, texto: 'Texto atualizado', publicado: true },
              });
              assert.equal(r.status, 200);
              assert.equal(
                (await request('/api/conteudos/' + created.id, { token })).body.conteudo.material,
                'Texto atualizado',
              );
              assert.equal(
                (
                  await request('/api/moderacao/conteudos/' + created.id + '/publicacao', {
                    method: 'PATCH',
                    cookie,
                    csrf,
                    body: { publicado: false },
                  })
                ).status,
                200,
              );
              assert.equal((await request('/api/conteudos/' + created.id, { token })).status, 404);
              assert.equal((await request('/api/publico/conteudos/' + created.id)).status, 404);
            },
          );
          await t.test(
            'PRO publicado aparece somente como catálogo e gratuita não recebe material',
            async () => {
              const r = await request('/api/moderacao/conteudos/pro', {
                method: 'POST',
                cookie,
                csrf,
                body: { ...content, publicado: true, texto: 'Segredo exclusivo do teste' },
              });
              assert.equal(r.status, 201);
              const catalog = await request('/api/pro/catalogo', { token });
              assert.equal(catalog.status, 200);
              const item = catalog.body.conteudos.find((c) => c.id === r.body.conteudo.id);
              assert.ok(item);
              assert.equal(item.material, undefined);
              assert.equal(
                (await request('/api/pro/conteudos/' + r.body.conteudo.id, { token })).status,
                403,
              );
              await request('/api/moderacao/conteudos/pro/' + r.body.conteudo.id + '/publicacao', {
                method: 'PATCH',
                cookie,
                csrf,
                body: { publicado: false },
              });
              assert.ok(
                !(await request('/api/pro/catalogo', { token })).body.conteudos.some(
                  (c) => c.id === r.body.conteudo.id,
                ),
              );
            },
          );
          await t.test(
            'denúncia enviada pela API mobile chega ao painel e decisão persiste com auditoria',
            async () => {
              const r = await request('/api/denuncias/usuarias/' + target.id_usr, {
                method: 'POST',
                token,
                body: { motivo: 'Assédio ou ofensa', descricao: 'Contexto adicional para análise' },
              });
              assert.equal(r.status, 201);
              report = r.body.denuncia.id_den;
              const pending = await request('/api/moderacao/denuncias?status=PENDENTE', { cookie });
              assert.ok(pending.body.denuncias.some((d) => d.id === report));
              assert.equal(
                (await request('/api/moderacao/denuncias/' + report, { cookie })).body.denuncia
                  .descricao,
                'Contexto adicional para análise',
              );
              const status = await request('/api/moderacao/denuncias/' + report + '/status', {
                method: 'PATCH',
                cookie,
                csrf,
                body: {
                  status: 'RESOLVIDA',
                  decisao: 'Análise registrada durante teste de integração.',
                },
              });
              assert.equal(status.status, 200);
              assert.equal(status.body.denuncia.historicoConfirmado, true);
              const detail = await request('/api/moderacao/denuncias/' + report, { cookie });
              assert.equal(detail.body.denuncia.status, 'RESOLVIDA');
              assert.ok(
                detail.body.denuncia.historico.some((h) =>
                  h.descricao.includes('Análise registrada'),
                ),
              );
            },
          );
          await t.test(
            'dashboard corresponde às contagens SQL e consultas não expõem senhas ou CPF',
            async () => {
              const r = await request('/api/moderacao/resumo', { cookie });
              assert.equal(r.status, 200);
              assert.equal(r.body.resumo.usuarias, await db.usuaria.count());
              assert.equal(
                r.body.resumo.denunciasPendentes,
                await db.denuncia.count({ where: { status: 'PENDENTE' } }),
              );
              const users = await request('/api/moderacao/usuarias', { cookie });
              assert.equal(users.status, 200);
              assert.ok(!JSON.stringify(users.body).includes('senha'));
              assert.ok(!JSON.stringify(users.body).includes('cpf'));
            },
          );
          await t.test(
            'relatório manual e edição administrativa do fórum persistem com auditoria',
            async () => {
              const r = await request('/api/moderacao/relatorios', {
                method: 'POST',
                cookie,
                csrf,
                body: {
                  titulo: 'Relatório integração',
                  conteudo: 'Texto registrado pela moderadora.',
                },
              });
              assert.equal(r.status, 201);
              const reports = await request('/api/moderacao/relatorios', { cookie });
              assert.ok(reports.body.relatorios.some((item) => item.id === r.body.relatorio.id));
              const f = await db.forum.create({
                data: {
                  titulo_for: 'TESTE fórum administrativo',
                  id_mod: m.id_mod,
                  id_usr_criadora: account.id_usr,
                },
              });
              assert.equal(
                (await request('/api/moderacao/foruns/' + f.id_for, { token })).status,
                403,
              );
              const edit = await request('/api/moderacao/foruns/' + f.id_for, {
                method: 'PATCH',
                cookie,
                csrf,
                body: { titulo: 'TESTE título atualizado', descricao: 'Descrição revisada' },
              });
              assert.equal(edit.status, 200);
              assert.equal(edit.body.forum.titulo, 'TESTE título atualizado');
              await db.usuaria_forum.create({ data: { id_for: f.id_for, id_usr: account.id_usr } });
              assert.equal(
                (
                  await request('/api/moderacao/foruns/' + f.id_for, {
                    method: 'DELETE',
                    cookie,
                    csrf,
                  })
                ).status,
                409,
              );
              assert.ok(await db.forum.findUnique({ where: { id_for: f.id_for } }));
            },
          );
          await t.test(
            'exclusão preserva conteúdo com acesso e remove somente registro sem histórico',
            async () => {
              await request('/api/moderacao/conteudos/' + created.id + '/publicacao', {
                method: 'PATCH',
                cookie,
                csrf,
                body: { publicado: true },
              });
              const access = await request('/api/conteudos/' + created.id + '/acesso', {
                method: 'POST',
                token,
                body: {},
              });
              assert.ok(access.status === 200 || access.status === 201);
              assert.equal(
                (
                  await request('/api/moderacao/conteudos/' + created.id, {
                    method: 'DELETE',
                    cookie,
                    csrf,
                  })
                ).status,
                409,
              );
              const r = await request('/api/moderacao/conteudos', {
                method: 'POST',
                cookie,
                csrf,
                body: { ...content, titulo: 'TESTE sem histórico' },
              });
              assert.equal(r.status, 201);
              const value = r.body.conteudo.id;
              assert.equal(
                (
                  await request('/api/moderacao/conteudos/' + value, {
                    method: 'DELETE',
                    cookie,
                    csrf,
                  })
                ).status,
                204,
              );
              assert.equal(
                (await request('/api/moderacao/conteudos/' + value, { cookie })).status,
                404,
              );
              assert.equal((await request('/api/publico/conteudos/' + value)).status, 404);
              const listing = await request(
                '/api/moderacao/conteudos?tipo=normal&publicado=true&q=TESTE&limite=1',
                { cookie },
              );
              assert.equal(listing.status, 200);
              assert.equal(listing.body.conteudos.length, 1);
              assert.equal(listing.body.conteudos[0].tipo, 'normal');
              assert.equal(listing.body.conteudos[0].publicado, true);
            },
          );
          await t.test(
            'logout revoga as sessões no servidor; replay de cookie e JWT retorna 401',
            async () => {
              assert.equal(
                (await request('/api/moderacao/logout', { method: 'POST', cookie, csrf })).status,
                204,
              );
              assert.equal((await request('/api/moderacao/resumo', { cookie })).status, 401);
              assert.equal(
                (await request('/api/auth/logout', { method: 'POST', token })).status,
                204,
              );
              assert.equal((await request('/api/perfil', { token })).status, 401);
            },
          );
          throw sentinel;
        },
        { timeout: 150000, maxWait: 10000 },
      );
    } catch (e) {
      if (e !== sentinel) throw e;
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      require.cache[require.resolve('../src/config/prisma')].exports = original;
    }
    const after =
      await prisma.$queryRaw`SELECT (SELECT count(*)::int FROM usuaria) usuarias,(SELECT count(*)::int FROM moderadora) moderadoras,(SELECT count(*)::int FROM conteudo) conteudos,(SELECT count(*)::int FROM denuncia) denuncias`;
    assert.deepEqual(after, before);
    await prisma.$disconnect();
  },
);
