const { verificarJWT, validarSessao } = require('../services/sessao.service');
async function autenticar(req, res, next) {
  const match = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ mensagem: 'Token não informado ou inválido.' });
  let payload;
  try {
    payload = verificarJWT(match[1]);
  } catch {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }
  if (payload.tipo !== 'usuaria')
    return res.status(403).json({ mensagem: 'Acesso não autorizado.' });
  try {
    req.sessaoId = await validarSessao(payload);
    req.usuarioId = payload.sub;
    return next();
  } catch (error) {
    return next(error);
  }
}
module.exports = autenticar;
