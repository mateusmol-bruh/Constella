const prisma = require('../config/prisma');
const service = require('./notificacao.service');
const minute = 60000;
const safeCode = code => typeof code === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(code) ? code : 'PushError';

async function expo(path, payload, transport = fetch) {
  const response = await transport(`https://exp.host/--/api/v2/push/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}),
    }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Object.assign(new Error('Push HTTP'), { http: response.status });
  return response.json();
}
async function update(row, data, estado = row.estado) {
  await prisma.notificacao_push.updateMany({ where: { id_push: row.id_push, estado }, data });
}
async function failed(row, code, retry = false) {
  if (code === 'DeviceNotRegistered') await prisma.dispositivo_push.updateMany({ where: { token: row.token, id_usr: row.id_usr }, data: { ativo: false } });
  await update(row, {
    estado: retry && row.tentativas < 5 ? 'PENDENTE' : 'FALHOU', erro: safeCode(code),
    proxima_tentativa: new Date(Date.now() + Math.min(60, 2 ** row.tentativas) * minute),
  }, 'ENVIANDO');
}
async function enviar(row, transport) {
  const claimed = await prisma.notificacao_push.updateMany({ where: { id_push: row.id_push, estado: 'PENDENTE' }, data: { estado: 'ENVIANDO', tentativas: { increment: 1 }, proxima_tentativa: new Date(Date.now() + minute) } });
  if (!claimed.count) return;
  row.tentativas++;
  try {
    if (!await service.permitido(row)) { await update(row, { estado: 'CANCELADA' }, 'ENVIANDO'); return; }
    const tipo = row.dados.tipo;
    const body = tipo === 'chat' ? (row.dados.foto ? 'Você recebeu uma nova foto.' : 'Você recebeu uma nova mensagem.')
      : tipo === 'forum' ? 'Nova publicação em um fórum que você participa.'
      : row.chave.startsWith('aceite:') ? 'Sua solicitação de conexão foi aceita.' : 'Você recebeu uma solicitação de conexão.';
    const response = await expo('send', { to: row.token, title: 'Constella', body, sound: 'default', channelId: 'conversas',
      data: { ...row.dados, evento: row.id_push.toString() } }, transport);
    const ticket = Array.isArray(response.data) ? response.data[0] : response.data;
    if (ticket?.status === 'ok' && typeof ticket.id === 'string') {
      await update(row, { estado: 'AGUARDANDO', ticket: ticket.id, proxima_tentativa: new Date(Date.now() + 15 * minute) }, 'ENVIANDO');
    } else await failed(row, ticket?.details?.error || 'InvalidTicket', ticket?.details?.error === 'MessageRateExceeded');
  } catch (error) {
    if (error.http) await failed(row, `HTTP_${error.http}`, error.http === 429 || error.http >= 500);
    else {
      // Sem resposta, não se sabe se Expo aceitou o envio. Não reenviar cegamente e duplicar.
      await update(row, { estado: 'INCERTA', erro: 'RespostaIndeterminada' }, 'ENVIANDO');
    }
  }
}
async function processar(transport = fetch) {
  if (!service.enabled()) return;
  // Um processo interrompido pode ter enviado antes de cair. Não duplicar após reinício.
  await prisma.notificacao_push.updateMany({ where: { estado: 'ENVIANDO', proxima_tentativa: { lt: new Date() } }, data: { estado: 'INCERTA', erro: 'EnvioInterrompido' } });
  const pending = await prisma.notificacao_push.findMany({ where: { estado: 'PENDENTE', proxima_tentativa: { lte: new Date() } }, include: { dispositivo: true }, orderBy: { id_push: 'asc' }, take: 20 });
  for (const row of pending) await enviar(row, transport);
  const waiting = await prisma.notificacao_push.findMany({ where: { estado: 'AGUARDANDO', proxima_tentativa: { lte: new Date() } }, take: 100 });
  if (!waiting.length) return;
  let receipts;
  try { receipts = (await expo('getReceipts', { ids: waiting.map(row => row.ticket) }, transport)).data || {}; }
  catch { return; }
  for (const row of waiting) {
    const receipt = receipts[row.ticket];
    if (!receipt) {
      await update(row, { estado: Date.now() - row.criado_em.getTime() > 24 * 60 * minute ? 'INCERTA' : 'AGUARDANDO', proxima_tentativa: new Date(Date.now() + 15 * minute) });
      continue;
    }
    const code = receipt.details?.error;
    if (code === 'DeviceNotRegistered') await prisma.dispositivo_push.updateMany({ where: { token: row.token, id_usr: row.id_usr }, data: { ativo: false } });
    await update(row, { estado: receipt.status === 'ok' ? 'ACEITA_PROVEDOR' : 'FALHOU', erro: code ? safeCode(code) : null });
  }
}
function iniciar() {
  if (!service.enabled()) return () => {};
  let stopped = false, timer;
  async function tick() {
    try { await processar(); } catch (error) { console.error('Fila push indisponível:', safeCode(error.code)); }
    if (!stopped) { timer = setTimeout(tick, 5000); timer.unref(); }
  }
  void tick();
  return () => { stopped = true; clearTimeout(timer); };
}
module.exports = { iniciar, processar, enviar };
