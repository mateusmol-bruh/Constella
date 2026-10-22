const {
  buscarPerfil,
  atualizarPerfil
} = require("../services/perfil.service");

async function obterPerfil(req, res) {
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
    console.error(
      "Erro ao buscar perfil:",
      error
    );

    return res.status(500).json({
      mensagem: "Erro interno do servidor."
    });
  }
}

async function editarPerfil(req, res) {
  try {
    const {
      nome,
      email,
      foto
    } = req.body || {};

    if (
      nome === undefined &&
      email === undefined &&
      foto === undefined
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

    const perfil = await atualizarPerfil(
      req.usuarioId,
      {
        nome,
        email,
        foto
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

    console.error(
      "Erro ao atualizar perfil:",
      error
    );

    return res.status(500).json({
      mensagem: "Erro interno do servidor."
    });
  }
}

module.exports = {
  obterPerfil,
  editarPerfil
};