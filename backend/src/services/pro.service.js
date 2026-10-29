const prisma =
  require("../config/prisma");
const { buscarStatusAssinatura } = require("./assinatura.service");

function erroHttp(statusCode, mensagem) {
  const erro =
    new Error(mensagem);

  erro.statusCode =
    statusCode;

  return erro;
}

function validarId(valor) {
  const texto = String(valor ?? "");
  if (
    !/^[1-9]\d*$/.test(texto) ||
    texto.length > 19 ||
    BigInt(texto) > 9223372036854775807n
  ) {
    throw erroHttp(
      400,
      "ID inválido."
    );
  }

  return BigInt(valor);
}

function formatarConteudoPro(
  conteudo
) {
  return {
    imagem: conteudo.imagem_pro ? require('./midia-pro.service').dto(conteudo.imagem_pro,String(conteudo.id_cont_pro)) : null,
    video: conteudo.video_pro ? require('./midia-pro.service').dto(conteudo.video_pro,String(conteudo.id_cont_pro)) : null,
    capa: conteudo.capa, categoria: conteudo.categoria, atualizado_em: conteudo.atualizado_em,
    id:
      conteudo.id_cont_pro
        .toString(),

    titulo:
      conteudo.titulo_cont_pro,

    descricao:
      conteudo.desc_cont_pro,

    material:
      conteudo.mat_text_cont_pro,

    anexos:
      conteudo.anexos_cont_pro,

    duracao:
      conteudo.duracao_cont_pro !==
        null
        ? conteudo.duracao_cont_pro
            .toString()
        : null,

    data_publicacao:
      conteudo.data_pub_cont_pro
  };
}

async function verificarStatusPro(
  idUsuario
) {
  return buscarStatusAssinatura(idUsuario);
}

async function listarCatalogoPro() {
  // Seleção explícita: material e anexos exclusivos não saem no catálogo.
  const conteudos = await prisma.conteudo_pro.findMany({
    where: { publicado: true },
    select: {
      id_cont_pro: true, capa: true, categoria: true, atualizado_em: true,
      titulo_cont_pro: true,
      desc_cont_pro: true,
      duracao_cont_pro: true,
      data_pub_cont_pro: true
    },
    orderBy: { data_pub_cont_pro: "desc" }
  });
  return conteudos.map((conteudo) => ({
    id: conteudo.id_cont_pro.toString(), capa: conteudo.capa, categoria: conteudo.categoria, atualizado_em: conteudo.atualizado_em,
    titulo: conteudo.titulo_cont_pro,
    descricao: conteudo.desc_cont_pro,
    duracao: conteudo.duracao_cont_pro?.toString() ?? null,
    data_publicacao: conteudo.data_pub_cont_pro
  }));
}

async function listarConteudosPro() {
  const conteudos =
    await prisma.conteudo_pro.findMany({
    where: { publicado: true },
      include: {imagem_pro:true,video_pro:true},
      orderBy: {
        data_pub_cont_pro: "desc"
      }
    });

  return conteudos.map(
    formatarConteudoPro
  );
}

async function buscarConteudoPro(id) {
  const idCont =
    validarId(id);

  const conteudo =
    await prisma.conteudo_pro.findUnique({
      where: {
        id_cont_pro:
          idCont, publicado: true
      }, include: {imagem_pro:true,video_pro:true}
    });

  if (!conteudo || conteudo.publicado === false) {
    throw erroHttp(
      404,
      "Conteúdo Pro não encontrado."
    );
  }

  return formatarConteudoPro(
    conteudo
  );
}

module.exports = {
  verificarStatusPro,
  listarCatalogoPro,
  listarConteudosPro,
  buscarConteudoPro
};
