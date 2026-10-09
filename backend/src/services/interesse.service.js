const prisma =
  require("../config/prisma");

async function listarInteresses() {
  const interesses =
    await prisma.interesses.findMany({
      orderBy: {
        nome_intr: "asc"
      }
    });

  return interesses.map(
    (interesse) => ({
      id_intr:
        interesse.id_intr.toString(),

      nome_intr:
        interesse.nome_intr
    })
  );
}

async function listarInteressesDaUsuaria(
  idUsuario
) {

  const registros =
    await prisma.usuaria_interesses.findMany({
      where: {
        id_usr: BigInt(idUsuario)
      },

      include: {
        interesses: true
      }
    });

  return registros.map(
    (registro) => ({
      id_intr:
        registro.interesses.id_intr.toString(),

      nome_intr:
        registro.interesses.nome_intr
    })
  );
}

async function atualizarInteresses(
  idUsuario,
  idsInteresses
) {

  const idUsr = BigInt(idUsuario);

  const idsUnicos = [
    ...new Set(
      idsInteresses.map(
        (id) => String(id)
      )
    )
  ];

  const idsBigInt =
    idsUnicos.map(
      (id) => BigInt(id)
    );

  if (idsBigInt.length > 0) {

    const encontrados =
      await prisma.interesses.findMany({
        where: {
          id_intr: {
            in: idsBigInt
          }
        }
      });

    if (
      encontrados.length !==
      idsBigInt.length
    ) {
      const erro =
        new Error(
          "Um ou mais interesses não existem."
        );

      erro.codigo = "INTERESSE_INVALIDO";

      throw erro;
    }
  }

  await prisma.$transaction([
    prisma.usuaria_interesses.deleteMany({
      where: {
        id_usr: idUsr
      }
    }),

    prisma.usuaria_interesses.createMany({
      data: idsBigInt.map(
        (idIntr) => ({
          id_usr: idUsr,
          id_intr: idIntr
        })
      )
    })
  ]);

  return listarInteressesDaUsuaria(
    idUsuario
  );
}

module.exports = {
  listarInteresses,
  listarInteressesDaUsuaria,
  atualizarInteresses
};