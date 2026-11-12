const prisma = require('../config/prisma');
const erro = (statusCode, mensagem) => Object.assign(new Error(mensagem), { statusCode });
function id(value) {
  const s = String(value ?? '');
  if (!/^[1-9]\d{0,18}$/.test(s) || BigInt(s) > 9223372036854775807n)
    throw erro(400, 'Conteúdo inválido.');
  return BigInt(s);
}
const include = { conteudo_interesses: { include: { interesses: true } } };
function dto(c) {
  return {
    id: String(c.id_cont),
    titulo: c.titulo_cont,
    descricao: c.desc_cont,
    material: c.mat_text_content,
    duracao: c.duracao_cont,
    data_publicacao: c.data_pub,
    capa: c.capa,
    categoria: c.categoria,
    atualizado_em: c.atualizado_em,
    interesses:
      c.conteudo_interesses?.map((i) => ({
        id: String(i.interesses.id_intr),
        nome: i.interesses.nome_intr,
      })) || [],
  };
}
async function listarConteudos() {
  return (
    await prisma.conteudo.findMany({
      where: { publicado: true },
      include,
      orderBy: [{ data_pub: 'desc' }, { id_cont: 'desc' }],
      take: 100,
    })
  ).map(dto);
}
async function registro(value) {
  const c = await prisma.conteudo.findUnique({
    where: { id_cont: id(value), publicado: true },
    include,
  });
  if (!c || c.publicado === false) throw erro(404, 'Conteúdo não encontrado.');
  return c;
}
async function buscarConteudo(value) {
  return dto(await registro(value));
}
async function registrarAcesso(user, value) {
  const usr = id(user),
    cont = id(value);
  await registro(value);
  const r = await prisma.usuaria_conteudo.upsert({
    where: { id_usr_id_cont: { id_usr: usr, id_cont: cont } },
    update: {},
    create: { id_usr: usr, id_cont: cont, progresso_cont: 0 },
  });
  return {
    mensagem: 'Acesso registrado.',
    progresso: r.progresso_cont === null ? null : Number(r.progresso_cont),
  };
}
async function atualizarProgresso(user, value, progresso) {
  const usr = id(user),
    cont = id(value),
    n = Number(progresso);
  if (!Number.isFinite(n) || n < 0 || n > 100)
    throw erro(400, 'O progresso deve estar entre 0 e 100.');
  await registro(value);
  const r = await prisma.usuaria_conteudo.upsert({
    where: { id_usr_id_cont: { id_usr: usr, id_cont: cont } },
    update: { progresso_cont: n },
    create: { id_usr: usr, id_cont: cont, progresso_cont: n },
  });
  return { id_conteudo: String(r.id_cont), progresso: Number(r.progresso_cont) };
}
module.exports = { listarConteudos, buscarConteudo, registrarAcesso, atualizarProgresso };
