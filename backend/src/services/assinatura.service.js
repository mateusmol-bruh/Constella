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

function formatarAssinatura(
  assinatura
) {
  return {
    id:
      assinatura.id_ass.toString(),

    forma_pagamento:
      assinatura.forma_pagto,

    valor:
      Number(
        assinatura.valor
      )
  };
}

async function buscarAssinatura(
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

  return assinatura
    ? formatarAssinatura(
        assinatura
      )
    : null;
}

async function criarAssinatura(
  idUsuario,
  dados
) {
  const idUsr =
    validarId(idUsuario);

  const existente =
    await prisma.assinatura.findUnique({
      where: {
        id_usr: idUsr
      }
    });

  if (existente) {
    throw erroHttp(
      409,
      "A usuária já possui assinatura."
    );
  }

  const formaPagamento =
    typeof dados.forma_pagamento ===
      "string"
      ? dados.forma_pagamento.trim()
      : "";

  const valor =
    Number(dados.valor);

  if (!formaPagamento) {
    throw erroHttp(
      400,
      "Forma de pagamento obrigatória."
    );
  }

  if (
    formaPagamento.length > 50
  ) {
    throw erroHttp(
      400,
      "Forma de pagamento inválida."
    );
  }

  if (
    Number.isNaN(valor) ||
    valor < 0
  ) {
    throw erroHttp(
      400,
      "Valor inválido."
    );
  }

  const assinatura =
    await prisma.assinatura.create({
      data: {
        forma_pagto:
          formaPagamento,

        valor,

        id_usr:
          idUsr
      }
    });

  return formatarAssinatura(
    assinatura
  );
}

async function cancelarAssinatura(
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

  if (!assinatura) {
    throw erroHttp(
      404,
      "Assinatura não encontrada."
    );
  }

  await prisma.assinatura.delete({
    where: {
      id_usr: idUsr
    }
  });

  return {
    mensagem:
      "Assinatura cancelada com sucesso."
  };
}

module.exports = {
  buscarAssinatura,
  criarAssinatura,
  cancelarAssinatura
};