require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});
 
const readline = require("readline");
const bcrypt = require("bcryptjs");
 
const prisma = require("../src/config/prisma");
 
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
 
function perguntar(pergunta) {
  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      resolve(resposta.trim());
    });
  });
}
 
async function cadastrarModeradora() {
  try {
    console.log("\n=== CADASTRO DE MODERADORA CONSTELLA ===\n");
 
    const nome = await perguntar("Nome: ");
    const email = await perguntar("E-mail: ");
    const senha = await perguntar("Senha: ");
 
    if (!nome || !email || !senha) {
      throw new Error(
        "Nome, e-mail e senha são obrigatórios."
      );
    }
 
    if (senha.length < 8) {
      throw new Error(
        "A senha deve possuir pelo menos 8 caracteres."
      );
    }
 
    const emailNormalizado =
      email.toLowerCase();
 
    const moderadoraExistente =
      await prisma.moderadora.findUnique({
        where: {
          email_mod: emailNormalizado
        }
      });
 
    if (moderadoraExistente) {
      throw new Error(
        "Já existe uma moderadora com esse e-mail."
      );
    }
 
    const senhaHash = await bcrypt.hash(
      senha,
      12
    );
 
    const moderadora =
      await prisma.moderadora.create({
        data: {
          nome_mod: nome,
          email_mod: emailNormalizado,
          senha_mod: senhaHash
        }
      });
 
    console.log(
      "\nModeradora cadastrada com sucesso!"
    );
 
    console.log({
      id: moderadora.id_mod.toString(),
      nome: moderadora.nome_mod,
      email: moderadora.email_mod
    });
  } catch (erro) {
    console.error(
      "\nErro ao cadastrar moderadora:"
    );
 
    console.error(erro.message);
  } finally {
    rl.close();
 
    await prisma.$disconnect();
  }
}
 
cadastrarModeradora();