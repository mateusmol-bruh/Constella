const prisma = require("../config/prisma");

const { demoEnabled, demoSession } = require('./pro-demo.service');
function erroHttp(statusCode, mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  return erro;
}

function validarId(valor) {
  const texto = String(valor ?? "");
  if (!/^[1-9]\d*$/.test(texto) || texto.length > 19 || BigInt(texto) > 9223372036854775807n) {
    throw erroHttp(400, "ID inválido.");
  }
  return BigInt(valor);
}

// O modelo legado contém apenas forma de pagamento e valor. Não contém
// transação validada, provedor ou vigência e nunca comprova acesso Pro.
async function buscarStatusAssinatura(idUsuario) {
  const idUsr = validarId(idUsuario);
  const demoExpiry = demoSession(idUsuario);
  if (demoExpiry) {
    const account = await prisma.usuaria.findUnique({ where:{ id_usr:idUsr }, select:{ id_usr:true } });
    if (!account) throw erroHttp(401, 'Entre novamente para acessar a demonstração.');
    return {
      pro:true, ativo:true, status:'ativa', demonstracao:true, demonstracao_disponivel:true,
      demonstracao_expira_em:demoExpiry, registro_legado:false, assinatura:null, plano:null,
      provedor_disponivel:false, motivo:'DEMONSTRACAO_DESENVOLVIMENTO',
      mensagem:'PRO de demonstração: acesso temporário ao catálogo exclusivo, sem cobrança ou assinatura paga. Encerra ao reiniciar o servidor ou após uma hora.',
      beneficios:['Acesso demonstrativo aos conteúdos exclusivos do catálogo Pro.'],
    };
  }
  const registro = await prisma.assinatura.findUnique({
    where: { id_usr: idUsr },
    select: { id_ass: true }
  });

  return {
    pro: false,
    demonstracao: false,
    demonstracao_disponivel: demoEnabled(),
    ativo: false,
    status: registro ? "pendente_validacao" : "inativa",
    registro_legado: Boolean(registro),
    assinatura: null,
    plano: null,
    provedor_disponivel: false,
    motivo: "PROVEDOR_NAO_CONFIGURADO",
    mensagem: registro
      ? "Existe um registro anterior sem comprovação de pagamento. O acesso Pro aguarda validação por um provedor."
      : "As assinaturas Pro ainda não estão disponíveis para contratação.",
    beneficios: ["Acesso a conteúdos exclusivos do catálogo Pro."]
  };
}

function provedorIndisponivel() {
  throw erroHttp(503, "O provedor de assinaturas ainda não foi configurado. Nenhuma cobrança ou alteração de assinatura foi realizada.");
}

async function criarAssinatura(idUsuario) {
  validarId(idUsuario);
  // Não aceitar valor, confirmação de pagamento ou estado enviado pelo cliente.
  // A compra exigirá provedor aprovado e validação de transação no servidor.
  provedorIndisponivel();
}

async function cancelarAssinatura(idUsuario) {
  validarId(idUsuario);
  // Excluir um registro local não cancela uma cobrança no provedor.
  provedorIndisponivel();
}

module.exports = {
  buscarStatusAssinatura,
  criarAssinatura,
  cancelarAssinatura
};
