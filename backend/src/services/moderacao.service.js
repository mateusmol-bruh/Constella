const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { emitirSessao } = require('./sessao.service');
const erro = (statusCode, mensagem) => Object.assign(new Error(mensagem), { statusCode });
function id(value) {
  const s = String(value ?? '');
  if (!/^[1-9]\d{0,18}$/.test(s) || BigInt(s) > 9223372036854775807n)
    throw erro(400, 'ID inválido.');
  return BigInt(s);
}
function texto(value, label, max, required = true) {
  if ((value === undefined || value === null) && !required) return null;
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()))
    throw erro(400, label + ' inválido.');
  return value.trim() || null;
}
const estados = ['PENDENTE', 'EM_ANALISE', 'RESOLVIDA', 'REJEITADA'];
async function auditoria(tx, mod, acao, desc) {
  return tx.relatorio_moderacao.create({
    data: { id_mod: id(mod), acao, desc, dt_acao: new Date() },
  });
}
async function loginModeradora(email, senha) {
  const m = await prisma.moderadora.findUnique({
    where: { email_mod: email.trim().toLowerCase() },
    select: { id_mod: true, nome_mod: true, email_mod: true, senha_mod: true },
  });
  if (!m || !(await bcrypt.compare(senha, m.senha_mod))) return null;
  return {
    token: await emitirSessao('moderadora', m.id_mod),
    moderadora: { id: String(m.id_mod), nome: m.nome_mod, email: m.email_mod },
  };
}
async function perfilModeradora(mod) {
  const m = await prisma.moderadora.findUnique({
    where: { id_mod: id(mod) },
    select: { id_mod: true, nome_mod: true, email_mod: true },
  });
  if (!m) throw erro(401, 'Conta de moderação indisponível.');
  return { id: String(m.id_mod), nome: m.nome_mod, email: m.email_mod };
}
const denunciaInclude = {
  usuaria: { select: { id_usr: true, nome_usr: true } },
  denuncia_usuaria: {
    select: { id_usr_denunciada: true, usuaria: { select: { nome_usr: true } } },
  },
  denuncia_postagem: {
    select: {
      id_post: true,
      postagem: { select: { cont_post: true, img_post: true, id_for: true, id_usr: true } },
    },
  },
  denuncia_mensagem: {
    select: {
      id_msg: true,
      mensagem: { select: { cont_msg: true, imagem_msg: true, id_usr_emissor: true } },
    },
  },
};
function denunciaDTO(d) {
  let tipo = 'DESCONHECIDO',
    alvo = null;
  if (d.denuncia_usuaria.length) {
    tipo = 'USUARIA';
    const a = d.denuncia_usuaria[0];
    alvo = { id: String(a.id_usr_denunciada), nome: a.usuaria.nome_usr };
  }
  if (d.denuncia_postagem.length) {
    tipo = 'POSTAGEM';
    const a = d.denuncia_postagem[0];
    alvo = {
      id: String(a.id_post),
      conteudo: a.postagem.cont_post,
      imagem: a.postagem.img_post,
      forum: String(a.postagem.id_for),
    };
  }
  if (d.denuncia_mensagem.length) {
    tipo = 'MENSAGEM';
    const a = d.denuncia_mensagem[0];
    alvo = { id: String(a.id_msg), conteudo: a.mensagem.cont_msg, imagem: a.mensagem.imagem_msg };
  }
  return {
    id: String(d.id_den),
    motivo: d.motivo_den,
    descricao: d.descricao,
    status: d.status,
    data: d.dt_denuncia,
    denunciante: { id: String(d.usuaria.id_usr), nome: d.usuaria.nome_usr },
    tipo,
    alvo,
  };
}
function pagina(query = {}) {
  const page = query.pagina === undefined ? 1 : Number(query.pagina),
    limit = query.limite === undefined ? 50 : Number(query.limite);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw erro(400, 'Paginação inválida.');
  return { skip: (page - 1) * limit, take: limit };
}
async function listarDenuncias(status, query = {}) {
  if (status && !estados.includes(status)) throw erro(400, 'Status inválido.');
  const rows = await prisma.denuncia.findMany({
    where: status ? { status } : {},
    include: denunciaInclude,
    orderBy: [{ dt_denuncia: 'desc' }, { id_den: 'desc' }],
    ...pagina(query),
  });
  return rows.map(denunciaDTO);
}
async function buscarDenuncia(value) {
  const d = await prisma.denuncia.findUnique({
    where: { id_den: id(value) },
    include: denunciaInclude,
  });
  if (!d) throw erro(404, 'Denúncia não encontrada.');
  const historico = await prisma.relatorio_moderacao.findMany({
    where: {
      acao: 'ALTERACAO_STATUS_DENUNCIA',
      desc: { startsWith: 'Denúncia ' + String(d.id_den) + ' alterada para ' },
    },
    select: {
      id_relat: true,
      desc: true,
      dt_acao: true,
      moderadora: { select: { nome_mod: true } },
    },
    orderBy: [{ dt_acao: 'desc' }, { id_relat: 'desc' }],
    take: 100,
  });
  return {
    ...denunciaDTO(d),
    historico: historico.map((h) => ({
      id: String(h.id_relat),
      descricao: h.desc,
      data: h.dt_acao,
      moderadora: h.moderadora.nome_mod,
    })),
  };
}
async function atualizarStatus(mod, value, status, decisao) {
  if (!estados.includes(status)) throw erro(400, 'Status inválido.');
  const note = texto(decisao, 'Decisão', 2000, ['RESOLVIDA', 'REJEITADA'].includes(status));
  return prisma.$transaction(async (tx) => {
    const d = await tx.denuncia.findUnique({
      where: { id_den: id(value) },
      select: { id_den: true, status: true },
    });
    if (!d) throw erro(404, 'Denúncia não encontrada.');
    await tx.denuncia.update({ where: { id_den: d.id_den }, data: { status, id_mod: id(mod) } });
    const history = await auditoria(
      tx,
      mod,
      'ALTERACAO_STATUS_DENUNCIA',
      'Denúncia ' +
        String(d.id_den) +
        ' alterada para ' +
        status +
        '.' +
        (note ? ' Decisão: ' + note : ''),
    );
    return {
      id: String(d.id_den),
      status,
      decisao: note,
      historico_id: String(history.id_relat),
      historicoConfirmado: true,
    };
  });
}
async function listarRelatorios(mod) {
  return (
    await prisma.relatorio_moderacao.findMany({
      where: { id_mod: id(mod) },
      orderBy: [{ dt_acao: 'desc' }, { id_relat: 'desc' }],
      take: 200,
    })
  ).map((r) => ({ id: String(r.id_relat), acao: r.acao, descricao: r.desc, data: r.dt_acao }));
}
async function criarRelatorio(mod, data) {
  const title = texto(data.titulo, 'Título', 100),
    body = texto(data.conteudo, 'Relatório', 10000);
  const r = await auditoria(prisma, mod, 'RELATORIO_MANUAL', title + '\n\n' + body);
  return { id: String(r.id_relat), acao: r.acao, descricao: r.desc, data: r.dt_acao };
}
function configConteudo(tipo) {
  if (!['normal', 'pro'].includes(tipo)) throw erro(400, 'Tipo de conteúdo inválido.');
  return tipo === 'pro'
    ? {
        model: 'conteudo_pro',
        key: 'id_cont_pro',
        title: 'titulo_cont_pro',
        desc: 'desc_cont_pro',
        text: 'mat_text_cont_pro',
        duration: 'duracao_cont_pro',
        date: 'data_pub_cont_pro',
      }
    : {
        model: 'conteudo',
        key: 'id_cont',
        title: 'titulo_cont',
        desc: 'desc_cont',
        text: 'mat_text_content',
        duration: 'duracao_cont',
        date: 'data_pub',
      };
}
function conteudoDTO(r, tipo) {
  const c = configConteudo(tipo);
  return {
    id: String(r[c.key]),
    tipo,
    ...(tipo === 'pro' ? {imagem_pro_id:r.imagem_pro_id,video_pro_id:r.video_pro_id,imagem:r.imagem_pro?require('./midia-pro.service').dto(r.imagem_pro):null,video:r.video_pro?require('./midia-pro.service').dto(r.video_pro):null}:{}),
    titulo: r[c.title],
    descricao: r[c.desc],
    texto: r[c.text],
    duracao: r[c.duration] === null ? null : Number(r[c.duration]),
    publicado: r.publicado,
    capa: r.capa,
    categoria: r.categoria,
    data_publicacao: r[c.date],
    atualizado_em: r.atualizado_em,
  };
}
function validarConteudo(d, c) {
  const data = {
    [c.title]: texto(d.titulo, 'Título', 255),
    [c.desc]: texto(d.descricao, 'Descrição', 4000),
    [c.text]: texto(d.texto, 'Corpo do conteúdo', 100000, c.model !== 'conteudo_pro'),
    categoria: texto(d.categoria, 'Categoria', 100, false),
  };
  const duration = Number(d.duracao);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440)
    throw erro(400, 'A duração deve ser um inteiro entre 1 e 1440 minutos.');
  data[c.duration] = c.model === 'conteudo_pro' ? BigInt(duration) : duration;
  if (typeof d.publicado !== 'boolean') throw erro(400, 'Informe se o conteúdo está publicado.');
  data.publicado = d.publicado;
  if (
    d.capa !== null &&
    d.capa !== undefined &&
    d.capa !== '' &&
    !(typeof d.capa === 'string' && /^\/uploads\/[a-f0-9-]{36}\.(jpg|png)$/.test(d.capa))
  )
    throw erro(400, 'Capa inválida. Envie uma imagem pelo painel.');
  data.capa = d.capa || null;
  return data;
}
async function validarCapa(capa) {
  if (!capa) return;
  const fs = require('node:fs/promises'),
    path = require('node:path');
  try {
    await fs.stat(path.join(require('./upload.service').uploadsDirectory, path.basename(capa)));
  } catch {
    throw erro(400, 'A capa enviada não foi encontrada.');
  }
}
async function listarConteudos(query = {}) {
  const tipo = query.tipo || 'normal',
    c = configConteudo(tipo),
    where = {};
  if (query.publicado !== undefined && query.publicado !== '') {
    if (!['true', 'false'].includes(query.publicado))
      throw erro(400, 'Filtro de publicação inválido.');
    where.publicado = query.publicado === 'true';
  }
  if (query.q) {
    const term = texto(query.q, 'Busca', 100);
    where.OR = [
      { [c.title]: { contains: term, mode: 'insensitive' } },
      { categoria: { contains: term, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma[c.model].findMany({
    where,
    ...pagina(query),
    ...(tipo==='pro'?{include:{imagem_pro:true,video_pro:true}}:{}),
    orderBy: [{ atualizado_em: 'desc' }, { [c.key]: 'desc' }],
  });
  return rows.map((row) => conteudoDTO(row, tipo));
}
async function buscarConteudo(tipo, value) {
  const c = configConteudo(tipo),
    r = await prisma[c.model].findUnique({ where: { [c.key]: id(value) }, ...(tipo==='pro'?{include:{imagem_pro:true,video_pro:true}}:{}) });
  if (!r) throw erro(404, 'Conteúdo não encontrado.');
  return conteudoDTO(r, tipo);
}
async function salvarConteudo(mod, tipo, value, d) {
  const c = configConteudo(tipo),
    data = validarConteudo(d, c);
  await validarCapa(data.capa);
  return prisma.$transaction(async (tx) => {
    let old = null;
    if (value) {
      old = await tx[c.model].findUnique({ where: { [c.key]: id(value) } });
      if (!old) throw erro(404, 'Conteúdo não encontrado.');
    }
    if(tipo==='pro') {
      Object.assign(data,await require('./midia-pro.service').validarVinculos(tx,mod,d,old));
      if(!data[c.text] && !(data.imagem_pro_id ?? (d.imagem_pro_id===undefined?old?.imagem_pro_id:null)) && !(data.video_pro_id ?? (d.video_pro_id===undefined?old?.video_pro_id:null)))throw erro(400,'Adicione texto, imagem exclusiva ou vídeo ao conteúdo PRO.');
    }
    if (!old) {
      data.id_mod = id(mod);
      data[c.date] = new Date();
    } else if (!old.publicado && data.publicado) data[c.date] = new Date();
    const r = old
      ? await tx[c.model].update({ where: { [c.key]: id(value) }, data, ...(tipo==='pro'?{include:{imagem_pro:true,video_pro:true}}:{}) })
      : await tx[c.model].create({ data, ...(tipo==='pro'?{include:{imagem_pro:true,video_pro:true}}:{}) });
    await auditoria(
      tx,
      mod,
      (old ? 'EDICAO_' : 'CRIACAO_') + (tipo === 'pro' ? 'CONTEUDO_PRO' : 'CONTEUDO'),
      'Conteúdo ' +
        tipo +
        ' ' +
        String(r[c.key]) +
        ' ' +
        (data.publicado ? 'publicado' : 'salvo sem publicação') +
        '.',
    );
    return conteudoDTO(r, tipo);
  });
}
async function publicarConteudo(mod, tipo, value, publicado) {
  if (typeof publicado !== 'boolean') throw erro(400, 'Publicação inválida.');
  const c = configConteudo(tipo);
  return prisma.$transaction(async (tx) => {
    const old = await tx[c.model].findUnique({ where: { [c.key]: id(value) } });
    if (!old) throw erro(404, 'Conteúdo não encontrado.');
    const r = await tx[c.model].update({
      where: { [c.key]: id(value) },
      data: { publicado, ...(!old.publicado && publicado ? { [c.date]: new Date() } : {}) },
    });
    await auditoria(
      tx,
      mod,
      publicado ? 'PUBLICACAO_CONTEUDO' : 'DESPUBLICACAO_CONTEUDO',
      'Conteúdo ' + tipo + ' ' + value + ' ' + (publicado ? 'publicado.' : 'despublicado.'),
    );
    return conteudoDTO(r, tipo);
  });
}
async function excluirConteudo(mod, tipo, value) {
  const c = configConteudo(tipo);
  return prisma.$transaction(async (tx) => {
    const old = await tx[c.model].findUnique({ where: { [c.key]: id(value) } });
    if (!old) throw erro(404, 'Conteúdo não encontrado.');
    const accesses = await tx[tipo === 'pro' ? 'usuaria_conteudo_pro' : 'usuaria_conteudo'].count({
      where: { [c.key]: id(value) },
    });
    if (accesses)
      throw erro(
        409,
        'Este conteúdo tem histórico de acesso. Despublique para preservar os registros.',
      );
    await tx[c.model].delete({ where: { [c.key]: id(value) } });
    await auditoria(
      tx,
      mod,
      'EXCLUSAO_CONTEUDO',
      'Conteúdo ' + tipo + ' ' + value + ' excluído sem histórico de acessos.',
    );
  });
}
async function resumo() {
  const [
    usuarias,
    forunsAtivos,
    conteudosPostados,
    conteudosPro,
    denuncias,
    denunciasPendentes,
    denunciasEmAnalise,
    denunciasResolvidas,
  ] = await Promise.all([
    prisma.usuaria.count(),
    prisma.forum.count(),
    prisma.conteudo.count({ where: { publicado: true } }),
    prisma.conteudo_pro.count({ where: { publicado: true } }),
    prisma.denuncia.count(),
    prisma.denuncia.count({ where: { status: 'PENDENTE' } }),
    prisma.denuncia.count({ where: { status: 'EM_ANALISE' } }),
    prisma.denuncia.count({ where: { status: 'RESOLVIDA' } }),
  ]);
  return {
    usuarias,
    forunsAtivos,
    conteudosPostados,
    conteudosPro,
    denuncias,
    denunciasPendentes,
    denunciasEmAnalise,
    denunciasResolvidas,
  };
}
const forumSelect = {
  id_for: true,
  titulo_for: true,
  desc_for: true,
  capa_for: true,
  dt_criacao: true,
  usuaria: { select: { id_usr: true, nome_usr: true } },
  _count: { select: { postagem: true, usuaria_forum: true } },
};
const forumDTO = (f) => ({
  id: String(f.id_for),
  titulo: f.titulo_for,
  descricao: f.desc_for,
  capa: f.capa_for,
  criadora: { id: String(f.usuaria.id_usr), nome: f.usuaria.nome_usr },
  data: f.dt_criacao,
  quantidade_postagens: f._count.postagem,
  quantidade_membros: f._count.usuaria_forum,
});
async function listarForuns(query = {}) {
  return (
    await prisma.forum.findMany({
      select: forumSelect,
      orderBy: [{ dt_criacao: 'desc' }, { id_for: 'desc' }],
      ...pagina(query),
    })
  ).map(forumDTO);
}
async function buscarForum(value) {
  const f = await prisma.forum.findUnique({
    where: { id_for: id(value) },
    select: {
      ...forumSelect,
      postagem: {
        take: 100,
        orderBy: [{ dt_post: 'desc' }, { id_post: 'desc' }],
        select: {
          id_post: true,
          cont_post: true,
          img_post: true,
          dt_post: true,
          usuaria: { select: { nome_usr: true } },
        },
      },
    },
  });
  if (!f) throw erro(404, 'Fórum não encontrado.');
  return {
    ...forumDTO(f),
    posts: f.postagem.reverse().map((p) => ({
      id: String(p.id_post),
      nome: p.usuaria.nome_usr,
      texto: p.cont_post,
      imagem: p.img_post,
      data: p.dt_post,
    })),
  };
}
async function editarForum(mod, value, d) {
  const titulo_for = texto(d.titulo, 'Título', 255),
    desc_for = texto(d.descricao, 'Descrição', 255, false);
  await prisma.$transaction(async (tx) => {
    await tx.forum.update({ where: { id_for: id(value) }, data: { titulo_for, desc_for } });
    await auditoria(tx, mod, 'EDICAO_FORUM', 'Fórum ' + value + ' editado pela moderadora.');
  });
  return buscarForum(value);
}
async function excluirForum(mod, value) {
  return prisma.$transaction(async (tx) => {
    const f = await tx.forum.findUnique({
      where: { id_for: id(value) },
      select: { id_for: true, _count: { select: { postagem: true, usuaria_forum: true } } },
    });
    if (!f) throw erro(404, 'Fórum não encontrado.');
    if (f._count.postagem || f._count.usuaria_forum)
      throw erro(
        409,
        'Este fórum tem participantes ou postagens. A exclusão não está disponível para preservar o histórico.',
      );
    await tx.forum.delete({ where: { id_for: f.id_for } });
    await auditoria(tx, mod, 'EXCLUSAO_FORUM', 'Fórum vazio ' + value + ' excluído.');
  });
}
async function listarUsuarias(query = {}) {
  const q = query.q ? texto(query.q, 'Busca', 100) : '';
  const users = await prisma.usuaria.findMany({
    where: q ? { nome_usr: { contains: q, mode: 'insensitive' } } : {},
    select: require('./banimento.service').select,
    orderBy: { id_usr: 'desc' },
    ...pagina(query),
  });
  return users.map(require('./banimento.service').dto);
}
module.exports = {
  loginModeradora,
  perfilModeradora,
  listarDenuncias,
  buscarDenuncia,
  atualizarStatus,
  listarRelatorios,
  criarRelatorio,
  listarConteudos,
  buscarConteudo,
  salvarConteudo,
  publicarConteudo,
  excluirConteudo,
  resumo,
  listarForuns,
  buscarForum,
  editarForum,
  excluirForum,
  listarUsuarias,
};
