const prisma = require('../config/prisma');
const erro = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });
function id(value) {
  if (
    !/^[1-9]\d{0,18}$/.test(String(value)) ||
    BigInt(value) > 9223372036854775807n
  )
    throw erro(400, 'ID inválido.');
  return BigInt(value);
}
const select = {
  id_usr: true,
  nome_usr: true,
  status_verificacao: true,
  foto_usr: true,
  banida: true,
  banida_em: true,
  banida_motivo: true,
  responsavel_banimento: { select: { id_mod: true, nome_mod: true } },
};
function dto(u) {
  return {
    id: String(u.id_usr),
    nome: u.nome_usr,
    foto: u.foto_usr,
    verificada: u.status_verificacao,
    banida: u.banida,
    banimento: {
      data: u.banida_em,
      motivo: u.banida_motivo,
      responsavel: u.responsavel_banimento
        ? {
            id: String(u.responsavel_banimento.id_mod),
            nome: u.responsavel_banimento.nome_mod,
          }
        : null,
    },
  };
}
async function buscar(value, db = prisma) {
  const u = await db.usuaria.findUnique({
    where: { id_usr: id(value) },
    select,
  });
  if (!u) throw erro(404, 'Usuária não encontrada.');
  const historico = await db.relatorio_moderacao.findMany({
    where: {
      acao: { in: ['BANIMENTO_USUARIA', 'REVERSAO_BANIMENTO'] },
      desc: { startsWith: 'Usuária ' + String(u.id_usr) + ': ' },
    },
    orderBy: { dt_acao: 'desc' },
    take: 50,
    select: {
      id_relat: true,
      acao: true,
      dt_acao: true,
      desc: true,
      moderadora: { select: { nome_mod: true } },
    },
  });
  return {
    ...dto(u),
    historico: historico.map((r) => ({
      id: String(r.id_relat),
      acao: r.acao,
      data: r.dt_acao,
      descricao: r.desc,
      responsavel: r.moderadora.nome_mod,
    })),
  };
}
async function alterar(mod, value, body) {
  const userId = id(value),
    modId = id(mod),
    banida = body.banida;
  if (
    typeof banida !== 'boolean' ||
    typeof body.motivo !== 'string' ||
    !body.motivo.trim() ||
    body.motivo.trim().length > 1000
  )
    throw erro(400, 'Informe a ação e um motivo de até 1000 caracteres.');
  const motivo = body.motivo.trim();
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuaria.findUnique({
      where: { id_usr: userId },
      select: { id_usr: true, banida: true },
    });
    if (!u) throw erro(404, 'Usuária não encontrada.');
    const now = new Date();
    const changed = await tx.usuaria.updateMany({
      where: { id_usr: userId, banida: !banida },
      data: banida
        ? {
            banida: true,
            banida_em: now,
            banida_motivo: motivo,
            banida_por: modId,
          }
        : { banida: false },
    });
    if (!changed.count)
      throw erro(
        409,
        banida ? 'Esta conta já está banida.' : 'Esta conta já está permitida.',
      );
    if (banida) {
      await tx.sessao.updateMany({
        where: { id_usr: userId, revogada_em: null },
        data: { revogada_em: now },
      });
      await tx.dispositivo_push.updateMany({
        where: { id_usr: userId, ativo: true },
        data: { ativo: false },
      });
    }
    await tx.relatorio_moderacao.create({
      data: {
        id_mod: modId,
        acao: banida ? 'BANIMENTO_USUARIA' : 'REVERSAO_BANIMENTO',
        dt_acao: now,
        desc: 'Usuária ' + String(userId) + ': ' + motivo,
      },
    });
    return buscar(value, tx);
  });
}
module.exports = { buscar, alterar, select, dto };
