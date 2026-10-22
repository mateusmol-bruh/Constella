const { cadastrarUsuaria } = require("../services/cadastro.service");

//Valida os dígitos verificadores de um CPF
function validarCpf(cpf) {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  function calcularDigito(tamanho) {
    let soma = 0;

    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }

    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  return (
    calcularDigito(9) === Number(cpf[9]) &&
    calcularDigito(10) === Number(cpf[10])
  );
}

async function cadastrar(req, res) {
  try {
    const { nome, email, senha, cpf } = req.body || {};

    //Validar os tipos dos campos
    if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof senha !== "string" ||
      typeof cpf !== "string"
    ) {
      return res.status(400).json({
        mensagem: "Nome, e-mail, senha e CPF são obrigatórios."
      });
    }

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const cpfLimpo = cpf.replace(/\D/g, "");

    //Validar nome
    if (!nomeLimpo || nomeLimpo.length > 255) {
      return res.status(400).json({
        mensagem: "Nome inválido."
      });
    }

    //Validar e-mail
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !regexEmail.test(emailLimpo) ||
      emailLimpo.length > 255
    ) {
      return res.status(400).json({
        mensagem: "Informe um e-mail válido."
      });
    }

    //Validar senha
    if (
      senha.length < 8 ||
      Buffer.byteLength(senha, "utf8") > 72
    ) {
      return res.status(400).json({
        mensagem: "A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes."
      });
    }

    //Validar CPF
    const formatoCpf = /^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;

    if (!formatoCpf.test(cpf) || !validarCpf(cpfLimpo)) {
      return res.status(400).json({
        mensagem: "CPF inválido."
      });
    }

    //Chamar o Service para cadastrar
    const resultado = await cadastrarUsuaria({
      nome: nomeLimpo,
      email: emailLimpo,
      senha,
      cpf: cpfLimpo
    });

    //Retornar sucesso
    return res.status(201).json({
      mensagem: "Usuária cadastrada com sucesso!",

      token: resultado.token,

      usuaria: {
        id: resultado.usuaria.id_usr.toString(),
        nome: resultado.usuaria.nome_usr,
        email: resultado.usuaria.email_usr,
        status_verificacao:
          resultado.usuaria.status_verificacao
      },

      proxima_etapa: "interesses"
    });

  } catch (error) {

    //E-mail ou CPF já cadastrado (Prisma)
    if (error.code === "P2002") {
      return res.status(409).json({
        mensagem: "E-mail ou CPF já cadastrado."
      });
    }

    console.error("Erro ao cadastrar usuária:", error);

    return res.status(500).json({
      mensagem: "Erro interno do servidor."
    });
  }
}

module.exports = { cadastrar };