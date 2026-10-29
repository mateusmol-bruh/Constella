const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os');
const { randomUUID, randomBytes } = require('node:crypto');
const enabled = process.env.RUN_MODERATION_DB_TESTS === '1';
test(
  'banimentos e arquivos PRO: API/armazenamento reais, sem dados persistentes de teste',
  { skip: !enabled, timeout: 180000 },
  async (t) => {
    require('dotenv').config({ quiet: true });
    process.env.UPLOADS_DIR = await fs.mkdtemp(
      path.join(os.tmpdir(), 'constella-pro-'),
    );
    process.env.NODE_ENV = 'development';
    process.env.CONSTELLA_PRO_DEMO = 'true';
    const prismaPath = require.resolve('../src/config/prisma'),
      prisma = require(prismaPath),
      bcrypt = require('bcryptjs'),
      rollback = Error('ROLLBACK_CORRECOES');
    const models = [
      'usuaria',
      'moderadora',
      'conteudo_pro',
      'denuncia',
      'mensagem',
      'postagem',
      'arquivo_pro',
      'relatorio_moderacao',
    ];
    const counts = async () =>
      Promise.all(models.map((m) => prisma[m].count()));
    const before = await counts();
    let server,
      db,
      base,
      key,
      videoKey,
      contentId,
      cookie,
      csrf,
      token,
      usr,
      mod;
    const png = await fs.readFile(
        path.resolve('../mobile/assets/images/constella-icon.png'),
      ),
      mp4 = await fs.readFile(path.join(__dirname, 'fixtures/pro-sample.mp4'));
    const request = async (route, options = {}) => {
      const r = await fetch(base + route, {
        method: options.method || 'GET',
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.token
            ? { Authorization: 'Bearer ' + options.token }
            : {}),
          ...(options.admin ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}),
          ...options.headers,
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        ...(options.raw ? { body: options.raw } : {}),
      });
      const type = r.headers.get('content-type') || '';
      return {
        status: r.status,
        headers: r.headers,
        body: type.includes('application/json')
          ? await r.json()
          : Buffer.from(await r.arrayBuffer()),
      };
    };
    const upload = (key, data, mime = 'image/png', extra = {}) =>
      request('/api/moderacao/midias/pro/' + key, {
        method: 'POST',
        raw: data,
        admin: true,
        headers: {
          'Content-Type': mime,
          'X-File-Name': encodeURIComponent(
            mime === 'video/mp4' ? 'Vídeo teste.mp4' : 'Imagem teste.png',
          ),
          ...extra,
        },
      });
    try {
      await prisma.$transaction(
        async (tx) => {
          db = new Proxy(tx, {
            get(target, k) {
              if (k === '$transaction') return (cb) => cb(db);
              const v = Reflect.get(target, k);
              return typeof v === 'function' ? v.bind(target) : v;
            },
          });
          require.cache[prismaPath].exports = db;
          const suffix = randomBytes(8).toString('hex'),
            senha = randomBytes(24).toString('hex'),
            hash = await bcrypt.hash(senha, 4);
          mod = await db.moderadora.create({
            data: {
              nome_mod: 'TESTE mod rollback',
              email_mod: suffix + '@mod.example.invalid',
              senha_mod: hash,
            },
          });
          usr = await db.usuaria.create({
            data: {
              nome_usr: 'TESTE usuária rollback',
              email_usr: suffix + '@usr.example.invalid',
              senha_usr: hash,
              cpf_usr: randomBytes(7).toString('hex').slice(0, 11),
              onboarding_concluido: true,
            },
          });
          server = require('../server').listen(0, '127.0.0.1');
          await new Promise((r) => server.once('listening', r));
          base = 'http://127.0.0.1:' + server.address().port;
          const login = await request('/api/moderacao/login', {
            method: 'POST',
            body: { email: mod.email_mod, senha },
          });
          assert.equal(login.status, 200);
          cookie = login.headers.get('set-cookie').split(';')[0];
          csrf = login.body.csrf;
          token = (
            await request('/api/auth/login', {
              method: 'POST',
              body: { email: usr.email_usr, senha },
            })
          ).body.token;
          assert.ok(token);
          await t.test(
            'upload privado exige moderadora; JWT comum e cookie sem CSRF são recusados',
            async () => {
              const url = '/api/moderacao/midias/pro/' + randomUUID();
              assert.equal(
                (
                  await request(url, {
                    method: 'POST',
                    raw: png,
                    headers: { 'Content-Type': 'image/png' },
                  })
                ).status,
                401,
              );
              assert.equal(
                (
                  await request(url, {
                    method: 'POST',
                    raw: png,
                    token,
                    headers: { 'Content-Type': 'image/png' },
                  })
                ).status,
                403,
              );
              assert.equal(
                (
                  await request(url, {
                    method: 'POST',
                    raw: png,
                    headers: { 'Content-Type': 'image/png', Cookie: cookie },
                  })
                ).status,
                403,
              );
            },
          );
          await t.test(
            'validação rejeita tipo, assinatura falsa, MP4 truncado e tamanho excessivo',
            async () => {
              assert.equal(
                (
                  await upload(
                    randomUUID(),
                    Buffer.from('<svg/>'),
                    'image/svg+xml',
                  )
                ).status,
                415,
              );
              assert.equal(
                (
                  await upload(
                    randomUUID(),
                    Buffer.from('<html>arquivo</html>'),
                  )
                ).status,
                400,
              );
              assert.equal(
                (
                  await upload(
                    randomUUID(),
                    mp4.subarray(0, mp4.length - 100),
                    'video/mp4',
                  )
                ).status,
                400,
              );
              assert.equal(
                (await upload(randomUUID(), Buffer.alloc(2 * 1024 * 1024 + 1)))
                  .status,
                413,
              );
            },
          );
          await t.test(
            'imagem e MP4 reais são validados e persistidos; repetir UUID não duplica upload',
            async () => {
              key = randomUUID();
              videoKey = randomUUID();
              const a = await upload(key, png),
                b = await upload(videoKey, mp4, 'video/mp4');
              assert.equal(a.status, 201, JSON.stringify(a.body));
              assert.equal(b.status, 201, JSON.stringify(b.body));
              assert.equal(b.body.arquivo.largura, 160);
              assert.equal(b.body.arquivo.altura, 120);
              assert.ok(b.body.arquivo.duracao >= 2.9);
              const again = await upload(key, png);
              assert.equal(again.status, 201);
              assert.equal(again.body.arquivo.id, key);
              assert.equal(
                await db.arquivo_pro.count({
                  where: { id: { in: [key, videoKey] } },
                }),
                2,
              );
              assert.equal((await upload(key, mp4, 'video/mp4')).status, 409);
              const meta = await db.arquivo_pro.findUnique({
                where: { id: videoKey },
              });
              assert.equal(meta.tamanho, BigInt(mp4.length));
              assert.match(meta.sha256, /^[a-f0-9]{64}$/);
            },
          );
          await t.test(
            'upload em fluxo sem Content-Length respeita os mesmos limites e validações',
            async () => {
              const { Readable } = require('node:stream'),
                r = await fetch(
                  base + '/api/moderacao/midias/pro/' + randomUUID(),
                  {
                    method: 'POST',
                    headers: {
                      Cookie: cookie,
                      'X-CSRF-Token': csrf,
                      'Content-Type': 'image/png',
                    },
                    body: Readable.from([png]),
                    duplex: 'half',
                  },
                );
              assert.equal(r.status, 201);
              assert.equal((await r.json()).arquivo.tamanho, png.length);
            },
          );
          await t.test(
            'moderadora cria PRO com imagem e vídeo; edição preserva e remove as referências',
            async () => {
              const d = {
                titulo: 'TESTE mídia rollback',
                descricao: 'Teste de integração real',
                texto: '',
                categoria: 'Autocuidado',
                duracao: 3,
                publicado: true,
                imagem_pro_id: key,
                video_pro_id: videoKey,
              };
              const created = await request('/api/moderacao/conteudos/pro', {
                method: 'POST',
                admin: true,
                body: d,
              });
              assert.equal(created.status, 201, JSON.stringify(created.body));
              contentId = created.body.conteudo.id;
              assert.equal(created.body.conteudo.imagem.id, key);
              assert.equal(created.body.conteudo.video.id, videoKey);
              const detail = await request(
                '/api/moderacao/conteudos/pro/' + contentId,
                { admin: true },
              );
              assert.equal(detail.body.conteudo.video.nome, 'Vídeo teste.mp4');
              const saved = await request(
                '/api/moderacao/conteudos/pro/' + contentId,
                {
                  method: 'PUT',
                  admin: true,
                  body: { ...d, imagem_pro_id: null },
                },
              );
              assert.equal(saved.status, 200);
              assert.equal(saved.body.conteudo.imagem, null);
              assert.equal(
                (
                  await request('/api/moderacao/conteudos/pro/' + contentId, {
                    method: 'PUT',
                    admin: true,
                    body: d,
                  })
                ).status,
                200,
              );
            },
          );
          const media = () =>
            '/api/pro/conteudos/' + contentId + '/midias/' + videoKey;
          await t.test(
            'catálogo gratuito não vaza referências privadas; URL direta exige acesso validado',
            async () => {
              const cat = await request('/api/pro/catalogo', { token }),
                row = cat.body.conteudos?.find((c) => c.id === contentId);
              assert.equal(cat.status, 200);
              assert.ok(row);
              assert.equal(row.video, undefined);
              assert.equal(row.video_pro_id, undefined);
              assert.equal(JSON.stringify(cat.body).includes(videoKey), false);
              assert.equal((await request(media())).status, 401);
              assert.equal((await request(media(), { token })).status, 403);
              assert.equal(
                (await request('/uploads/pro/' + videoKey + '.mp4')).status,
                404,
              );
              assert.equal(
                (await request('/uploads/' + videoKey + '.mp4')).status,
                404,
              );
            },
          );
          await t.test(
            'modo PRO de desenvolvimento explícito permite imagem/vídeo com Range; acesso e publicação são revalidados',
            async () => {
              assert.equal(
                (
                  await request('/api/pro/demonstracao', {
                    method: 'POST',
                    token,
                    body: { ativar: true },
                  })
                ).status,
                200,
              );
              const r = await request(media(), {
                token,
                headers: { Range: 'bytes=0-99' },
              });
              assert.equal(r.status, 206);
              assert.equal(r.body.length, 100);
              assert.match(r.headers.get('content-range'), /^bytes 0-99\//);
              assert.match(r.headers.get('cache-control'), /no-store/);
              assert.ok(r.body.equals(mp4.subarray(0, 100)));
              const image = await request(
                '/api/pro/conteudos/' + contentId + '/midias/' + key,
                { token },
              );
              assert.equal(image.status, 200);
              assert.ok(image.body.equals(png));
              await request(
                '/api/moderacao/conteudos/pro/' + contentId + '/publicacao',
                { method: 'PATCH', admin: true, body: { publicado: false } },
              );
              assert.equal((await request(media(), { token })).status, 404);
              await request(
                '/api/moderacao/conteudos/pro/' + contentId + '/publicacao',
                { method: 'PATCH', admin: true, body: { publicado: true } },
              );
              await request('/api/pro/demonstracao', {
                method: 'POST',
                token,
                body: { ativar: false },
              });
              assert.equal((await request(media(), { token })).status, 403);
            },
          );
          await t.test(
            'arquivo e metadados permanecem disponíveis ao recriar o servidor e o serviço de armazenamento',
            async () => {
              await new Promise((r) => server.close(r));
              delete require.cache[
                require.resolve('../src/services/midia-pro.service')
              ];
              server = require('../server').listen(0, '127.0.0.1');
              await new Promise((r) => server.once('listening', r));
              base = 'http://127.0.0.1:' + server.address().port;
              const r = await request('/api/moderacao/midias/pro/' + videoKey, {
                admin: true,
              });
              assert.equal(r.status, 200);
              assert.ok(r.body.equals(mp4));
              assert.ok(
                await db.arquivo_pro.findUnique({ where: { id: videoKey } }),
              );
            },
          );
          await t.test(
            'usuária comum não pode banir; moderação exige motivo e não aceita alvo inexistente',
            async () => {
              const route =
                '/api/moderacao/usuarias/' + usr.id_usr + '/banimento';
              assert.equal(
                (
                  await request(route, {
                    method: 'PATCH',
                    token,
                    body: { banida: true, motivo: 'teste', admin: true },
                  })
                ).status,
                403,
              );
              assert.equal(
                (
                  await request(route, {
                    method: 'PATCH',
                    admin: true,
                    body: { banida: true, motivo: '' },
                  })
                ).status,
                400,
              );
              assert.equal(
                (
                  await request(
                    '/api/moderacao/usuarias/9223372036854775807/banimento',
                    {
                      method: 'PATCH',
                      admin: true,
                      body: { banida: true, motivo: 'teste' },
                    },
                  )
                ).status,
                404,
              );
            },
          );
          await t.test(
            'banimento registra motivo/data/responsável, audita, revoga sessões e bloqueia JWT antigo',
            async () => {
              await db.dispositivo_push.create({
                data: {
                  token: 'ExponentPushToken[' + suffix + ']',
                  id_usr: usr.id_usr,
                  plataforma: 'android',
                },
              });
              const r = await request(
                '/api/moderacao/usuarias/' + usr.id_usr + '/banimento',
                {
                  method: 'PATCH',
                  admin: true,
                  body: {
                    banida: true,
                    motivo: 'Motivo administrativo de teste',
                  },
                },
              );
              assert.equal(r.status, 200, JSON.stringify(r.body));
              assert.equal(r.body.usuaria.banida, true);
              assert.equal(
                r.body.usuaria.banimento.responsavel.id,
                String(mod.id_mod),
              );
              assert.ok(r.body.usuaria.banimento.data);
              assert.equal(r.body.usuaria.historico.length, 1);
              assert.equal(
                (
                  await db.dispositivo_push.findUnique({
                    where: { token: 'ExponentPushToken[' + suffix + ']' },
                  })
                ).ativo,
                false,
              );
              for (const route of [
                '/api/perfil',
                '/api/chats',
                '/api/foruns',
                '/api/pro',
              ]) {
                const denied = await request(route, { token });
                assert.equal(denied.status, 403, route);
                assert.equal(denied.body.codigo, 'CONTA_BANIDA');
              }
              assert.equal(
                (
                  await request('/api/auth/login', {
                    method: 'POST',
                    body: { email: usr.email_usr, senha },
                  })
                ).body.codigo,
                'CONTA_BANIDA',
              );
              assert.equal(
                (
                  await request(
                    '/api/moderacao/usuarias/' + usr.id_usr + '/banimento',
                    {
                      method: 'PATCH',
                      admin: true,
                      body: { banida: true, motivo: 'Duplicado' },
                    },
                  )
                ).status,
                409,
              );
              assert.ok(
                (
                  await request('/api/moderacao/usuarias', { admin: true })
                ).body.usuarias.find((u) => u.id === String(usr.id_usr)).banida,
              );
            },
          );
          await t.test(
            'reversão preserva auditoria e exige novo login; sessões revogadas continuam recusadas',
            async () => {
              const r = await request(
                '/api/moderacao/usuarias/' + usr.id_usr + '/banimento',
                {
                  method: 'PATCH',
                  admin: true,
                  body: { banida: false, motivo: 'Revisão administrativa' },
                },
              );
              assert.equal(r.status, 200);
              assert.equal(r.body.usuaria.banida, false);
              assert.equal(r.body.usuaria.historico.length, 2);
              assert.equal(
                r.body.usuaria.banimento.motivo,
                'Motivo administrativo de teste',
              );
              assert.equal(
                (await request('/api/perfil', { token })).status,
                401,
              );
              const login = await request('/api/auth/login', {
                method: 'POST',
                body: { email: usr.email_usr, senha },
              });
              assert.equal(login.status, 200);
              assert.equal(
                (await request('/api/perfil', { token: login.body.token }))
                  .status,
                200,
              );
              assert.equal(
                await db.bloqueio.count({
                  where: { id_usr_origem: usr.id_usr },
                }),
                0,
              );
            },
          );
          throw rollback;
        },
        { timeout: 160000, maxWait: 10000 },
      );
    } catch (e) {
      if (e !== rollback) throw e;
    } finally {
      if (server) await new Promise((r) => server.close(r));
      require.cache[prismaPath].exports = prisma;
      for (const name of await fs
        .readdir(path.join(process.env.UPLOADS_DIR, 'pro'))
        .catch(() => []))
        await fs.unlink(path.join(process.env.UPLOADS_DIR, 'pro', name));
    }
    assert.deepEqual(await counts(), before);
    await prisma.$disconnect();
  },
);
