const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { randomBytes } = require('node:crypto'),
  fs = require('node:fs'),
  nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs'),
  v = require('../src/utils/recuperacao-validacao'),
  config = require('../src/utils/recuperacao-config');
const { createService } = require('../src/services/recuperacao-senha.service'),
  { createEmailService, logoPath } = require('../src/services/email.service'),
  { template, LOGO_CID } = require('../src/templates/recuperacao-senha');
function configure() {
  Object.assign(process.env, {
    EMAIL_USER: 'remetente@gmail.com',
    EMAIL_APP_PASSWORD: 'abcdefghijklmnop',
    EMAIL_FROM_NAME: 'Constella',
    PASSWORD_RESET_SECRET: randomBytes(32).toString('hex'),
  });
}
function memory() {
  const accounts = [
      { id_usr: 1n, email_usr: 'conta@gmail.com', senha_usr: null },
      { id_usr: 2n, email_usr: 'conta@hotmail.com', senha_usr: null },
      { id_usr: 3n, email_usr: 'conta@outlook.com', senha_usr: null },
      { id_usr: 4n, email_usr: 'conta@yahoo.com', senha_usr: null },
    ],
    rows = new Map();
  let chain = Promise.resolve(),
    revoked = 0,
    disabled = 0;
  const db = {
    usuaria: {
      findUnique: async ({ where }) => {
        const a = accounts.find((a) =>
          where.email_usr
            ? a.email_usr === where.email_usr
            : a.id_usr === where.id_usr,
        );
        return a ? { ...a } : null;
      },
      update: async ({ where, data }) =>
        Object.assign(
          accounts.find((a) => a.id_usr === where.id_usr),
          data,
        ),
    },
    recuperacao_senha: {
      findUnique: async ({ where }) => {
        const r = where.usuaria_id
          ? rows.get(where.usuaria_id)
          : [...rows.values()].find((r) => r.id === where.id);
        return r ? { ...r } : null;
      },
      upsert: async ({ create }) => {
        rows.set(create.usuaria_id, { ...create });
        return create;
      },
      update: async ({ where, data }) => {
        const r = [...rows.values()].find((r) => r.id === where.id);
        for (const [k, v] of Object.entries(data))
          r[k] =
            k === 'tentativas' && typeof v === 'object'
              ? r[k] + v.increment
              : v;
        return { ...r };
      },
      updateMany: async ({ where, data }) => {
        const r = [...rows.values()].find((r) => r.id === where.id);
        if (
          !r ||
          (where.utilizado_em === null && r.utilizado_em) ||
          (where.expira_em && r.expira_em <= where.expira_em.gt)
        )
          return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      },
    },
    sessao: {
      updateMany: async () => {
        revoked++;
        return { count: 1 };
      },
    },
    dispositivo_push: {
      updateMany: async () => {
        disabled++;
        return { count: 1 };
      },
    },
    $queryRaw: async () => [],
    $transaction(fn) {
      const task = chain.then(() => fn(db));
      chain = task.catch(() => {});
      return task;
    },
  };
  return {
    db,
    accounts,
    rows,
    revoked: () => revoked,
    disabled: () => disabled,
  };
}
function fixture() {
  configure();
  const m = memory(),
    messages = [];
  let now = new Date('2026-10-30T12:00:00Z'),
    counter = 100001,
    fail = false,
    failures = 0;
  const service = createService({
    db: m.db,
    clock: () => now,
    generate: () => String(counter++).padStart(6, '0'),
    send: async (to, code) => {
      if (fail)
        throw Object.assign(new Error('Falha sintética.'), {
          code: 'ECONNECTION',
        });
      messages.push({ to, code });
    },
    onFailure: () => {
      failures++;
    },
  });
  return {
    ...m,
    service,
    messages,
    advance: (ms) => {
      now = new Date(+now + ms);
    },
    fail: () => {
      fail = true;
    },
    failures: () => failures,
  };
}
test('validação: normalização, seis dígitos, zeros iniciais e política de senha', () => {
  assert.equal(v.email(' CONTA@outlook.com '), 'conta@outlook.com');
  assert.equal(v.codigo('000123'), '000123');
  assert.equal(v.senha('abcd1234'), 'abcd1234');
  for (const value of [null, [], {}, 'email-invalido', 'a\r\n@gmail.com'])
    assert.throws(
      () => v.email(value),
      (e) => e.statusCode === 400,
    );
  for (const value of [123456, '12345', '12a456', ' 123456'])
    assert.throws(
      () => v.codigo(value),
      (e) => e.statusCode === 400,
    );
  for (const value of [null, 'curta', '🌟'.repeat(19)])
    assert.throws(
      () => v.senha(value),
      (e) => e.statusCode === 400,
    );
});
test('destinatários independentes Gmail, Hotmail, Outlook e Yahoo; códigos não atravessam contas', async () => {
  const f = fixture();
  for (const a of f.accounts) await f.service.processar(a.email_usr);
  assert.equal(f.messages.length, 4);
  assert.equal(f.rows.size, 4);
  for (let i = 0; i < f.accounts.length; i++) {
    assert.equal(f.messages[i].to, f.accounts[i].email_usr);
    assert.ok(/^\d{6}$/.test(f.messages[i].code));
    assert.ok(
      f.rows.get(f.accounts[i].id_usr).codigo_hash !== f.messages[i].code,
    );
  }
  await assert.rejects(
    f.service.verificar(f.accounts[1].email_usr, f.messages[0].code),
    (e) => e.statusCode === 400,
  );
  await f.service.verificar(f.accounts[0].email_usr, f.messages[0].code);
});
test('conta ausente não gera mensagem e solicitação é assíncrona', async () => {
  const f = fixture();
  f.service.solicitar(f.accounts[0].email_usr);
  f.service.solicitar('ausente@example.invalid');
  assert.equal(f.messages.length, 0);
  await f.service.aguardarFila();
  assert.equal(f.messages.length, 1);
});
test('HMAC é renovado e código anterior é rejeitado após reenvio', async () => {
  const f = fixture();
  await f.service.processar(f.accounts[0].email_usr);
  const old = f.messages[0].code,
    hash = f.rows.get(1n).codigo_hash;
  f.advance(60001);
  await f.service.processar(f.accounts[0].email_usr);
  assert.ok(f.rows.get(1n).codigo_hash !== hash);
  await assert.rejects(
    f.service.verificar(f.accounts[0].email_usr, old),
    (e) => e.statusCode === 400,
  );
  await f.service.verificar(f.accounts[0].email_usr, f.messages[1].code);
});
test('cinco erros persistidos esgotam o código inclusive para valor correto', async () => {
  const f = fixture();
  await f.service.processar(f.accounts[0].email_usr);
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      f.service.verificar(f.accounts[0].email_usr, '999999'),
      (e) => e.statusCode === 400,
    );
  assert.equal(f.rows.get(1n).tentativas, 5);
  await assert.rejects(
    f.service.verificar(f.accounts[0].email_usr, f.messages[0].code),
    (e) => e.statusCode === 400,
  );
});
test('expiração é conferida novamente entre verificação e redefinição', async () => {
  const f = fixture();
  await f.service.processar(f.accounts[0].email_usr);
  await f.service.verificar(f.accounts[0].email_usr, f.messages[0].code);
  f.advance(600000);
  await assert.rejects(
    f.service.redefinir(
      f.accounts[0].email_usr,
      f.messages[0].code,
      'nova-senha-teste',
    ),
    (e) => e.statusCode === 400,
  );
  assert.equal(f.revoked(), 0);
});
test('bcrypt, consumo único e revogação; duas chamadas não consomem a mesma geração', async () => {
  const f = fixture();
  f.accounts[0].senha_usr = await bcrypt.hash('senha-anterior-teste', 4);
  await f.service.processar(f.accounts[0].email_usr);
  const results = await Promise.allSettled([
    f.service.redefinir(
      f.accounts[0].email_usr,
      f.messages[0].code,
      'nova-senha-teste',
    ),
    f.service.redefinir(
      f.accounts[0].email_usr,
      f.messages[0].code,
      'outra-senha-teste',
    ),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(bcrypt.getRounds(f.accounts[0].senha_usr), 12);
  assert.ok(await bcrypt.compare('nova-senha-teste', f.accounts[0].senha_usr));
  assert.equal(f.revoked(), 1);
  assert.equal(f.disabled(), 1);
  assert.ok(f.rows.get(1n).utilizado_em);
});
test('senha igual à atual não consome código', async () => {
  const f = fixture();
  f.accounts[0].senha_usr = await bcrypt.hash('senha-anterior-teste', 4);
  await f.service.processar(f.accounts[0].email_usr);
  await assert.rejects(
    f.service.redefinir(
      f.accounts[0].email_usr,
      f.messages[0].code,
      'senha-anterior-teste',
    ),
    (e) => e.statusCode === 400,
  );
  assert.equal(f.rows.get(1n).utilizado_em, null);
});
test('intervalo mínimo e limite de cinco emissões por hora são persistidos', async () => {
  const f = fixture();
  await f.service.processar(f.accounts[0].email_usr);
  await f.service.processar(f.accounts[0].email_usr);
  assert.equal(f.messages.length, 1);
  for (let i = 0; i < 6; i++) {
    f.advance(60001);
    await f.service.processar(f.accounts[0].email_usr);
  }
  assert.equal(f.messages.length, 5);
  assert.equal(f.rows.get(1n).solicitacoes, 5);
  f.advance(3600000);
  await f.service.processar(f.accounts[0].email_usr);
  assert.equal(f.messages.length, 6);
});
test('falha SMTP invalida geração sem log de destinatário, credenciais ou código', async () => {
  const f = fixture();
  f.fail();
  f.service.solicitar(f.accounts[0].email_usr);
  await f.service.aguardarFila();
  assert.equal(f.messages.length, 0);
  assert.equal(f.failures(), 1);
  assert.ok(f.rows.get(1n).utilizado_em);
  assert.equal(f.rows.get(1n).enviado_em, null);
  await assert.rejects(
    f.service.verificar(f.accounts[0].email_usr, '100001'),
    (e) => e.statusCode === 400,
  );
});
test('segredo ausente, curto ou igual ao JWT é recusado; Gmail não é contatado ao iniciar', () => {
  configure();
  const oldJwt = process.env.JWT_SECRET;
  try {
    delete process.env.PASSWORD_RESET_SECRET;
    assert.throws(
      () => config.secret(),
      (e) => e.statusCode === 503,
    );
    process.env.PASSWORD_RESET_SECRET = 'curto';
    assert.throws(() => config.secret());
    process.env.PASSWORD_RESET_SECRET = process.env.JWT_SECRET =
      randomBytes(32).toString('hex');
    assert.throws(() => config.secret());
    configure();
    let transports = 0;
    createEmailService({
      createTransport: () => {
        transports++;
      },
    });
    assert.equal(transports, 0);
  } finally {
    if (oldJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldJwt;
  }
});
test('template com logo oficial inline por CID, HTML em tabelas e texto simples', async () => {
  configure();
  const service = createEmailService(),
    message = service.message('destino@example.invalid', '000123');
  assert.ok(message.html.includes('cid:' + LOGO_CID));
  assert.ok(message.html.includes('role="presentation"'));
  assert.ok(!/<script|<link|@import/i.test(message.html));
  assert.ok(message.text.includes('10 minutos'));
  assert.ok(message.attachments[0].content.equals(fs.readFileSync(logoPath)));
  assert.equal(message.attachments[0].contentDisposition, 'inline');
  const sender = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  });
  const info = await sender.sendMail(message),
    mime = info.message.toString('utf8');
  assert.ok(mime.includes('Content-ID: <' + LOGO_CID + '>'));
  assert.ok(mime.includes('Content-Disposition: inline;'));
  assert.ok(mime.includes('multipart/related'));
  assert.ok(mime.includes('multipart/alternative'));
  sender.close();
});
test('serviço reutilizável usa Gmail TLS e destinatário dinâmico com tratamento de falha', async () => {
  configure();
  let received,
    closed = 0,
    options;
  const service = createEmailService({
    createTransport: (cfg) => {
      options = cfg;
      return {
        sendMail: async (value) => {
          received = value;
          return { accepted: [value.to.address] };
        },
        verify: async () => {},
        close: () => closed++,
      };
    },
  });
  await service.enviarCodigo('destino@yahoo.com', '000123');
  assert.equal(received.to.address, 'destino@yahoo.com');
  assert.equal(options.host, 'smtp.gmail.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.debug, false);
  assert.equal(closed, 1);
  await service.verificarConexao();
  assert.equal(closed, 2);
  const failing = createEmailService({
    createTransport: () => ({
      sendMail: async () => {
        throw Object.assign(new Error('Erro sintético de rede.'), {
          code: 'ECONNECTION',
        });
      },
      close: () => closed++,
    }),
  });
  await assert.rejects(
    failing.enviarCodigo('destino@example.invalid', '000123'),
    (e) => e.code === 'ECONNECTION',
  );
  assert.equal(closed, 3);
});
