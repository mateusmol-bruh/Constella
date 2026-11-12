function invalid(field, detail) {
  const error = new Error(`Configuração inválida: ${field}. ${detail}`);
  error.code = 'RUNTIME_CONFIG_INVALID';
  throw error;
}

function readRuntimeConfig(env = process.env) {
  const nodeEnv = (env.NODE_ENV || 'development').trim();
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    invalid('NODE_ENV', 'Use development, test ou production.');
  }
  const production = nodeEnv === 'production';
  const portText = env.PORT === undefined ? '3000' : String(env.PORT).trim();
  if (!/^\d{1,5}$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    invalid('PORT', 'Informe um inteiro entre 1 e 65535.');
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  let parsedDatabase;
  try { parsedDatabase = new URL(databaseUrl); }
  catch { invalid('DATABASE_URL', 'Configure uma URL PostgreSQL válida no ambiente do servidor.'); }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabase.protocol) ||
      !parsedDatabase.hostname || !parsedDatabase.pathname || parsedDatabase.pathname === '/') {
    invalid('DATABASE_URL', 'Configure uma URL PostgreSQL com host e nome do banco.');
  }
  if (production) {
    let credentials;
    try { credentials = [parsedDatabase.username, parsedDatabase.password].map(decodeURIComponent); }
    catch { invalid('DATABASE_URL', 'Credenciais da URL estão malformadas.'); }
    if (credentials.some(value => /^(?:USUARIO|SENHA|USER|PASSWORD|CHANGEME|REPLACE_ME|BUILD_ONLY)$/i.test(value)) ||
        /<[^>]+>|\$\{|example\.(?:com|invalid)/i.test(databaseUrl)) {
      invalid('DATABASE_URL', 'Substitua os placeholders pelas credenciais do banco provisionado.');
    }
  }

  const jwtSecret = env.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || !jwtSecret.trim()) {
    invalid('JWT_SECRET', 'Configure o segredo no servidor; nunca no aplicativo.');
  }
  if (production && (Buffer.byteLength(jwtSecret, 'utf8') < 32 || new Set(jwtSecret).size < 8 ||
      /change.?me|replace.?me|your[-_ ]?secret|troque|substitua|<[^>]+>|JWT_SECRET|(?:test|example|exemplo)[-_ ]*secret/i.test(jwtSecret))) {
    invalid('JWT_SECRET', 'Em produção use um segredo aleatório de ao menos 32 bytes, sem placeholders.');
  }

  const corsOrigins = [...new Set((env.CORS_ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean).map(origin => {
    let parsed;
    try { parsed = new URL(origin); }
    catch { invalid('CORS_ALLOWED_ORIGINS', 'Informe origens http/https separadas por vírgulas.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash || (production && parsed.protocol !== 'https:')) {
      invalid('CORS_ALLOWED_ORIGINS', 'Use somente origens sem caminho nem credenciais; em produção exija HTTPS.');
    }
    return parsed.origin;
  }))];
  const trustProxyText = String(env.TRUST_PROXY ?? 'false').trim().toLowerCase();
  if (!['false', '0', '1'].includes(trustProxyText)) {
    invalid('TRUST_PROXY', 'Use false (direto) ou 1 (um proxy confiável). Não aceite cabeçalhos encaminhados arbitrários.');
  }
  return { port: Number(portText), nodeEnv, corsOrigins, trustProxy: trustProxyText === '1' ? 1 : false };
}

module.exports = { readRuntimeConfig };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  try {
    const config = readRuntimeConfig();
    console.log(`Configuração válida: ambiente=${config.nodeEnv}, porta=${config.port}, origens web explícitas=${config.corsOrigins.length}, trust proxy=${config.trustProxy}.`);
  } catch (error) {
    // Somente mensagens de validação controladas; não imprimir URL, segredo ou erro bruto.
    console.error(error.code === 'RUNTIME_CONFIG_INVALID' ? error.message : 'Falha ao verificar a configuração do servidor.');
    process.exitCode = 1;
  }
}
