/**
 * Confirmação do histórico da moderadora.
 * A fonte de verdade é GET /api/moderacao/relatorios.
 * Registros locais são apenas avisos de operações cuja auditoria AINDA não foi
 * confirmada pelo servidor. Nunca são apresentados como registros do banco.
 */
const PREFIX = 'constella-moderadora-auditoria-pendente-v1:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_DIFFERENCE_MS = 5 * 60 * 1000;

function currentStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function keyFor(session) {
  const id = session?.moderadora?.id;
  return id != null && !session?.demo ? PREFIX + String(id) : null;
}

function loadPending(session) {
  const storage = currentStorage();
  const key = keyFor(session);
  if (!storage || !key) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item) =>
      item && item.kind === 'denuncia-status' &&
      Number.isFinite(Date.parse(item.data)) &&
      now - Date.parse(item.data) >= -MAX_CLOCK_DIFFERENCE_MS &&
      now - Date.parse(item.data) < MAX_AGE_MS
    );
  } catch {
    return [];
  }
}

function savePending(session, items) {
  const storage = currentStorage();
  const key = keyFor(session);
  if (!storage || !key) return;
  try { storage.setItem(key, JSON.stringify(items.slice(-30))); }
  catch { /* Armazenamento bloqueado/lotado: nunca impede a atualização da denúncia. */ }
}

export function rememberStatusChange(session, denunciaId, status, date = new Date()) {
  const item = {
    id: `pendente-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'denuncia-status',
    denunciaId: String(denunciaId),
    status: String(status),
    data: date.toISOString(),
  };
  savePending(session, [...loadPending(session), item]);
  return item;
}

function isMatchingServerAction(action, pending) {
  if (action.acao !== 'ALTERACAO_STATUS_DENUNCIA') return false;
  const description = String(action.descricao || '').toUpperCase();
  const match = description.match(/DEN[ÚU]NCIA\s+(\d+)\s+ALTERADA\s+PARA\s+(PENDENTE|EM_ANALISE|RESOLVIDA|REJEITADA)/);
  if (!match || match[1] !== pending.denunciaId || match[2] !== pending.status) return false;
  const when = Date.parse(action.data);
  const requestedAt = Date.parse(pending.data);
  return Number.isFinite(when) && Math.abs(when - requestedAt) <= MAX_CLOCK_DIFFERENCE_MS;
}

/** Insere somente avisos locais quando a API não comprova a auditoria. */
export function reconcileAuditHistory(session, serverReports) {
  const reports = Array.isArray(serverReports) ? serverReports : [];
  const pending = loadPending(session);
  const unmatched = pending.filter((item) => !reports.some((r) => isMatchingServerAction(r, item)));
  if (unmatched.length !== pending.length) savePending(session, unmatched);
  const warnings = unmatched.map((item) => ({
    id: item.id,
    acao: 'ALTERACAO_STATUS_DENUNCIA',
    descricao: `Denúncia ${item.denunciaId} alterada para ${item.status}. O registro da ação ainda NÃO foi confirmado pela API de relatórios.`,
    data: item.data,
    auditPending: true,
    denunciaId: item.denunciaId,
    status: item.status,
  }));
  return [...reports, ...warnings].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
}

export function wasStatusAuditConfirmed(records, attempt) {
  // Não basta não existir aviso local: sessionStorage pode estar desabilitado.
  // Confirmação só ocorre quando há evidência positiva retornada pela API.
  return records.some((record) => !record.auditPending && isMatchingServerAction(record, attempt));
}
