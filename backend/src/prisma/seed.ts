import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi definida no arquivo .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function limparBanco() {
  // Ordem inversa às dependências para não violar FKs.
  await prisma.denuncia_mensagem.deleteMany();
  await prisma.denuncia_postagem.deleteMany();
  await prisma.denuncia_usuaria.deleteMany();

  await prisma.relatorio_moderacao.deleteMany();
  await prisma.denuncia.deleteMany();

  await prisma.mensagem.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.conexao.deleteMany();

  await prisma.postagem.deleteMany();
  await prisma.usuaria_forum.deleteMany();
  await prisma.forum.deleteMany();

  await prisma.usuaria_conteudo_pro.deleteMany();
  await prisma.conteudo_pro.deleteMany();

  await prisma.usuaria_conteudo.deleteMany();
  await prisma.conteudo_interesses.deleteMany();
  await prisma.conteudo.deleteMany();

  await prisma.usuaria_interesses.deleteMany();
  await prisma.interesses.deleteMany();

  await prisma.assinatura.deleteMany();
  await prisma.moderadora.deleteMany();
  await prisma.usuaria.deleteMany();
}

async function main() {
  console.log("Iniciando seed do Constella...");

  // ATENÇÃO: este seed limpa as tabelas antes de recriar os dados fake.
  // Use em ambiente de desenvolvimento/testes.
  // await limparBanco();

  // =========================================================
  // MODERADORAS
  // =========================================================
  const senhaHash = await bcrypt.hash("Senha@123", 12);
  
  const modAna = await prisma.moderadora.create({
    data: {
      nome_mod: "Ana Martins",
      email_mod: "ana.moderadora@constella.dev",
      senha_mod: senhaHash,
    },
  });

  const modJulia = await prisma.moderadora.create({
    data: {
      nome_mod: "Júlia Ferreira",
      email_mod: "julia.moderadora@constella.dev",
      senha_mod: senhaHash,
    },
  });

  // =========================================================
  // USUÁRIAS
  // =========================================================
  const bia = await prisma.usuaria.create({
    data: {
      nome_usr: "Beatriz Santos",
      email_usr: "beatriz@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/beatriz.jpg",
      cpf_usr: "111.111.111-11",
      status_verificacao: true,
    },
  });

  const camila = await prisma.usuaria.create({
    data: {
      nome_usr: "Camila Oliveira",
      email_usr: "camila@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/camila.jpg",
      cpf_usr: "222.222.222-22",
      status_verificacao: true,
    },
  });

  const larissa = await prisma.usuaria.create({
    data: {
      nome_usr: "Larissa Almeida",
      email_usr: "larissa@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/larissa.jpg",
      cpf_usr: "333.333.333-33",
      status_verificacao: false,
    },
  });

  const mariana = await prisma.usuaria.create({
    data: {
      nome_usr: "Mariana Costa",
      email_usr: "mariana@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/mariana.jpg",
      cpf_usr: "444.444.444-44",
      status_verificacao: true,
    },
  });

  const sofia = await prisma.usuaria.create({
    data: {
      nome_usr: "Sofia Rodrigues",
      email_usr: "sofia@constella.dev",
      senha_usr: senhaHash,
      cpf_usr: "555.555.555-55",
      status_verificacao: false,
    },
  });

  // =========================================================
  // INTERESSES
  // =========================================================
  const interesseAmizade = await prisma.interesses.create({
    data: { nome_intr: "Amizade" },
  });

  const interesseTecnologia = await prisma.interesses.create({
    data: { nome_intr: "Tecnologia" },
  });

  const interesseLivros = await prisma.interesses.create({
    data: { nome_intr: "Livros" },
  });

  const interesseMusica = await prisma.interesses.create({
    data: { nome_intr: "Música" },
  });

  const interesseBemEstar = await prisma.interesses.create({
    data: { nome_intr: "Bem-estar" },
  });

  const interesseCarreira = await prisma.interesses.create({
    data: { nome_intr: "Carreira" },
  });

  // Usuárias x interesses
  await prisma.usuaria_interesses.createMany({
    data: [
      { id_usr: bia.id_usr, id_intr: interesseTecnologia.id_intr },
      { id_usr: bia.id_usr, id_intr: interesseMusica.id_intr },
      { id_usr: bia.id_usr, id_intr: interesseAmizade.id_intr },

      { id_usr: camila.id_usr, id_intr: interesseLivros.id_intr },
      { id_usr: camila.id_usr, id_intr: interesseBemEstar.id_intr },
      { id_usr: camila.id_usr, id_intr: interesseAmizade.id_intr },

      { id_usr: larissa.id_usr, id_intr: interesseCarreira.id_intr },
      { id_usr: larissa.id_usr, id_intr: interesseTecnologia.id_intr },

      { id_usr: mariana.id_usr, id_intr: interesseMusica.id_intr },
      { id_usr: mariana.id_usr, id_intr: interesseBemEstar.id_intr },

      { id_usr: sofia.id_usr, id_intr: interesseLivros.id_intr },
      { id_usr: sofia.id_usr, id_intr: interesseAmizade.id_intr },
    ],
  });

  // =========================================================
  // ASSINATURA
  // =========================================================
  await prisma.assinatura.create({
    data: {
      forma_pagto: "PIX",
      valor: 19.90,
      id_usr: bia.id_usr,
    },
  });

  await prisma.assinatura.create({
    data: {
      forma_pagto: "CARTAO",
      valor: 19.90,
      id_usr: mariana.id_usr,
    },
  });

  // =========================================================
  // CONEXÕES
  // =========================================================
  await prisma.conexao.createMany({
    data: [
      {
        status_conexao: "ACEITO",
        id_user_solicit: bia.id_usr,
        id_user_receb: camila.id_usr,
      },
      {
        status_conexao: "PENDENTE",
        id_user_solicit: larissa.id_usr,
        id_user_receb: bia.id_usr,
      },
      {
        status_conexao: "RECUSADO",
        id_user_solicit: sofia.id_usr,
        id_user_receb: mariana.id_usr,
      },
    ],
  });

  // =========================================================
  // CHAT E MENSAGENS
  // =========================================================
  const chatBiaCamila = await prisma.chat.create({
    data: {
      id_usr_01: bia.id_usr,
      id_usr_02: camila.id_usr,
    },
  });

  const msg1 = await prisma.mensagem.create({
    data: {
      cont_msg: "Oi! Vi que nós duas gostamos de fazer novas amizades ",
      id_chat: chatBiaCamila.id_chat,
      id_usr_emissor: bia.id_usr,
    },
  });

  await prisma.mensagem.create({
    data: {
      cont_msg: "Simm! Adorei seu perfil. Vamos conversar ",
      id_chat: chatBiaCamila.id_chat,
      id_usr_emissor: camila.id_usr,
    },
  });

  const msg3 = await prisma.mensagem.create({
    data: {
      cont_msg: "Você conhece algum clube de leitura legal?",
      id_chat: chatBiaCamila.id_chat,
      id_usr_emissor: bia.id_usr,
    },
  });

  // =========================================================
  // FÓRUNS
  // =========================================================
  const forumAmizades = await prisma.forum.create({
    data: {
      titulo_for: "Novas amizades",
      desc_for: "Espaço para conhecer mulheres com interesses em comum.",
      capa_for: "https://example.com/forum-amizades.jpg",
      id_mod: modAna.id_mod,
      id_usr_criadora: bia.id_usr,
    },
  });

  const forumCarreira = await prisma.forum.create({
    data: {
      titulo_for: "Mulheres na tecnologia",
      desc_for: "Troca de experiências sobre carreira, estudos e tecnologia.",
      capa_for: "https://example.com/forum-tecnologia.jpg",
      id_mod: modJulia.id_mod,
      id_usr_criadora: larissa.id_usr,
    },
  });

  await prisma.usuaria_forum.createMany({
    data: [
      { id_for: forumAmizades.id_for, id_usr: bia.id_usr },
      { id_for: forumAmizades.id_for, id_usr: camila.id_usr },
      { id_for: forumAmizades.id_for, id_usr: mariana.id_usr },
      { id_for: forumCarreira.id_for, id_usr: bia.id_usr },
      { id_for: forumCarreira.id_for, id_usr: larissa.id_usr },
      { id_for: forumCarreira.id_for, id_usr: sofia.id_usr },
    ],
  });

  // =========================================================
  // POSTAGENS
  // =========================================================
  const postBia = await prisma.postagem.create({
    data: {
      cont_post:
        "Alguém de São Paulo procurando companhia para estudar e tomar um café?",
      id_usr: bia.id_usr,
      id_for: forumAmizades.id_for,
    },
  });

  const postCamila = await prisma.postagem.create({
    data: {
      cont_post:
        "Estou procurando novas amigas que também gostem de livros e música ",
      img_post: "https://example.com/post-camila.jpg",
      id_usr: camila.id_usr,
      id_for: forumAmizades.id_for,
    },
  });

  const postLarissa = await prisma.postagem.create({
    data: {
      cont_post:
        "Comecei a estudar programação recentemente. Quais dicas vocês dariam para quem está começando?",
      id_usr: larissa.id_usr,
      id_for: forumCarreira.id_for,
    },
  });

  // =========================================================
  // CONTEÚDOS GRATUITOS
  // =========================================================
  const conteudo1 = await prisma.conteudo.create({
    data: {
      titulo_cont: "Como construir uma rede de apoio",
      desc_cont:
        "Dicas práticas para fortalecer vínculos e criar relações saudáveis.",
      mat_text_content:
        "Construir uma rede de apoio envolve reciprocidade, confiança, comunicação e respeito aos limites de cada pessoa.",
      duracao_cont: 8,
      data_pub: new Date("2026-10-01"),
      id_mod: modAna.id_mod,
    },
  });

  const conteudo2 = await prisma.conteudo.create({
    data: {
      titulo_cont: "Mulheres e carreira em tecnologia",
      desc_cont:
        "Introdução sobre estudos, carreira e desenvolvimento profissional.",
      mat_text_content:
        "Explorar comunidades, projetos pessoais e grupos de estudo pode ajudar no desenvolvimento profissional e na criação de conexões.",
      duracao_cont: 12,
      data_pub: new Date("2026-10-03"),
      id_mod: modJulia.id_mod,
    },
  });

  await prisma.conteudo_interesses.createMany({
    data: [
      {
        id_cont: conteudo1.id_cont,
        id_intr: interesseAmizade.id_intr,
      },
      {
        id_cont: conteudo1.id_cont,
        id_intr: interesseBemEstar.id_intr,
      },
      {
        id_cont: conteudo2.id_cont,
        id_intr: interesseTecnologia.id_intr,
      },
      {
        id_cont: conteudo2.id_cont,
        id_intr: interesseCarreira.id_intr,
      },
    ],
  });

  await prisma.usuaria_conteudo.createMany({
    data: [
      {
        id_usr: bia.id_usr,
        id_cont: conteudo1.id_cont,
        progresso_cont: 100,
      },
      {
        id_usr: camila.id_usr,
        id_cont: conteudo1.id_cont,
        progresso_cont: 45.5,
      },
      {
        id_usr: larissa.id_usr,
        id_cont: conteudo2.id_cont,
        progresso_cont: 80,
      },
    ],
  });

  // =========================================================
  // CONTEÚDOS PRO
  // =========================================================
  const conteudoPro1 = await prisma.conteudo_pro.create({
    data: {
      titulo_cont_pro: "Guia de networking para mulheres",
      desc_cont_pro:
        "Material exclusivo com estratégias para ampliar sua rede profissional.",
      mat_text_cont_pro:
        "Defina objetivos, participe de comunidades e mantenha contato com pessoas que compartilham interesses profissionais.",
      anexos_cont_pro: 1,
      duracao_cont_pro: 20n,
      data_pub_cont_pro: new Date("2026-10-05T10:00:00"),
    },
  });

  const conteudoPro2 = await prisma.conteudo_pro.create({
    data: {
      titulo_cont_pro: "Autoconfiança e desenvolvimento pessoal",
      desc_cont_pro:
        "Conteúdo exclusivo sobre confiança, limites e desenvolvimento pessoal.",
      mat_text_cont_pro:
        "Reconhecer conquistas, estabelecer limites e buscar apoio são práticas importantes para o desenvolvimento pessoal.",
      anexos_cont_pro: 0,
      duracao_cont_pro: 15n,
      data_pub_cont_pro: new Date("2026-10-06T14:00:00"),
    },
  });

  await prisma.usuaria_conteudo_pro.createMany({
    data: [
      { id_usr: bia.id_usr, id_cont_pro: conteudoPro1.id_cont_pro },
      { id_usr: mariana.id_usr, id_cont_pro: conteudoPro1.id_cont_pro },
      { id_usr: mariana.id_usr, id_cont_pro: conteudoPro2.id_cont_pro },
    ],
  });

  // =========================================================
  // DENÚNCIAS
  // =========================================================
  const denunciaUsuario = await prisma.denuncia.create({
    data: {
      motivo_den: "Comportamento inadequado no fórum.",
      status: "PENDENTE",
      id_mod: modAna.id_mod,
      id_usr_denunciante: camila.id_usr,
    },
  });

  await prisma.denuncia_usuaria.create({
    data: {
      id_den: denunciaUsuario.id_den,
      id_usr_denunciada: sofia.id_usr,
    },
  });

  const denunciaPost = await prisma.denuncia.create({
    data: {
      motivo_den: "Postagem considerada ofensiva.",
      status: "EM_ANALISE",
      id_mod: modJulia.id_mod,
      id_usr_denunciante: mariana.id_usr,
    },
  });

  await prisma.denuncia_postagem.create({
    data: {
      id_den: denunciaPost.id_den,
      id_post: postLarissa.id_post,
    },
  });

  const denunciaMensagem = await prisma.denuncia.create({
    data: {
      motivo_den: "Mensagem enviada para teste do fluxo de denúncia.",
      status: "RESOLVIDA",
      id_mod: modAna.id_mod,
      id_usr_denunciante: camila.id_usr,
    },
  });

  await prisma.denuncia_mensagem.create({
    data: {
      id_den: denunciaMensagem.id_den,
      id_msg: msg3.id_msg,
    },
  });

  // =========================================================
  // RELATÓRIOS DE MODERAÇÃO
  // =========================================================
  await prisma.relatorio_moderacao.createMany({
    data: [
      {
        id_mod: modAna.id_mod,
        acao: "ANALISE_DENUNCIA",
        dt_acao: new Date("2026-10-07T09:30:00"),
        desc: "Análise inicial de denúncia de usuária.",
      },
      {
        id_mod: modJulia.id_mod,
        acao: "REVISAO_POSTAGEM",
        dt_acao: new Date("2026-10-07T11:00:00"),
        desc: "Postagem enviada para análise da moderação.",
      },
    ],
  });

  console.log("Seed concluído com sucesso!");
  console.log("");
  console.log("Usuárias de teste:");
  console.log("  beatriz@constella.dev");
  console.log("  camila@constella.dev");
  console.log("  larissa@constella.dev");
  console.log("  mariana@constella.dev");
  console.log("  sofia@constella.dev");
  console.log("Senha fake usada no seed: Senha@123");
  console.log("");
  console.log(`Mensagem de referência criada: ${msg1.id_msg.toString()}`);
  console.log(`Postagem de referência criada: ${postBia.id_post.toString()}`);
  console.log(`Postagem de referência criada: ${postCamila.id_post.toString()}`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
