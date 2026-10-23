const prisma = require("../config/prisma");

function erroHttp(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor, campo = "ID") {
  const texto = String(valor ?? "");

  if (!/^[1-9]\d*$/.test(texto) || texto.length > 19 || BigInt(texto) > 9223372036854775807n) {
    throw erroHttp(400, `${campo} inválido.`);
  }

  return BigInt(texto);
}

function formatarForum(forum, idUsuario = null) {
  return {
    id_for: forum.id_for.toString(),
    titulo: forum.titulo_for,
    descricao: forum.desc_for,
    capa: forum.capa_for,
    dt_criacao: forum.dt_criacao,

    criadora: forum.usuaria
      ? {
          id: forum.usuaria.id_usr.toString(),
          nome: forum.usuaria.nome_usr,
          foto: forum.usuaria.foto_usr
        }
      : undefined,

    quantidade_membros:
      forum._count?.usuaria_forum,

    quantidade_postagens:
      forum._count?.postagem,

    participando:
      idUsuario !== null &&
      Array.isArray(forum.usuaria_forum)
        ? forum.usuaria_forum.some(
            (item) =>
              item.id_usr === idUsuario
          )
        : undefined
  };
}

async function listarForuns(idUsuario) {
  const idUsr = validarId(idUsuario);

  const foruns =
    await prisma.forum.findMany({
      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            foto_usr: true
          }
        },

        usuaria_forum: {
          where: {
            id_usr: idUsr
          },
          select: {
            id_usr: true
          }
        },

        _count: {
          select: {
            usuaria_forum: true,
            postagem: true
          }
        }
      },

      orderBy: {
        dt_criacao: "desc"
      }
    });

  return foruns.map((forum) =>
    formatarForum(forum, idUsr)
  );
}

async function listarMeusForuns(idUsuario) {
  const idUsr = validarId(idUsuario);

  const registros =
    await prisma.usuaria_forum.findMany({
      where: {
        id_usr: idUsr
      },

      include: {
        forum: {
          include: {
            usuaria: {
              select: {
                id_usr: true,
                nome_usr: true,
                foto_usr: true
              }
            },

            _count: {
              select: {
                usuaria_forum: true,
                postagem: true
              }
            }
          }
        }
      }
    });

  return registros.map((registro) =>
    ({ ...formatarForum(registro.forum, idUsr), participando: true })
  );
}

async function buscarForum(
  idUsuario,
  idForum
) {
  const idUsr = validarId(idUsuario);
  const idFor = validarId(
    idForum,
    "Fórum"
  );

  const forum =
    await prisma.forum.findUnique({
      where: {
        id_for: idFor
      },

      include: {
        usuaria: {
          select: {
            id_usr: true,
            nome_usr: true,
            foto_usr: true
          }
        },

        usuaria_forum: {
          where: {
            id_usr: idUsr
          },
          select: {
            id_usr: true
          }
        },

        _count: {
          select: {
            usuaria_forum: true,
            postagem: true
          }
        }
      }
    });

  if (!forum) {
    throw erroHttp(
      404,
      "Fórum não encontrado."
    );
  }

  return formatarForum(
    forum,
    idUsr
  );
}

async function criarForum(
  idUsuario,
  dados
) {
  const idUsr = validarId(idUsuario);

  const titulo =
    typeof dados.titulo === "string"
      ? dados.titulo.trim()
      : "";

  const descricao =
    typeof dados.descricao === "string"
      ? dados.descricao.trim()
      : null;

  const capa =
    typeof dados.capa === "string" &&
    dados.capa.trim()
      ? dados.capa.trim()
      : null;

  if (!titulo) {
    throw erroHttp(
      400,
      "Título do fórum é obrigatório."
    );
  }

  if (titulo.length > 255) {
    throw erroHttp(
      400,
      "Título deve possuir no máximo 255 caracteres."
    );
  }

  if (
    descricao &&
    descricao.length > 255
  ) {
    throw erroHttp(
      400,
      "Descrição deve possuir no máximo 255 caracteres."
    );
  }

  if (capa && capa.length > 255) {
    throw erroHttp(
      400,
      "URL da capa deve possuir no máximo 255 caracteres."
    );
  }

  const usuaria =
    await prisma.usuaria.findUnique({
      where: {
        id_usr: idUsr
      }
    });

  if (!usuaria) {
    throw erroHttp(
      404,
      "Usuária não encontrada."
    );
  }

  /*
    Atualmente o banco exige uma moderadora
    para todo fórum.

    Até criarmos a parte administrativa,
    atribuímos automaticamente uma moderadora.
  */
  const moderadora =
    await prisma.moderadora.findFirst({
      orderBy: {
        id_mod: "asc"
      }
    });

  if (!moderadora) {
    throw erroHttp(
      500,
      "Nenhuma moderadora cadastrada no sistema."
    );
  }

  const forum =
    await prisma.$transaction(
      async (tx) => {

        const novoForum =
          await tx.forum.create({
            data: {
              titulo_for: titulo,
              desc_for: descricao,
              capa_for: capa,

              id_mod:
                moderadora.id_mod,

              id_usr_criadora:
                idUsr
            }
          });

        // Criadora entra automaticamente
        // no próprio fórum.
        await tx.usuaria_forum.create({
          data: {
            id_for:
              novoForum.id_for,

            id_usr:
              idUsr
          }
        });

        return novoForum;
      }
    );

  return {
    id_for:
      forum.id_for.toString(),

    titulo:
      forum.titulo_for,

    descricao:
      forum.desc_for,

    capa:
      forum.capa_for,

    dt_criacao:
      forum.dt_criacao
  };
}

async function editarForum(
  idUsuario,
  idForum,
  dados
) {
  const idUsr =
    validarId(idUsuario);

  const idFor =
    validarId(
      idForum,
      "Fórum"
    );

  const forum =
    await prisma.forum.findUnique({
      where: {
        id_for: idFor
      }
    });

  if (!forum) {
    throw erroHttp(
      404,
      "Fórum não encontrado."
    );
  }

  if (
    forum.id_usr_criadora !== idUsr
  ) {
    throw erroHttp(
      403,
      "Somente a criadora pode editar este fórum."
    );
  }

  const atualizacao = {};

  if (dados.titulo !== undefined) {
    if (
      typeof dados.titulo !== "string" ||
      !dados.titulo.trim() ||
      dados.titulo.trim().length > 255
    ) {
      throw erroHttp(
        400,
        "Título inválido."
      );
    }

    atualizacao.titulo_for =
      dados.titulo.trim();
  }

  if (
    dados.descricao !== undefined
  ) {
    if (
      dados.descricao !== null &&
      (
        typeof dados.descricao !==
          "string" ||
        dados.descricao.length > 255
      )
    ) {
      throw erroHttp(
        400,
        "Descrição inválida."
      );
    }

    atualizacao.desc_for =
      dados.descricao === null
        ? null
        : dados.descricao.trim();
  }

  if (dados.capa !== undefined) {
    if (
      dados.capa !== null &&
      (
        typeof dados.capa !==
          "string" ||
        dados.capa.length > 255
      )
    ) {
      throw erroHttp(
        400,
        "Capa inválida."
      );
    }

    atualizacao.capa_for =
      dados.capa === null
        ? null
        : dados.capa.trim();
  }

  if (
    Object.keys(atualizacao).length ===
    0
  ) {
    throw erroHttp(
      400,
      "Informe pelo menos um campo para atualizar."
    );
  }

  const atualizado =
    await prisma.forum.update({
      where: {
        id_for: idFor
      },

      data: atualizacao
    });

  return {
    id_for:
      atualizado.id_for.toString(),

    titulo:
      atualizado.titulo_for,

    descricao:
      atualizado.desc_for,

    capa:
      atualizado.capa_for
  };
}

async function entrarForum(
  idUsuario,
  idForum
) {
  const idUsr =
    validarId(idUsuario);

  const idFor =
    validarId(
      idForum,
      "Fórum"
    );

  const forum =
    await prisma.forum.findUnique({
      where: {
        id_for: idFor
      }
    });

  if (!forum) {
    throw erroHttp(
      404,
      "Fórum não encontrado."
    );
  }

  const existente =
    await prisma.usuaria_forum.findUnique({
      where: {
        id_for_id_usr: {
          id_for: idFor,
          id_usr: idUsr
        }
      }
    });

  if (existente) {
    throw erroHttp(
      409,
      "Você já participa deste fórum."
    );
  }

  try {
    await prisma.usuaria_forum.create({
      data: {
        id_for: idFor,
        id_usr: idUsr
      }
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw erroHttp(409, "Você já participa deste fórum.");
    }
    throw error;
  }

  return {
    mensagem:
      "Você entrou no fórum com sucesso."
  };
}

async function sairForum(
  idUsuario,
  idForum
) {
  const idUsr =
    validarId(idUsuario);

  const idFor =
    validarId(
      idForum,
      "Fórum"
    );

  const forum =
    await prisma.forum.findUnique({
      where: {
        id_for: idFor
      }
    });

  if (!forum) {
    throw erroHttp(
      404,
      "Fórum não encontrado."
    );
  }

  if (
    forum.id_usr_criadora === idUsr
  ) {
    throw erroHttp(
      400,
      "A criadora não pode sair do próprio fórum."
    );
  }

  const resultado =
    await prisma.usuaria_forum.deleteMany({
      where: {
        id_for: idFor,
        id_usr: idUsr
      }
    });

  if (resultado.count === 0) {
    throw erroHttp(
      404,
      "Você não participa deste fórum."
    );
  }

  return {
    mensagem:
      "Você saiu do fórum com sucesso."
  };
}

async function excluirForum(
  idUsuario,
  idForum
) {
  const idUsr =
    validarId(idUsuario);

  const idFor =
    validarId(
      idForum,
      "Fórum"
    );

  const forum =
    await prisma.forum.findUnique({
      where: {
        id_for: idFor
      },

      include: {
        _count: {
          select: {
            postagem: true
          }
        }
      }
    });

  if (!forum) {
    throw erroHttp(
      404,
      "Fórum não encontrado."
    );
  }

  if (
    forum.id_usr_criadora !== idUsr
  ) {
    throw erroHttp(
      403,
      "Somente a criadora pode excluir este fórum."
    );
  }

  /*
    Evitamos apagar fórum com postagens
    porque o banco possui relacionamentos
    que podem estar ligados a denúncias.
  */
  if (
    forum._count.postagem > 0
  ) {
    throw erroHttp(
      409,
      "Não é possível excluir um fórum que possui postagens."
    );
  }

  await prisma.forum.delete({
    where: {
      id_for: idFor
    }
  });

  return {
    mensagem:
      "Fórum excluído com sucesso."
  };
}

module.exports = {
  listarForuns,
  listarMeusForuns,
  buscarForum,
  criarForum,
  editarForum,
  entrarForum,
  sairForum,
  excluirForum
};
