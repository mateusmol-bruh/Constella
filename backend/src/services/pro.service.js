const prisma =
  require("../config/prisma");

function erroHttp(statusCode, mensagem) {
  const erro =
    new Error(mensagem);

  erro.statusCode =
    statusCode;

  return erro;
}

function validarId(valor) {
  if (
    !/^[1-9]\d*$/.test(
      String(valor ?? "")
    )
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
  const idUsr =
    validarId(idUsuario);

  const assinatura =
    await prisma.assinatura.findUnique({
      where: {
        id_usr: idUsr
      }
    });

  return {
    pro:
      Boolean(assinatura),

    assinatura:
      assinatura
        ? {
            id:
              assinatura.id_ass
                .toString(),

            forma_pagamento:
              assinatura.forma_pagto,

            valor:
              Number(
                assinatura.valor
              )
          }
        : null
  };
}

async function listarConteudosPro() {
  const conteudos =
    await prisma.conteudo_pro.findMany({
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
          idCont
      }
    });

  if (!conteudo) {
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
  listarConteudosPro,
  buscarConteudoPro
};