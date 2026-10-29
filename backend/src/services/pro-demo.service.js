// Demonstração temporária por conta. Nenhuma compra ou assinatura persistida.
const sessions = new Map();
function demoEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.CONSTELLA_PRO_DEMO === 'true';
}
function demoSession(id) {
  const expiry = sessions.get(String(id));
  if (!demoEnabled() || !expiry || expiry <= Date.now()) {
    if (expiry && expiry <= Date.now()) sessions.delete(String(id));
    return null;
  }
  return new Date(expiry).toISOString();
}
function changeDemo(id, active) {
  if (!demoEnabled()) throw Object.assign(new Error('Demonstração PRO desativada no servidor.'), { statusCode:403 });
  if (typeof active !== 'boolean') throw Object.assign(new Error('Informe se deseja ativar a demonstração.'), { statusCode:400 });
  if (active) {
    for (const [key, expiry] of sessions) if (expiry <= Date.now()) sessions.delete(key);
    if (sessions.size >= 1000 && !sessions.has(String(id))) throw Object.assign(new Error('Limite de demonstrações atingido.'), {statusCode:503});
    sessions.set(String(id), Date.now() + 60 * 60 * 1000);
  } else sessions.delete(String(id));
}
module.exports = { demoEnabled, demoSession, changeDemo };
