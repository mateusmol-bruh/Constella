const {
  buscarPerfil,
  atualizarPerfil,
  concluirOnboarding
} = require("../services/perfil.service");
const { validarIdsInteresses } = require("../utils/interesses");

async function obterPerfil(req, res, next) {
  try {
    const perfil = await buscarPerfil(
      req.usuarioId
    );

    if (!perfil) {
      return res.status(404).json({
        mensagem: "Usuária não encontrada."
      });
    }

    return res.status(200).json(perfil);

  } catch (error) {
    return next(error);
  }
}

async function editarPerfil(req, res, next) {
  try {
    const {
      nome,
      email,
      foto,
      apresentacao
    } = req.body || {};

    if (
      nome === undefined &&
      email === undefined &&
      foto === undefined &&
      apresentacao === undefined
    ) {
      return res.status(400).json({
        mensagem:
          "Informe pelo menos um campo para atualizar."
      });
    }

    if (
      nome !== undefined &&
      (
        typeof nome !== "string" ||
        !nome.trim() ||
        nome.trim().length > 255
      )
    ) {
      return res.status(400).json({
        mensagem: "Nome inválido."
      });
    }

    if (email !== undefined) {
      if (typeof email !== "string") {
        return res.status(400).json({
          mensagem: "E-mail inválido."
        });
      }

      const emailLimpo =
        email.trim().toLowerCase();

      const regexEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !regexEmail.test(emailLimpo) ||
        emailLimpo.length > 255
      ) {
        return res.status(400).json({
          mensagem:
            "Informe um e-mail válido."
        });
      }
    }

    if (
      foto !== undefined &&
      foto !== null &&
      (
        typeof foto !== "string" ||
        foto.length > 500
      )
    ) {
      return res.status(400).json({
        mensagem: "Foto inválida."
      });
    }

    if (apresentacao !== undefined && (typeof apresentacao !== "string" || apresentacao.length > 500)) {
      return res.status(400).json({ mensagem: "A apresentação deve ter até 500 caracteres." });
    }

    const perfil = await atualizarPerfil(
      req.usuarioId,
      {
        nome,
        email,
        foto,
        apresentacao
      }
    );

    return res.status(200).json({
      mensagem:
        "Perfil atualizado com sucesso.",
      perfil
    });

  } catch (error) {

    if (error.code === "P2002") {
      return res.status(409).json({
        mensagem:
          "Este e-mail já está cadastrado."
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        mensagem:
          "Usuária não encontrada."
      });
    }

    return next(error);
  }
}

async function finalizarOnboarding(req, res, next) {
  const { apresentacao, interesses } = req.body || {};
  if (typeof apresentacao !== "string" || apresentacao.length > 500) {
    return res.status(400).json({ mensagem: "A apresentação deve ser um texto com até 500 caracteres." });
  }
  const erro = validarIdsInteresses(interesses);
  if (erro) return res.status(400).json({ mensagem: erro });
  try {
    const perfil = await concluirOnboarding(req.usuarioId, { apresentacao, interesses });
    return res.status(200).json({ mensagem: "Onboarding concluído com sucesso.", perfil });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obterPerfil,
  editarPerfil,
  finalizarOnboarding
};
