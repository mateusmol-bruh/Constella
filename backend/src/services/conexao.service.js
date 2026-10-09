const prisma = require("../config/prisma");

function erroHttp(mensagem, statusCode) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor) {
  if (
    typeof valor !== "string" ||
    valor.length > 19 ||
    !/^[1-9]\d*$/.test(valor)
  ) {
    throw erroHttp("Informe um ID válido e positivo.", 400);
  }

  const id = BigInt(valor);

  if (id > 9223372036854775807n) {
    throw erroHttp("ID fora do limite permitido.", 400);
  }

  return id;
}

function formatarConexao(conexao) {
  return {
    id_conexao: conexao.id_conexao.toString(),
    id_user_solicit: conexao.id_user_solicit.toString(),
    id_user_receb: conexao.id_user_receb.toString(),
    status_conexao: conexao.status_conexao,
    dt_solicitacao: conexao.dt_solicitacao
  };
}

// Adiciona informações básicas da outra usuária.
async function adicionarDadosDasUsuarias(conexoes, obterId) {
  if (conexoes.length === 0) return [];

  const ids = [
    ...new Set(
      conexoes.map((conexao) => obterId(conexao).toString())
    )
  ].map((id) => BigInt(id));

  const usuarias = await prisma.usuaria.findMany({
    where: {
      id_usr: { in: ids }
    },
    select: {
      id_usr: true,
      nome_usr: true,
      foto_usr: true
    }
  });

  const porId = new Map(
    usuarias.map((usuaria) => [
      usuaria.id_usr.toString(),
      {
        id_usr: usuaria.id_usr.toString(),
        nome_usr: usuaria.nome_usr,
        foto_usr: usuaria.foto_usr
      }
    ])
  );

  return conexoes.map((conexao) => ({
    ...formatarConexao(conexao),
    outra_usuaria:
      porId.get(obterId(conexao).toString()) || null
  }));
}

// RF-17: enviar uma solicitação.
async function enviarSolicitacao(idUsuario, idDestino) {
  const solicitante = validarId(idUsuario);
  const recebedora = validarId(idDestino);

  if (solicitante === recebedora) {
    throw erroHttp(
      "Você não pode se conectar consigo mesma.",
      400
    );
  }

  const destinoExiste = await prisma.usuaria.findUnique({
    where: { id_usr: recebedora },
    select: { id_usr: true }
  });

  if (!destinoExiste) {
    throw erroHttp(
      "Usuária de destino não encontrada.",
      404
    );
  }

  // Verifica solicitações nas duas direções.
  const existente = await prisma.conexao.findFirst({
    where: {
      OR: [
        {
          id_user_solicit: solicitante,
          id_user_receb: recebedora
        },
        {
          id_user_solicit: recebedora,
          id_user_receb: solicitante
        }
      ]
    }
  });

  if (existente) {
    throw erroHttp(
      `Já existe um registro de conexão entre essas usuárias (${existente.status_conexao}).`,
      409
    );
  }

  const conexao = await prisma.conexao.create({
    data: {
      id_user_solicit: solicitante,
      id_user_receb: recebedora,
      status_conexao: "PENDENTE"
    }
  });

  return formatarConexao(conexao);
}

// Solicitações pendentes recebidas.
async function listarRecebidas(idUsuario) {
  const id = validarId(idUsuario);

  const conexoes = await prisma.conexao.findMany({
    where: {
      id_user_receb: id,
      status_conexao: "PENDENTE"
    },
    orderBy: { dt_solicitacao: "desc" }
  });

  return adicionarDadosDasUsuarias(
    conexoes,
    (conexao) => conexao.id_user_solicit
  );
}

// Solicitações pendentes enviadas.
async function listarEnviadas(idUsuario) {
  const id = validarId(idUsuario);

  const conexoes = await prisma.conexao.findMany({
    where: {
      id_user_solicit: id,
      status_conexao: "PENDENTE"
    },
    orderBy: { dt_solicitacao: "desc" }
  });

  return adicionarDadosDasUsuarias(
    conexoes,
    (conexao) => conexao.id_user_receb
  );
}

// Conexões que já foram aceitas.
async function listarAceitas(idUsuario) {
  const id = validarId(idUsuario);

  const conexoes = await prisma.conexao.findMany({
    where: {
      status_conexao: "ACEITO",
      OR: [
        { id_user_solicit: id },
        { id_user_receb: id }
      ]
    },
    orderBy: { dt_solicitacao: "desc" }
  });

  return adicionarDadosDasUsuarias(
    conexoes,
    (conexao) =>
      conexao.id_user_solicit === id
        ? conexao.id_user_receb
        : conexao.id_user_solicit
  );
}

// Aceitar ou recusar uma solicitação pendente.
async function responderSolicitacao(
  idUsuario,
  idConexao,
  novoStatus
) {
  const recebedora = validarId(idUsuario);
  const conexaoId = validarId(idConexao);

  const conexao = await prisma.conexao.findUnique({
    where: { id_conexao: conexaoId }
  });

  if (!conexao) {
    throw erroHttp(
      "Solicitação de conexão não encontrada.",
      404
    );
  }

  if (conexao.id_user_receb !== recebedora) {
    throw erroHttp(
      "Somente quem recebeu pode responder à solicitação.",
      403
    );
  }

  if (conexao.status_conexao !== "PENDENTE") {
    throw erroHttp(
      "Esta solicitação já foi respondida.",
      409
    );
  }

  const resultado = await prisma.conexao.updateMany({
    where: {
      id_conexao: conexaoId,
      id_user_receb: recebedora,
      status_conexao: "PENDENTE"
    },
    data: {
      status_conexao: novoStatus
    }
  });

  if (resultado.count !== 1) {
    throw erroHttp(
      "Esta solicitação já foi respondida.",
      409
    );
  }

  const atualizada = await prisma.conexao.findUnique({
    where: { id_conexao: conexaoId }
  });

  return formatarConexao(atualizada);
}

module.exports = {
  enviarSolicitacao,
  listarRecebidas,
  listarEnviadas,
  listarAceitas,
  responderSolicitacao
};
