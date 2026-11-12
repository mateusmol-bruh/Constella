const prisma = require("../config/prisma");

// Somente metadados autorizados. Nunca reutilizar projeções com dados de contas.
const conteudoSelect = {
  id_cont: true, capa: true, categoria: true, atualizado_em: true, titulo_cont: true, desc_cont: true,
  duracao_cont: true, data_pub: true,
  conteudo_interesses: { select: { interesses: { select: { id_intr: true, nome_intr: true } } } }
};

function formatarConteudo(conteudo) {
  return {
    id: conteudo.id_cont.toString(), capa: conteudo.capa, categoria: conteudo.categoria, atualizado_em: conteudo.atualizado_em, titulo: conteudo.titulo_cont,
    descricao: conteudo.desc_cont, duracao: conteudo.duracao_cont,
    data_publicacao: conteudo.data_pub,
    interesses: conteudo.conteudo_interesses.map(({ interesses }) => ({
      id: interesses.id_intr.toString(), nome: interesses.nome_intr
    }))
  };
}

function validarId(id) {
  if (typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    const erro = new Error("ID de conteúdo inválido.");
    erro.statusCode = 400;
    throw erro;
  }
  return BigInt(id);
}

async function listarConteudosPublicos() {
  const registros = await prisma.conteudo.findMany({
    where: { publicado: true },
    select: conteudoSelect, take: 100, orderBy: [{ data_pub: "desc" }, { id_cont: "desc" }]
  });
  return registros.map(formatarConteudo);
}

async function buscarConteudoPublico(id) {
  const conteudo = await prisma.conteudo.findUnique({
    where: { id_cont: validarId(id), publicado: true }, select: { ...conteudoSelect, mat_text_content: true }
  });
  if (!conteudo || conteudo.publicado === false) {
    const erro = new Error("Conteúdo não encontrado.");
    erro.statusCode = 404;
    throw erro;
  }
  return { ...formatarConteudo(conteudo), material: conteudo.mat_text_content };
}

async function listarForunsPublicos() {
  const registros = await prisma.forum.findMany({
    select: {
      id_for: true, titulo_for: true, desc_for: true, capa_for: true, dt_criacao: true,
      _count: { select: { usuaria_forum: true, postagem: true } }
    },
    take: 100, orderBy: [{ dt_criacao: "desc" }, { id_for: "desc" }]
  });
  return registros.map((forum) => ({
    id_for: forum.id_for.toString(), titulo: forum.titulo_for, descricao: forum.desc_for,
    capa: forum.capa_for, dt_criacao: forum.dt_criacao,
    quantidade_membros: forum._count.usuaria_forum, quantidade_postagens: forum._count.postagem
  }));
}

async function apresentarProPublico() {
  const registros = await prisma.conteudo_pro.findMany({
    where: { publicado: true },
    select: {
      id_cont_pro: true, capa: true, categoria: true, atualizado_em: true, titulo_cont_pro: true, desc_cont_pro: true,
      duracao_cont_pro: true, data_pub_cont_pro: true
    },
    take: 100, orderBy: [{ data_pub_cont_pro: "desc" }, { id_cont_pro: "desc" }]
  });
  return {
    nome: "Constella Pro", autenticada: false, assinatura: null,
    provedor_disponivel: false, motivo: "PROVEDOR_NAO_CONFIGURADO",
    mensagem: "Conheça os conteúdos exclusivos do Constella Pro. As assinaturas ainda não estão disponíveis para contratação.",
    beneficios: ["Acesso a conteúdos exclusivos do catálogo Pro."], planos: [],
    catalogo: registros.map((conteudo) => ({
      id: conteudo.id_cont_pro.toString(), capa: conteudo.capa, categoria: conteudo.categoria, atualizado_em: conteudo.atualizado_em, titulo: conteudo.titulo_cont_pro,
      descricao: conteudo.desc_cont_pro, duracao: conteudo.duracao_cont_pro?.toString() ?? null,
      data_publicacao: conteudo.data_pub_cont_pro
    }))
  };
}

module.exports = { listarConteudosPublicos, buscarConteudoPublico, listarForunsPublicos, apresentarProPublico };
