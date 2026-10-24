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

async function listarForuns(idUsuario, filtro, options) {
  if (filtro !== undefined && !["explorar","meus"].includes(filtro)) throw erroHttp(400,"Filtro inválido.");
  const idUsr = validarId(idUsuario);
  if (options && (!Number.isSafeInteger(options.pagina) || options.pagina < 1 || !Number.isSafeInteger(options.limite) || options.limite < 1 || options.limite > 50 || !Number.isSafeInteger((options.pagina - 1) * options.limite))) throw erroHttp(400, 'Paginação inválida.');

  const foruns =
    await prisma.forum.findMany({
      where: { ...(filtro === "explorar" ? {usuaria_forum:{none:{id_usr:idUsr}}} : filtro === "meus" ? {usuaria_forum:{some:{id_usr:idUsr}}} : {}),
        ...(options?.busca ? { titulo_for: { contains: options.busca.slice(0,255), mode: 'insensitive' } } : {}), },
      ...(options ? { skip: (options.pagina - 1) * options.limite, take: options.limite + 1 } : {}),
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

      orderBy: [{ dt_criacao: 'desc' }, { id_for: 'desc' }]
    });

  return adicionarContadores(foruns.map(forum => formatarForum(forum,idUsr)), idUsr);
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

  return adicionarContadores(registros.map(registro => ({...formatarForum(registro.forum,idUsr),participando:true})), idUsr);
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
        // Serializa criações da mesma conta; duas requisições simultâneas não burlam o limite.
        await tx.$queryRaw`SELECT id_usr FROM usuaria WHERE id_usr = ${idUsr} FOR UPDATE`;
        const status = await require('./assinatura.service').buscarStatusAssinatura(idUsr);
        if (!status.ativo && await tx.forum.count({ where: { id_usr_criadora: idUsr } }) >= 1) {
          throw Object.assign(erroHttp(403, 'Sua conta gratuita permite criar um fórum. Conheça o PRO para criar mais.'), { codigo: 'LIMITE_FORUNS_GRATUITO' });
        }

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
    await prisma.$transaction(async tx => {
      await require('./resposta.service').lock(tx, idUsr);
      const latest = await tx.postagem.findFirst({ where: { id_for: idFor }, orderBy: { id_post: 'desc' }, select: { id_post: true } });
      await tx.usuaria_forum.create({ data: { id_for: idFor, id_usr: idUsr, ultima_postagem_lida: latest?.id_post ?? 0n } });
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

  await prisma.$transaction(async tx => {
    await require('./resposta.service').lock(tx, idUsr);
    const resultado = await tx.usuaria_forum.deleteMany({ where: { id_for: idFor, id_usr: idUsr } });
    if (!resultado.count) return; // Repetir a saída não cria outro aviso.
    const account = await tx.usuaria.findUnique({ where: { id_usr: idUsr }, select: { nome_usr: true } });
    await tx.postagem.create({ data: { id_for: idFor, id_usr: idUsr, tipo_post: 'SAIDA', cont_post: `${account.nome_usr} saiu do fórum.` } });
    if (require('./notificacao.service').enabled()) await tx.notificacao_push.updateMany({
      where: { id_usr: idUsr, estado: 'PENDENTE', AND: [{ dados: { path: ['tipo'], equals: 'forum' } }, { dados: { path: ['id'], equals: String(idFor) } }] },
      data: { estado: 'CANCELADA' },
    });
  });

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
  limitesCriacao,
  listarForuns,
  listarMeusForuns,
  buscarForum,
  criarForum,
  editarForum,
  entrarForum,
  sairForum,
  excluirForum
};

async function limitesCriacao(idUsuario) {
  const idUsr = validarId(idUsuario);
  const [status, criados] = await Promise.all([
    require('./assinatura.service').buscarStatusAssinatura(idUsr),
    prisma.forum.count({ where: { id_usr_criadora: idUsr } }),
  ]);
  return { criados, limite: status.ativo ? null : 1, pode_criar: status.ativo || criados < 1, pro: status.ativo };
}

async function adicionarContadores(foruns, user) {
 if (!foruns.length) return foruns;
 const members = await prisma.usuaria_forum.findMany({ where: { id_usr: user, id_for: { in: foruns.map(forum => BigInt(forum.id_for)) } }, select: { id_for: true, ultima_postagem_lida: true } });
 const totals = members.length ? await prisma.postagem.groupBy({ by: ['id_for'], where: { tipo_post: 'MENSAGEM', id_usr: { not: user }, OR: members.map(member => ({ id_for: member.id_for, id_post: { gt: member.ultima_postagem_lida } })) }, _count: { _all: true } }) : [];
 const counts = new Map(totals.map(item => [String(item.id_for), item._count._all]));
 return foruns.map(forum => ({ ...forum, nao_lidas: counts.get(forum.id_for) || 0 }));
}
