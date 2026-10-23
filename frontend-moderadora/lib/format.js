export function formatDate(date) {
  if (!date) return 'Data não disponível';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Data não disponível';
  return new Intl.DateTimeFormat('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric'}).format(parsed);
}
export function statusLabel(status) {
  return ({ PENDENTE:'Pendente', EM_ANALISE:'Em análise', RESOLVIDA:'Resolvida', REJEITADA:'Rejeitada' })[status]||status;
}
