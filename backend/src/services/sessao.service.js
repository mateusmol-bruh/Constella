const { randomBytes, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const erro = (statusCode, mensagem) =>
  Object.assign(new Error(mensagem), { statusCode });
const hash = (value) => createHash('sha256').update(value).digest('hex');
function validarId(value) {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(value) ||
    BigInt(value) > 9223372036854775807n
  )
    throw erro(401, 'Sessão inválida ou expirada.');
  return BigInt(value);
}
async function emitirSessao(tipo, titular, db = prisma) {
  const id = validarId(String(titular));
  if (!['usuaria', 'moderadora'].includes(tipo))
    throw erro(401, 'Sessão inválida.');
  const jti = randomBytes(32).toString('hex');
  const token = jwt.sign({ tipo }, process.env.JWT_SECRET, {
    subject: String(id),
    jwtid: jti,
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'constella',
    audience: 'constella-app',
  });
  const payload = jwt.decode(token);
  await db.sessao.create({
    data: {
      id: hash(jti),
      tipo,
      id_usr: tipo === 'usuaria' ? id : null,
      id_mod: tipo === 'moderadora' ? id : null,
      expira_em: new Date(payload.exp * 1000),
    },
  });
  if (tipo === 'usuaria') {
    const persisted = await db.sessao.findUnique({
      where: { id: hash(jti) },
      include: { usuaria: { select: { banida: true } } },
    });
    if (persisted?.usuaria?.banida) {
      await db.sessao.updateMany({
        where: { id: hash(jti), revogada_em: null },
        data: { revogada_em: new Date() },
      });
      throw Object.assign(
        erro(403, 'Sua conta está banida. Entre em contato com a moderação.'),
        { codigo: 'CONTA_BANIDA' },
      );
    }
  }
  return token;
}
async function validarSessao(payload) {
  const id = validarId(payload.sub);
  if (
    typeof payload.jti !== 'string' ||
    !/^[a-f0-9]{64}$/.test(payload.jti) ||
    typeof payload.exp !== 'number' ||
    typeof payload.iat !== 'number'
  )
    throw erro(401, 'Sessão inválida ou expirada. Entre novamente.');
  const key = hash(payload.jti);
  const session = await prisma.sessao.findUnique({
    where: { id: key },
    include: { usuaria: { select: { banida: true } } },
  });
  if (
    session?.tipo === 'usuaria' &&
    session.id_usr === id &&
    session.usuaria?.banida
  )
    throw Object.assign(
      erro(403, 'Sua conta está banida. Entre em contato com a moderação.'),
      { codigo: 'CONTA_BANIDA' },
    );
  const now = new Date();
  if (
    !session ||
    session.revogada_em ||
    session.tipo !== payload.tipo ||
    (payload.tipo === 'usuaria' ? session.id_usr : session.id_mod) !== id ||
    session.expira_em <= now ||
    (payload.tipo === 'moderadora' &&
      now - session.ultima_atividade >= 30 * 60 * 1000)
  )
    throw erro(401, 'Sessão inválida ou expirada. Entre novamente.');
  if (now - session.ultima_atividade > 60000)
    await prisma.sessao.updateMany({
      where: {
        id: key,
        revogada_em: null,
        ultima_atividade: { lt: new Date(now - 60000) },
      },
      data: { ultima_atividade: now },
    });
  return key;
}
async function revogarSessao(id) {
  await prisma.sessao.updateMany({
    where: { id, revogada_em: null },
    data: { revogada_em: new Date() },
  });
}
function verificarJWT(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'constella',
    audience: 'constella-app',
    algorithms: ['HS256'],
  });
}
module.exports = {
  emitirSessao,
  validarSessao,
  revogarSessao,
  verificarJWT,
  hash,
};
