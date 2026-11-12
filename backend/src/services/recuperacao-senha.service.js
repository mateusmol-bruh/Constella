const {
  randomInt,
  randomUUID,
  createHmac,
  timingSafeEqual,
} = require('node:crypto');
const bcrypt = require('bcryptjs'),
  prisma = require('../config/prisma'),
  config = require('../utils/recuperacao-config'),
  mail = require('./email.service');
const REQUEST_MESSAGE =
  'Se existir uma conta associada a este e-mail, você receberá as instruções de recuperação.';
const SUCCESS_MESSAGE = 'Sua senha foi redefinida com sucesso.';
const INVALID_MESSAGE = 'Código inválido ou expirado. Solicite um novo código.';
const invalid = () =>
  Object.assign(new Error(INVALID_MESSAGE), {
    statusCode: 400,
    codigo: 'RECUPERACAO_CODIGO_INVALIDO',
  });
const mac = (key, id, user, email, code) =>
  createHmac('sha256', key)
    .update(
      ['constella:gmail-recovery:v1', id, String(user), email, code].join(':'),
    )
    .digest('hex');
const equal = (a, b) =>
  /^[a-f0-9]{64}$/.test(a || '') &&
  /^[a-f0-9]{64}$/.test(b || '') &&
  timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
function createService({
  db = prisma,
  send = mail.enviarCodigo,
  clock = () => new Date(),
  generate = () => String(randomInt(1000000)).padStart(6, '0'),
  onFailure = () =>
    console.error('Recuperação de senha: não foi possível concluir o envio.'),
} = {}) {
  const waiting = [],
    idle = [];
  let running = 0;
  async function lock(tx, email) {
    const found = await tx.usuaria.findUnique({
      where: { email_usr: email },
      select: { id_usr: true },
    });
    if (!found) return null;
    await tx.$queryRaw`SELECT id_usr FROM usuaria WHERE id_usr=${found.id_usr} FOR UPDATE`;
    const current = await tx.usuaria.findUnique({
      where: { id_usr: found.id_usr },
      select: { id_usr: true, email_usr: true },
    });
    return current?.email_usr === email ? current : null;
  }
  async function processar(email) {
    const key = config.secret();
    const issued = await db.$transaction(async (tx) => {
      const account = await lock(tx, email);
      if (!account) return null;
      const previous = await tx.recuperacao_senha.findUnique({
          where: { usuaria_id: account.id_usr },
        }),
        now = clock();
      const sameWindow = previous && now - previous.janela_inicio < 3600000;
      if (
        previous &&
        (now - previous.criado_em < 60000 ||
          (sameWindow && previous.solicitacoes >= 5))
      )
        return null;
      let code;
      for (let i = 0; i < 10; i++) {
        const candidate = generate();
        if (typeof candidate !== 'string' || !/^\d{6}$/.test(candidate))
          throw new Error('Gerador de recuperação inválido.');
        if (
          !previous ||
          !equal(
            mac(key, previous.id, account.id_usr, account.email_usr, candidate),
            previous.codigo_hash,
          )
        ) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new Error('Não foi possível gerar um código novo.');
      const id = randomUUID(),
        data = {
          id,
          usuaria_id: account.id_usr,
          codigo_hash: mac(key, id, account.id_usr, account.email_usr, code),
          expira_em: new Date(+now + 600000),
          utilizado_em: null,
          enviado_em: null,
          tentativas: 0,
          criado_em: now,
          janela_inicio: sameWindow ? previous.janela_inicio : now,
          solicitacoes: sameWindow ? previous.solicitacoes + 1 : 1,
        };
      await tx.recuperacao_senha.upsert({
        where: { usuaria_id: account.id_usr },
        create: data,
        update: data,
      });
      return { id, code, to: account.email_usr };
    });
    if (!issued) return;
    try {
      await send(issued.to, issued.code);
      await db.recuperacao_senha.updateMany({
        where: {
          id: issued.id,
          utilizado_em: null,
          expira_em: { gt: clock() },
        },
        data: { enviado_em: clock() },
      });
    } catch {
      await db.recuperacao_senha
        .updateMany({
          where: { id: issued.id, utilizado_em: null },
          data: { utilizado_em: clock() },
        })
        .catch(() => {});
      onFailure();
    }
  }
  function pump() {
    while (running < 2 && waiting.length) {
      const email = waiting.shift();
      running++;
      void processar(email)
        .catch(() => onFailure())
        .finally(() => {
          running--;
          pump();
          if (!running && !waiting.length)
            for (const done of idle.splice(0)) done();
        });
    }
  }
  function solicitar(email) {
    config.configured();
    if (waiting.length + running >= 100) throw config.unavailable();
    waiting.push(email);
    setImmediate(pump);
  }
  function aguardarFila() {
    return !running && !waiting.length
      ? Promise.resolve()
      : new Promise((resolve) => idle.push(resolve));
  }
  async function check(email, code, password) {
    const key = config.secret();
    const result = await db.$transaction(
      async (tx) => {
        const account = await lock(tx, email);
        if (!account) return false;
        const row = await tx.recuperacao_senha.findUnique({
            where: { usuaria_id: account.id_usr },
          }),
          now = clock();
        if (
          !row ||
          row.utilizado_em ||
          !row.enviado_em ||
          row.expira_em <= now ||
          row.tentativas >= 5
        )
          return false;
        if (
          !equal(
            mac(key, row.id, account.id_usr, account.email_usr, code),
            row.codigo_hash,
          )
        ) {
          await tx.recuperacao_senha.update({
            where: { id: row.id },
            data: { tentativas: { increment: 1 } },
          });
          return false;
        }
        if (password === undefined) return true;
        const current = await tx.usuaria.findUnique({
          where: { id_usr: account.id_usr },
          select: { senha_usr: true },
        });
        if (await bcrypt.compare(password, current.senha_usr))
          throw Object.assign(
            new Error('Escolha uma senha diferente da atual.'),
            { statusCode: 400 },
          );
        const hash = await bcrypt.hash(password, 12),
          completed = clock();
        if (row.expira_em <= completed) return false;
        await tx.usuaria.update({
          where: { id_usr: account.id_usr },
          data: { senha_usr: hash },
        });
        await tx.recuperacao_senha.update({
          where: { id: row.id },
          data: { utilizado_em: completed },
        });
        await tx.sessao.updateMany({
          where: { id_usr: account.id_usr, revogada_em: null },
          data: { revogada_em: completed },
        });
        await tx.dispositivo_push.updateMany({
          where: { id_usr: account.id_usr, ativo: true },
          data: { ativo: false },
        });
        return true;
      },
      { timeout: 10000 },
    );
    // Falha fora da transação: preserva os incrementos de tentativas erradas.
    if (!result) throw invalid();
  }
  return {
    solicitar,
    aguardarFila,
    processar,
    verificar: (email, code) => check(email, code),
    redefinir: (email, code, password) => check(email, code, password),
  };
}
module.exports = {
  ...createService(),
  createService,
  REQUEST_MESSAGE,
  SUCCESS_MESSAGE,
  INVALID_MESSAGE,
};
