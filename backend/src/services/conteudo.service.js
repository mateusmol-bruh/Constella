const prisma =
  require("../config/prisma");

function erroHttp(statusCode, mensagem) {
  const erro =
    new Error(mensagem);

  erro.statusCode =
    statusCode;

  return erro;
}

function validarId(
  valor,
  campo = "ID"
) {
  const texto = String(valor ?? "");
  if (
    !/^[1-9]\d*$/.test(texto) ||
    texto.length > 19 ||
    BigInt(texto) > 9223372036854775807n
  ) {
    throw erroHttp(
      400,
      `${campo} inválido.`
    );
  }

  return BigInt(valor);
}

function formatarConteudo(conteudo) {
  return {
    id:
      conteudo.id_cont.toString(),

    titulo:
      conteudo.titulo_cont,

    descricao:
      conteudo.desc_cont,

    material:
      conteudo.mat_text_content,

    duracao:
      conteudo.duracao_cont,

    data_publicacao:
      conteudo.data_pub,

    interesses:
      conteudo.conteudo_interesses
        ?.map((item) => ({
          id:
            item.interesses
              .id_intr
              .toString(),

          nome:
            item.interesses
              .nome_intr
        })) || []
  };
}

async function listarConteudos() {
  const conteudos =
    await prisma.conteudo.findMany({
      include: {
        conteudo_interesses: {
          include: {
            interesses: true
          }
        }
      },

      orderBy: {
        data_pub: "desc"
      }
    });

  return conteudos.map(
    formatarConteudo
  );
}

async function buscarConteudo(id) {
  const idCont =
    validarId(
      id,
      "Conteúdo"
    );

  const conteudo =
    await prisma.conteudo.findUnique({
      where: {
        id_cont: idCont
      },

      include: {
        conteudo_interesses: {
          include: {
            interesses: true
          }
        }
      }
    });

  if (!conteudo) {
    throw erroHttp(
      404,
      "Conteúdo não encontrado."
    );
  }

  return formatarConteudo(
    conteudo
  );
}

async function registrarAcesso(
  idUsuario,
  idConteudo
) {
  const idUsr =
    validarId(idUsuario);

  const idCont =
    validarId(
      idConteudo,
      "Conteúdo"
    );

  const conteudo =
    await prisma.conteudo.findUnique({
      where: {
        id_cont: idCont
      }
    });

  if (!conteudo) {
    throw erroHttp(
      404,
      "Conteúdo não encontrado."
    );
  }

  const existente =
    await prisma.usuaria_conteudo.findUnique({
      where: {
        id_usr_id_cont: {
          id_usr: idUsr,
          id_cont: idCont
        }
      }
    });

  if (existente) {
    return {
      mensagem:
        "Acesso já registrado.",

      progresso:
        existente.progresso_cont !== null
          ? Number(
              existente.progresso_cont
            )
          : null
    };
  }

  const acesso =
    await prisma.usuaria_conteudo.create({
      data: {
        id_usr: idUsr,
        id_cont: idCont,
        progresso_cont: 0
      }
    });

  return {
    mensagem:
      "Acesso registrado com sucesso.",

    progresso:
      Number(
        acesso.progresso_cont
      )
  };
}

async function atualizarProgresso(
  idUsuario,
  idConteudo,
  progresso
) {
  const idUsr =
    validarId(idUsuario);

  const idCont =
    validarId(
      idConteudo,
      "Conteúdo"
    );

  const valor =
    Number(progresso);

  if (
    Number.isNaN(valor) ||
    valor < 0 ||
    valor > 100
  ) {
    throw erroHttp(
      400,
      "O progresso deve estar entre 0 e 100."
    );
  }

  const conteudo =
    await prisma.conteudo.findUnique({
      where: {
        id_cont: idCont
      }
    });

  if (!conteudo) {
    throw erroHttp(
      404,
      "Conteúdo não encontrado."
    );
  }

  const registro =
    await prisma.usuaria_conteudo.upsert({
      where: {
        id_usr_id_cont: {
          id_usr: idUsr,
          id_cont: idCont
        }
      },

      update: {
        progresso_cont: valor
      },

      create: {
        id_usr: idUsr,
        id_cont: idCont,
        progresso_cont: valor
      }
    });

  return {
    id_conteudo:
      registro.id_cont.toString(),

    progresso:
      Number(
        registro.progresso_cont
      )
  };
}

module.exports = {
  listarConteudos,
  buscarConteudo,
  registrarAcesso,
  atualizarProgresso
};
