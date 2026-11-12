const { randomUUID } = require('node:crypto');

function responderErroConversa(res, error, operacao) {
  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({ mensagem: error.message, ...(error.codigo ? { codigo: error.codigo } : {}) });
  }
  if (error.code === 'P2025') return res.status(404).json({ mensagem: 'Registro não encontrado.', codigo: 'CONVERSA_NAO_ENCONTRADA' });
  if (error.code === 'P2003') return res.status(400).json({ mensagem: 'Referência inválida no banco de dados.' });
  if (error.code === 'P2002') return res.status(409).json({ mensagem: 'Já existe um registro com esses dados.' });

  const schema = ['P2021', 'P2022'].includes(error.code);
  const temporary = ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2037', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code);
  const status = schema || temporary ? 503 : 500;
  const referencia = randomUUID();
  // O erro Prisma bruto pode incluir SQL e valores. Mantém apenas código, modelo e locais do stack.
  const locais = String(error.stack || '').split('\n').filter(line => /^\s+at /.test(line)).flatMap(line => {
    const match = /[\\/](src[\\/][\w.\\/-]+\.js):(\d+):(\d+)/.exec(line);
    return match ? [`${match[1].replace(/\\/g, '/')}:${match[2]}:${match[3]}`] : [];
  }).slice(0, 5);
  console.error('Falha em conversa:', JSON.stringify({
    referencia, operacao, status,
    codigo: /^[A-Z][A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'INTERNAL_ERROR',
    modelo: ['mensagem', 'postagem', 'chat', 'forum', 'usuaria_forum'].includes(error.meta?.modelName) ? error.meta.modelName : undefined,
    locais,
  }));
  if (status === 503) res.set('Retry-After', '5');
  return res.status(status).json({
    codigo: schema ? 'CONVERSAS_ATUALIZACAO_PENDENTE' : temporary ? 'CONVERSAS_TEMPORARIAMENTE_INDISPONIVEIS' : 'ERRO_INTERNO_CONVERSA',
    mensagem: schema ? 'As conversas estão temporariamente indisponíveis durante uma atualização. Tente novamente em instantes.'
      : temporary ? 'Não foi possível carregar as conversas agora. Tente novamente em instantes.'
      : 'O servidor encontrou um erro ao processar a conversa. Tente novamente.',
    referencia,
  });
}

module.exports = { responderErroConversa };
