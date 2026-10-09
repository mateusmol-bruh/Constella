const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

async function cadastrarUsuaria({nome, email, senha, cpf}) {

    const senhaCriptografada = await bcrypt.hash(senha, 12);

    const usuaria = await prisma.usuaria.create({
        data: {
            nome_usr: nome,
            email_usr: email,
            senha_usr: senhaCriptografada,
            cpf_usr: cpf,
            foto_usr: null,
            status_verificacao: false
        },
        
        select: {
            id_usr: true,
            nome_usr: true,
            email_usr: true,
            status_verificacao: true
        }
    });

    return usuaria;
}

module.exports = {cadastrarUsuaria};