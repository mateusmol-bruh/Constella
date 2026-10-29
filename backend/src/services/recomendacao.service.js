const prisma = require("../config/prisma");

function erroHttp(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor) {
  const texto = String(valor ?? "");

  if (!/^[1-9]\d*$/.test(texto)) {
    throw erroHttp(400, "ID inválido.");
  }

  return BigInt(texto);
}

function normalizarTexto(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function buscarInteressesDaUsuaria(idUsuario) {
  const idUsr = validarId(idUsuario);

  const usuaria = await prisma.usuaria.findUnique({
    where: {
      id_usr: idUsr
    },

    include: {
      usuaria_interesses: {
        include: {
          interesses: true
        }
      }
    }
  });

  if (!usuaria) {
    throw erroHttp(
      404,
      "Usuária não encontrada."
    );
  }

  return usuaria.usuaria_interesses.map(
    (registro) => ({
      id: registro.id_intr,
      nome: registro.interesses.nome_intr
    })
  );
}

// =====================================================
// RECOMENDAÇÃO DE USUÁRIAS
// =====================================================

async function recomendarUsuarias(idUsuario) {
  const idUsr = validarId(idUsuario);

  const meusInteresses =
    await buscarInteressesDaUsuaria(idUsr);

  const meusIds = new Set(
    meusInteresses.map(
      (interesse) =>
        interesse.id.toString()
    )
  );

  /*
    Pessoas com conexão existente não são
    recomendadas novamente.
  */
  const conexoes =
    await prisma.conexao.findMany({
      where: {
        OR: [
          {
            id_user_solicit: idUsr
          },
          {
            id_user_receb: idUsr
          }
        ]
      }
    });

  const idsIgnorados =
    new Set([idUsr.toString()]);

  for (const conexao of conexoes) {
    idsIgnorados.add(
      conexao.id_user_solicit.toString()
    );

    idsIgnorados.add(
      conexao.id_user_receb.toString()
    );
  }

  const usuarias =
    await prisma.usuaria.findMany({
      where: {
        id_usr: {
          not: idUsr
        },
        ...require("./bloqueio.service").filtroVisivel(idUsr)
      },

      select: {
        id_usr: true,
        nome_usr: true,
        foto_usr: true,
        status_verificacao: true,

        usuaria_interesses: {
          include: {
            interesses: true
          }
        }
      }
    });

  const recomendacoes =
    usuarias
      .filter(
        (usuaria) =>
          !idsIgnorados.has(
            usuaria.id_usr.toString()
          )
      )
      .map((usuaria) => {
        const interessesEmComum =
          usuaria.usuaria_interesses
            .filter((registro) =>
              meusIds.has(
                registro.id_intr.toString()
              )
            )
            .map((registro) => ({
              id:
                registro.id_intr.toString(),

              nome:
                registro.interesses
                  .nome_intr
            }));

        const totalMeus =
          meusInteresses.length;

        const totalDela =
          usuaria.usuaria_interesses.length;

        /*
          Similaridade de Jaccard:
          interseção / união.

          Exemplo:
          A = música, filmes, tecnologia
          B = música, tecnologia, livros

          2 interesses em comum
          4 interesses totais diferentes

          score = 2 / 4 = 0.5
        */

        const uniao =
          totalMeus +
          totalDela -
          interessesEmComum.length;

        const compatibilidade =
          uniao > 0
            ? interessesEmComum.length /
              uniao
            : 0;

        return {
          id:
            usuaria.id_usr.toString(),

          nome:
            usuaria.nome_usr,

          foto:
            usuaria.foto_usr,

          status_verificacao:
            usuaria.status_verificacao,

          interesses_em_comum:
            interessesEmComum,

          quantidade_interesses_em_comum:
            interessesEmComum.length,

          compatibilidade:
            Number(
              (
                compatibilidade * 100
              ).toFixed(2)
            )
        };
      })
      .sort((a, b) => {
        if (
          b.compatibilidade !==
          a.compatibilidade
        ) {
          return (
            b.compatibilidade -
            a.compatibilidade
          );
        }

        return (
          b.quantidade_interesses_em_comum -
          a.quantidade_interesses_em_comum
        );
      });

  return recomendacoes;
}

// =====================================================
// RECOMENDAÇÃO DE CONTEÚDOS
// =====================================================

async function recomendarConteudos(
  idUsuario
) {
  const meusInteresses =
    await buscarInteressesDaUsuaria(
      idUsuario
    );

  const meusIds = new Set(
    meusInteresses.map(
      (interesse) =>
        interesse.id.toString()
    )
  );

  const conteudos =
    await prisma.conteudo.findMany({
      where: { publicado: true },
      include: {
        conteudo_interesses: {
          include: {
            interesses: true
          }
        }
      }
    });

  const recomendacoes =
    conteudos.map((conteudo) => {
      const interessesCompativeis =
        conteudo.conteudo_interesses
          .filter((registro) =>
            meusIds.has(
              registro.id_intr.toString()
            )
          )
          .map((registro) => ({
            id:
              registro.id_intr.toString(),

            nome:
              registro.interesses
                .nome_intr
          }));

      return {
        id:
          conteudo.id_cont.toString(),

        titulo:
          conteudo.titulo_cont,

        descricao:
          conteudo.desc_cont,

        duracao:
          conteudo.duracao_cont,

        data_publicacao:
          conteudo.data_pub,

        interesses_compativeis:
          interessesCompativeis,

        score:
          interessesCompativeis.length
      };
    });

  /*
    Primeiro quem possui mais interesses
    compatíveis.

    Em empate, conteúdo mais recente.
  */
  recomendacoes.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      new Date(b.data_publicacao) -
      new Date(a.data_publicacao)
    );
  });

  return recomendacoes;
}

// =====================================================
// RECOMENDAÇÃO DE FÓRUNS
// =====================================================

async function recomendarForuns(
  idUsuario
) {
  const idUsr = validarId(idUsuario);

  const meusInteresses =
    await buscarInteressesDaUsuaria(
      idUsr
    );

  /*
    Fóruns não possuem tags nem relação
    com interesses no banco.

    Por isso utilizamos título + descrição.
  */

  const interessesNormalizados =
    meusInteresses.map(
      (interesse) => ({
        id:
          interesse.id.toString(),

        nome:
          interesse.nome,

        texto:
          normalizarTexto(
            interesse.nome
          )
      })
    );

  const participacoes =
    await prisma.usuaria_forum.findMany({
      where: {
        id_usr: idUsr
      }
    });

  const forunsQueJaParticipo =
    new Set(
      participacoes.map(
        (participacao) =>
          participacao.id_for.toString()
      )
    );

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

        _count: {
          select: {
            usuaria_forum: true,
            postagem: true
          }
        }
      }
    });

  const recomendacoes =
    foruns
      .filter(
        (forum) =>
          !forunsQueJaParticipo.has(
            forum.id_for.toString()
          )
      )
      .map((forum) => {
        const textoForum =
          normalizarTexto(
            `${forum.titulo_for} ${
              forum.desc_for || ""
            }`
          );

        const interessesEncontrados =
          interessesNormalizados
            .filter((interesse) =>
              textoForum.includes(
                interesse.texto
              )
            )
            .map((interesse) => ({
              id: interesse.id,
              nome: interesse.nome
            }));

        /*
          Interesse vale bastante.

          Número de membros é usado apenas
          como um bônus pequeno.
        */

        const scoreInteresses =
          interessesEncontrados.length *
          10;

        const bonusPopularidade =
          Math.min(
            forum._count
              .usuaria_forum,
            10
          );

        const score =
          scoreInteresses +
          bonusPopularidade;

        return {
          id:
            forum.id_for.toString(),

          titulo:
            forum.titulo_for,

          descricao:
            forum.desc_for,

          capa:
            forum.capa_for,

          dt_criacao:
            forum.dt_criacao,

          criadora: {
            id:
              forum.usuaria.id_usr
                .toString(),

            nome:
              forum.usuaria.nome_usr,

            foto:
              forum.usuaria.foto_usr
          },

          quantidade_membros:
            forum._count
              .usuaria_forum,

          quantidade_postagens:
            forum._count
              .postagem,

          interesses_identificados:
            interessesEncontrados,

          score
        };
      });

  recomendacoes.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      b.quantidade_membros -
      a.quantidade_membros
    );
  });

  return recomendacoes;
}

module.exports = {
  recomendarUsuarias,
  recomendarConteudos,
  recomendarForuns
};
