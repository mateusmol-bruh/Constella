const denunciaService =
  require("../services/denuncia.service");

function tratarErro(res, error) {
  if (error.statusCode) {
    return res
      .status(error.statusCode)
      .json({
        mensagem: error.message
      });
  }

  console.error(
    "Erro na API de denúncias:",
    error
  );

  return res.status(500).json({
    mensagem:
      "Erro interno do servidor."
  });
}

async function denunciarUsuaria(
  req,
  res
) {
  try {
    const denuncia =
      await denunciaService
        .denunciarUsuaria(
          req.usuarioId,
          req.params.id,
          req.body?.motivo
        );

    return res.status(201).json({
      mensagem:
        "Denúncia registrada com sucesso.",
      denuncia
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function denunciarPostagem(
  req,
  res
) {
  try {
    const denuncia =
      await denunciaService
        .denunciarPostagem(
          req.usuarioId,
          req.params.id,
          req.body?.motivo
        );

    return res.status(201).json({
      mensagem:
        "Denúncia registrada com sucesso.",
      denuncia
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function denunciarMensagem(
  req,
  res
) {
  try {
    const denuncia =
      await denunciaService
        .denunciarMensagem(
          req.usuarioId,
          req.params.id,
          req.body?.motivo
        );

    return res.status(201).json({
      mensagem:
        "Denúncia registrada com sucesso.",
      denuncia
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

async function minhas(req, res) {
  try {
    const denuncias =
      await denunciaService
        .listarMinhasDenuncias(
          req.usuarioId
        );

    return res.status(200).json({
      denuncias
    });
  } catch (error) {
    return tratarErro(res, error);
  }
}

module.exports = {
  denunciarUsuaria,
  denunciarPostagem,
  denunciarMensagem,
  minhas
};