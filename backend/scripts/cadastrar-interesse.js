require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env")
});
 
const readline = require("readline");
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
 
async function cadastrarInteresse() {
  try {
    console.log("\n=== CADASTRO DE INTERESSE CONSTELLA ===\n");
 
    const nome = await perguntar("Nome do interesse: ");
 
    if (!nome) {
      throw new Error(
        "O nome do interesse é obrigatório."
      );
    }
 
    const interesseExistente =
      await prisma.interesses.findFirst({
        where: {
          nome_intr: {
            equals: nome,
            mode: "insensitive"
          }
        }
      });
 
    if (interesseExistente) {
      throw new Error(
        "Esse interesse já está cadastrado."
      );
    }
 
    const interesse =
      await prisma.interesses.create({
        data: {
          nome_intr: nome
        }
      });
 
    console.log(
      "\nInteresse cadastrado com sucesso!"
    );
 
    console.log({
      id: interesse.id_intr.toString(),
      nome: interesse.nome_intr
    });
 
  } catch (erro) {
    console.error(
      "\nErro ao cadastrar interesse:"
    );
 
    console.error(erro.message);
 
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}
 
cadastrarInteresse();