
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

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

// Procura um registro antes de criar.
// Se já existir, reutiliza o registro sem alterá-lo.

async function obterOuCriar<T, D>(
  dados: D,
  procurar: (dados: D) => Promise<T | null>,
  criar: (dados: D) => Promise<T>
): Promise<T> {
  const existente = await procurar(dados);

  if (existente) {
    return existente;
  }

  return criar(dados);
}

// Evita cadastrar relacionamentos repetidos.

async function garantirRelacionamentos<T>(
  registros: readonly T[],
  procurar: (dados: T) => Promise<unknown | null>,
  criar: (dados: T) => Promise<unknown>
): Promise<void> {
  for (const dados of registros) {
    const existente = await procurar(dados);

    if (!existente) {
      await criar(dados);
    }
  }
}

// =========================================================
// FUNÇÃO PRINCIPAL
// =========================================================

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Este seed contém dados de teste e não pode ser executado em produção."
    );
  }

  console.log("Iniciando seed do Constella...");

  const senhaHash = await bcrypt.hash("Senha@123", 12);

  // =========================================================
  // 1. MODERADORAS
  // =========================================================

  const modAna = await prisma.moderadora.upsert({
    where: {
      email_mod: "ana@constella.dev"
    },
    update: {},
    create: {
      nome_mod: "Ana",
      email_mod: "ana@constella.dev",
      senha_mod: senhaHash
    }
  });

  const modJulia = await prisma.moderadora.upsert({
    where: {
      email_mod: "julia@constella.dev"
    },
    update: {},
    create: {
      nome_mod: "Julia",
      email_mod: "julia@constella.dev",
      senha_mod: senhaHash
    }
  });

  // =========================================================
  // 2. USUÁRIAS
  // =========================================================

  const bia = await obterOuCriar(
    {
      nome_usr: "Beatriz Santos",
      email_usr: "beatriz@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/beatriz.jpg",
      cpf_usr: "111.111.111-11",
      status_verificacao: true
    } as const,

    (data) => prisma.usuaria.findFirst({
      where: {
        OR: [
          { email_usr: data.email_usr },
          { cpf_usr: data.cpf_usr }
        ]
      }
    }),

    (data) => prisma.usuaria.create({ data })
  );

  const camila = await obterOuCriar(
    {
      nome_usr: "Camila Oliveira",
      email_usr: "camila@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/camila.jpg",
      cpf_usr: "222.222.222-22",
      status_verificacao: true
    } as const,

    (data) => prisma.usuaria.findFirst({
      where: {
        OR: [
          { email_usr: data.email_usr },
          { cpf_usr: data.cpf_usr }
        ]
      }
    }),

    (data) => prisma.usuaria.create({ data })
  );

  const larissa = await obterOuCriar(
    {
      nome_usr: "Larissa Almeida",
      email_usr: "larissa@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/larissa.jpg",
      cpf_usr: "333.333.333-33",
      status_verificacao: false
    } as const,

    (data) => prisma.usuaria.findFirst({
      where: {
        OR: [
          { email_usr: data.email_usr },
          { cpf_usr: data.cpf_usr }
        ]
      }
    }),

    (data) => prisma.usuaria.create({ data })
  );

  const mariana = await obterOuCriar(
    {
      nome_usr: "Mariana Costa",
      email_usr: "mariana@constella.dev",
      senha_usr: senhaHash,
      foto_usr: "https://example.com/mariana.jpg",
      cpf_usr: "444.444.444-44",
      status_verificacao: true
    } as const,

    (data) => prisma.usuaria.findFirst({
      where: {
        OR: [
          { email_usr: data.email_usr },
          { cpf_usr: data.cpf_usr }
        ]
      }
    }),

    (data) => prisma.usuaria.create({ data })
  );

  const sofia = await obterOuCriar(
    {
      nome_usr: "Sofia Rodrigues",
      email_usr: "sofia@constella.dev",
      senha_usr: senhaHash,
      cpf_usr: "555.555.555-55",
      status_verificacao: false
    } as const,

    (data) => prisma.usuaria.findFirst({
      where: {
        OR: [
          { email_usr: data.email_usr },
          { cpf_usr: data.cpf_usr }
        ]
      }
    }),

    (data) => prisma.usuaria.create({ data })
  );

  // =========================================================
  // 3. INTERESSES
  // =========================================================

  const interesseAmizade = await obterOuCriar(
    { nome_intr: "Amizade" },
    (data) => prisma.interesses.findFirst({
      where: { nome_intr: data.nome_intr }
    }),
    (data) => prisma.interesses.create({ data })
  );

  const interesseTecnologia = await obterOuCriar(
    { nome_intr: "Tecnologia" },
    (data) => prisma.interesses.findFirst({
      where: { nome_intr: data.nome_intr }
    }),
    (data) => prisma.interesses.create({ data })
  );

  const interesseLivros = await obterOuCriar(
    { nome_intr: "Livros" },
    (data) => prisma.interesses.findFirst({
      where: { nome_intr: data.nome_intr }
    }),
    (data) => prisma.interesses.create({ data })
  );

  const interesseMusica = await obterOuCriar(
    { nome_intr: "Música" },
    (data) => prisma.interesses.findFirst({
      where: { nome_intr: data.nome_intr }
    }),
    (data) => prisma.interesses.create({ data })
  );

  const interesseBemEstar = await obterOuCriar(
    { nome_intr: "Bem-estar" },
    (data) => prisma.interesses.findFirst({
      where: { nome_intr: data.nome_intr }
    }),
    (data) => prisma.interesses.create({ data })
  );

  const interesseCarreira = await obterOuCriar(
    { nome_intr: "Carreira" },
    (data) => prisma.interesses.findFirst({
      where: { nome_intr: data.nome_intr }
    }),
    (data) => prisma.interesses.create({ data })
  );

  // =========================================================
  // 4. USUÁRIAS X INTERESSES
  // =========================================================

  await garantirRelacionamentos(
    [
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
      { id_usr: sofia.id_usr, id_intr: interesseAmizade.id_intr }
    ],

    (dados) => prisma.usuaria_interesses.findFirst({
      where: {
        id_usr: dados.id_usr,
        id_intr: dados.id_intr
      }
    }),

    (dados) => prisma.usuaria_interesses.create({
      data: dados
    })
  );

  // =========================================================
  // 5. ASSINATURAS
  // =========================================================

  await obterOuCriar(
    {
      forma_pagto: "PIX",
      valor: 19.90,
      id_usr: bia.id_usr
    },

    (data) => prisma.assinatura.findFirst({
      where: {
        id_usr: data.id_usr,
        forma_pagto: data.forma_pagto
      }
    }),

    (data) => prisma.assinatura.create({ data })
  );

  await obterOuCriar(
    {
      forma_pagto: "CARTAO",
      valor: 19.90,
      id_usr: mariana.id_usr
    },

    (data) => prisma.assinatura.findFirst({
      where: {
        id_usr: data.id_usr,
        forma_pagto: data.forma_pagto
      }
    }),

    (data) => prisma.assinatura.create({ data })
  );

  // =========================================================
  // 6. CONEXÕES
  // =========================================================

  await garantirRelacionamentos(
    [
      {
        status_conexao: "ACEITO",
        id_user_solicit: bia.id_usr,
        id_user_receb: camila.id_usr
      },
      {
        status_conexao: "PENDENTE",
        id_user_solicit: larissa.id_usr,
        id_user_receb: bia.id_usr
      },
      {
        status_conexao: "RECUSADO",
        id_user_solicit: sofia.id_usr,
        id_user_receb: mariana.id_usr
      }
    ] as const,

    (dados) => prisma.conexao.findFirst({
      where: {
        OR: [
          {
            id_user_solicit: dados.id_user_solicit,
            id_user_receb: dados.id_user_receb
          },
          {
            id_user_solicit: dados.id_user_receb,
            id_user_receb: dados.id_user_solicit
          }
        ]
      }
    }),

    (dados) => prisma.conexao.create({ data: dados })
  );

  // =========================================================
  // 7. CHAT E MENSAGENS
  // =========================================================

  const chatBiaCamila = await obterOuCriar(
    {
      id_usr_01: bia.id_usr,
      id_usr_02: camila.id_usr
    },

    (data) => prisma.chat.findFirst({
      where: {
        OR: [
          {
            id_usr_01: data.id_usr_01,
            id_usr_02: data.id_usr_02
          },
          {
            id_usr_01: data.id_usr_02,
            id_usr_02: data.id_usr_01
          }
        ]
      }
    }),

    (data) => prisma.chat.create({ data })
  );

  const msg1 = await obterOuCriar(
    {
      cont_msg: "Oi! Vi que nós duas gostamos de fazer novas amizades ",
      id_chat: chatBiaCamila.id_chat,
      id_usr_emissor: bia.id_usr
    },

    (data) => prisma.mensagem.findFirst({
      where: {
        id_chat: data.id_chat,
        id_usr_emissor: data.id_usr_emissor,
        cont_msg: data.cont_msg
      }
    }),

    (data) => prisma.mensagem.create({ data })
  );

  await obterOuCriar(
    {
      cont_msg: "Simm! Adorei seu perfil. Vamos conversar ",
      id_chat: chatBiaCamila.id_chat,
      id_usr_emissor: camila.id_usr
    },

    (data) => prisma.mensagem.findFirst({
      where: {
        id_chat: data.id_chat,
        id_usr_emissor: data.id_usr_emissor,
        cont_msg: data.cont_msg
      }
    }),

    (data) => prisma.mensagem.create({ data })
  );

  const msg3 = await obterOuCriar(
    {
      cont_msg: "Você conhece algum clube de leitura legal?",
      id_chat: chatBiaCamila.id_chat,
      id_usr_emissor: bia.id_usr
    },

    (data) => prisma.mensagem.findFirst({
      where: {
        id_chat: data.id_chat,
        id_usr_emissor: data.id_usr_emissor,
        cont_msg: data.cont_msg
      }
    }),

    (data) => prisma.mensagem.create({ data })
  );

  // =========================================================
  // 8. FÓRUNS
  // =========================================================

  const forumAmizades = await obterOuCriar(
    {
      titulo_for: "Novas amizades",
      desc_for: "Espaço para conhecer mulheres com interesses em comum.",
      capa_for: "https://example.com/forum-amizades.jpg",
      id_mod: modAna.id_mod,
      id_usr_criadora: bia.id_usr
    },

    (data) => prisma.forum.findFirst({
      where: {
        titulo_for: data.titulo_for,
        id_usr_criadora: data.id_usr_criadora
      }
    }),

    (data) => prisma.forum.create({ data })
  );

  const forumCarreira = await obterOuCriar(
    {
      titulo_for: "Mulheres na tecnologia",
      desc_for: "Troca de experiências sobre carreira, estudos e tecnologia.",
      capa_for: "https://example.com/forum-tecnologia.jpg",
      id_mod: modJulia.id_mod,
      id_usr_criadora: larissa.id_usr
    },

    (data) => prisma.forum.findFirst({
      where: {
        titulo_for: data.titulo_for,
        id_usr_criadora: data.id_usr_criadora
      }
    }),

    (data) => prisma.forum.create({ data })
  );

  // =========================================================
  // 9. USUÁRIAS X FÓRUNS
  // =========================================================

  await garantirRelacionamentos(
    [
      { id_for: forumAmizades.id_for, id_usr: bia.id_usr },
      { id_for: forumAmizades.id_for, id_usr: camila.id_usr },
      { id_for: forumAmizades.id_for, id_usr: mariana.id_usr },

      { id_for: forumCarreira.id_for, id_usr: bia.id_usr },
      { id_for: forumCarreira.id_for, id_usr: larissa.id_usr },
      { id_for: forumCarreira.id_for, id_usr: sofia.id_usr }
    ],

    (dados) => prisma.usuaria_forum.findFirst({
      where: {
        id_for: dados.id_for,
        id_usr: dados.id_usr
      }
    }),

    (dados) => prisma.usuaria_forum.create({
      data: dados
    })
  );

  // =========================================================
  // 10. POSTAGENS
  // =========================================================

  const postBia = await obterOuCriar(
    {
      cont_post:
        "Alguém de São Paulo procurando companhia para estudar e tomar um café?",
      id_usr: bia.id_usr,
      id_for: forumAmizades.id_for
    },

    (data) => prisma.postagem.findFirst({
      where: {
        id_usr: data.id_usr,
        id_for: data.id_for,
        cont_post: data.cont_post
      }
    }),

    (data) => prisma.postagem.create({ data })
  );

  const postCamila = await obterOuCriar(
    {
      cont_post:
        "Estou procurando novas amigas que também gostem de livros e música ",
      img_post: "https://example.com/post-camila.jpg",
      id_usr: camila.id_usr,
      id_for: forumAmizades.id_for
    },

    (data) => prisma.postagem.findFirst({
      where: {
        id_usr: data.id_usr,
        id_for: data.id_for,
        cont_post: data.cont_post
      }
    }),

    (data) => prisma.postagem.create({ data })
  );

  const postLarissa = await obterOuCriar(
    {
      cont_post:
        "Comecei a estudar programação recentemente. Quais dicas vocês dariam para quem está começando?",
      id_usr: larissa.id_usr,
      id_for: forumCarreira.id_for
    },

    (data) => prisma.postagem.findFirst({
      where: {
        id_usr: data.id_usr,
        id_for: data.id_for,
        cont_post: data.cont_post
      }
    }),

    (data) => prisma.postagem.create({ data })
  );

  // =========================================================
  // 11. CONTEÚDOS GRATUITOS
  // =========================================================

  const conteudo1 = await obterOuCriar(
    {
      titulo_cont: "Como construir uma rede de apoio",
      desc_cont:
        "Dicas práticas para fortalecer vínculos e criar relações saudáveis.",
      mat_text_content:
        "Construir uma rede de apoio envolve reciprocidade, confiança, comunicação e respeito aos limites de cada pessoa.",
      duracao_cont: 8,
      data_pub: new Date("2026-10-01"),
      id_mod: modAna.id_mod
    },

    (data) => prisma.conteudo.findFirst({
      where: { titulo_cont: data.titulo_cont }
    }),

    (data) => prisma.conteudo.create({ data })
  );

  const conteudo2 = await obterOuCriar(
    {
      titulo_cont: "Mulheres e carreira em tecnologia",
      desc_cont:
        "Introdução sobre estudos, carreira e desenvolvimento profissional.",
      mat_text_content:
        "Explorar comunidades, projetos pessoais e grupos de estudo pode ajudar no desenvolvimento profissional e na criação de conexões.",
      duracao_cont: 12,
      data_pub: new Date("2026-10-03"),
      id_mod: modJulia.id_mod
    },

    (data) => prisma.conteudo.findFirst({
      where: { titulo_cont: data.titulo_cont }
    }),

    (data) => prisma.conteudo.create({ data })
  );

  // =========================================================
  // 12. CONTEÚDOS X INTERESSES
  // =========================================================

  await garantirRelacionamentos(
    [
      {
        id_cont: conteudo1.id_cont,
        id_intr: interesseAmizade.id_intr
      },
      {
        id_cont: conteudo1.id_cont,
        id_intr: interesseBemEstar.id_intr
      },
      {
        id_cont: conteudo2.id_cont,
        id_intr: interesseTecnologia.id_intr
      },
      {
        id_cont: conteudo2.id_cont,
        id_intr: interesseCarreira.id_intr
      }
    ],

    (dados) => prisma.conteudo_interesses.findFirst({
      where: {
        id_cont: dados.id_cont,
        id_intr: dados.id_intr
      }
    }),

    (dados) => prisma.conteudo_interesses.create({
      data: dados
    })
  );

  // =========================================================
  // 13. PROGRESSO DAS USUÁRIAS
  // =========================================================

  await garantirRelacionamentos(
    [
      {
        id_usr: bia.id_usr,
        id_cont: conteudo1.id_cont,
        progresso_cont: 100
      },
      {
        id_usr: camila.id_usr,
        id_cont: conteudo1.id_cont,
        progresso_cont: 45.5
      },
      {
        id_usr: larissa.id_usr,
        id_cont: conteudo2.id_cont,
        progresso_cont: 80
      }
    ],

    (dados) => prisma.usuaria_conteudo.findFirst({
      where: {
        id_usr: dados.id_usr,
        id_cont: dados.id_cont
      }
    }),

    (dados) => prisma.usuaria_conteudo.create({
      data: dados
    })
  );

  // =========================================================
  // 14. CONTEÚDOS PRO
  // =========================================================

  const conteudoPro1 = await obterOuCriar(
    {
      titulo_cont_pro: "Guia de networking para mulheres",
      desc_cont_pro:
        "Material exclusivo com estratégias para ampliar sua rede profissional.",
      mat_text_cont_pro:
        "Defina objetivos, participe de comunidades e mantenha contato com pessoas que compartilham interesses profissionais.",
      anexos_cont_pro: 1,
      duracao_cont_pro: 20n,
      data_pub_cont_pro: new Date("2026-10-05T10:00:00")
    },

    (data) => prisma.conteudo_pro.findFirst({
      where: {
        titulo_cont_pro: data.titulo_cont_pro
      }
    }),

    (data) => prisma.conteudo_pro.create({ data })
  );

  const conteudoPro2 = await obterOuCriar(
    {
      titulo_cont_pro: "Autoconfiança e desenvolvimento pessoal",
      desc_cont_pro:
        "Conteúdo exclusivo sobre confiança, limites e desenvolvimento pessoal.",
      mat_text_cont_pro:
        "Reconhecer conquistas, estabelecer limites e buscar apoio são práticas importantes para o desenvolvimento pessoal.",
      anexos_cont_pro: 0,
      duracao_cont_pro: 15n,
      data_pub_cont_pro: new Date("2026-10-06T14:00:00")
    },

    (data) => prisma.conteudo_pro.findFirst({
      where: {
        titulo_cont_pro: data.titulo_cont_pro
      }
    }),

    (data) => prisma.conteudo_pro.create({ data })
  );

  // =========================================================
  // 15. USUÁRIAS X CONTEÚDOS PRO
  // =========================================================

  await garantirRelacionamentos(
    [
      {
        id_usr: bia.id_usr,
        id_cont_pro: conteudoPro1.id_cont_pro
      },
      {
        id_usr: mariana.id_usr,
        id_cont_pro: conteudoPro1.id_cont_pro
      },
      {
        id_usr: mariana.id_usr,
        id_cont_pro: conteudoPro2.id_cont_pro
      }
    ],

    (dados) => prisma.usuaria_conteudo_pro.findFirst({
      where: {
        id_usr: dados.id_usr,
        id_cont_pro: dados.id_cont_pro
      }
    }),

    (dados) => prisma.usuaria_conteudo_pro.create({
      data: dados
    })
  );

  // =========================================================
  // 16. DENÚNCIAS
  // =========================================================

  const denunciaUsuario = await obterOuCriar(
    {
      motivo_den: "Comportamento inadequado no fórum.",
      status: "PENDENTE",
      id_mod: modAna.id_mod,
      id_usr_denunciante: camila.id_usr
    },

    (data) => prisma.denuncia.findFirst({
      where: {
        motivo_den: data.motivo_den,
        id_usr_denunciante: data.id_usr_denunciante
      }
    }),

    (data) => prisma.denuncia.create({ data })
  );

  await obterOuCriar(
    {
      id_den: denunciaUsuario.id_den,
      id_usr_denunciada: sofia.id_usr
    },

    (data) => prisma.denuncia_usuaria.findFirst({
      where: {
        id_den: data.id_den,
        id_usr_denunciada: data.id_usr_denunciada
      }
    }),

    (data) => prisma.denuncia_usuaria.create({ data })
  );

  const denunciaPost = await obterOuCriar(
    {
      motivo_den: "Postagem considerada ofensiva.",
      status: "EM_ANALISE",
      id_mod: modJulia.id_mod,
      id_usr_denunciante: mariana.id_usr
    },

    (data) => prisma.denuncia.findFirst({
      where: {
        motivo_den: data.motivo_den,
        id_usr_denunciante: data.id_usr_denunciante
      }
    }),

    (data) => prisma.denuncia.create({ data })
  );

  await obterOuCriar(
    {
      id_den: denunciaPost.id_den,
      id_post: postLarissa.id_post
    },

    (data) => prisma.denuncia_postagem.findFirst({
      where: {
        id_den: data.id_den,
        id_post: data.id_post
      }
    }),

    (data) => prisma.denuncia_postagem.create({ data })
  );

  const denunciaMensagem = await obterOuCriar(
    {
      motivo_den: "Mensagem enviada para teste do fluxo de denúncia.",
      status: "RESOLVIDA",
      id_mod: modAna.id_mod,
      id_usr_denunciante: camila.id_usr
    },

    (data) => prisma.denuncia.findFirst({
      where: {
        motivo_den: data.motivo_den,
        id_usr_denunciante: data.id_usr_denunciante
      }
    }),

    (data) => prisma.denuncia.create({ data })
  );

  await obterOuCriar(
    {
      id_den: denunciaMensagem.id_den,
      id_msg: msg3.id_msg
    },

    (data) => prisma.denuncia_mensagem.findFirst({
      where: {
        id_den: data.id_den,
        id_msg: data.id_msg
      }
    }),

    (data) => prisma.denuncia_mensagem.create({ data })
  );

  // =========================================================
  // 17. RELATÓRIOS DE MODERAÇÃO
  // =========================================================

  await garantirRelacionamentos(
    [
      {
        id_mod: modAna.id_mod,
        acao: "ANALISE_DENUNCIA",
        dt_acao: new Date("2026-10-07T09:30:00"),
        desc: "Análise inicial de denúncia de usuária."
      },
      {
        id_mod: modJulia.id_mod,
        acao: "REVISAO_POSTAGEM",
        dt_acao: new Date("2026-10-07T11:00:00"),
        desc: "Postagem enviada para análise da moderação."
      }
    ],

    (dados) => prisma.relatorio_moderacao.findFirst({
      where: {
        id_mod: dados.id_mod,
        acao: dados.acao,
        dt_acao: dados.dt_acao
      }
    }),

    (dados) => prisma.relatorio_moderacao.create({
      data: dados
    })
  );

  // =========================================================
  // FINALIZAÇÃO
  // =========================================================

  console.log("Seed concluído com sucesso!");
  console.log("");

  console.log("Usuárias de teste:");
  console.log("  beatriz@constella.dev");
  console.log("  camila@constella.dev");
  console.log("  larissa@constella.dev");
  console.log("  mariana@constella.dev");
  console.log("  sofia@constella.dev");

  console.log("");
  console.log("Senha de teste para contas recém-criadas: Senha@123");

  console.log("");
  console.log(`Mensagem de referência: ${msg1.id_msg.toString()}`);
  console.log(`Postagem de referência: ${postBia.id_post.toString()}`);
  console.log(`Postagem de referência: ${postCamila.id_post.toString()}`);
}

// =========================================================
// EXECUÇÃO
// =========================================================

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
