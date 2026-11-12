const { createHmac, timingSafeEqual } = require('node:crypto');
const erro = (message) => Object.assign(new Error(message), { statusCode: 403 });
const cookieName = 'constella_mod';
const options = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api',
  maxAge: 3600000,
});
function definirCookie(res, token) {
  res.cookie(cookieName, token, options());
}
function limparCookie(res) {
  const { maxAge, ...opts } = options();
  res.clearCookie(cookieName, opts);
}
function lerCookie(req) {
  const values = (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.startsWith(cookieName + '='));
  if (values.length !== 1) return null;
  try {
    return decodeURIComponent(values[0].slice(cookieName.length + 1));
  } catch {
    return null;
  }
}
function csrf(token) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update('constella-csrf:' + token)
    .digest('hex');
}
function validarOrigem(req) {
  const value = req.headers.origin;
  if (!value) {
    if (req.headers['sec-fetch-site'] === 'cross-site') throw erro('Origem não autorizada.');
    return;
  }
  const allowed = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production')
    allowed.push('http://localhost:3001', 'http://127.0.0.1:3001');
  if (!allowed.includes(value)) throw erro('Origem não autorizada para o painel.');
}
function validarCsrf(req, token) {
  validarOrigem(req);
  const value = req.headers['x-csrf-token'];
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value) ||
    !timingSafeEqual(Buffer.from(value), Buffer.from(csrf(token)))
  )
    throw erro('Sessão de segurança inválida. Atualize a página e tente novamente.');
}
module.exports = { definirCookie, limparCookie, lerCookie, csrf, validarOrigem, validarCsrf };
