import type { ProStatus } from '../types/pro';

export function proStatusLabel(status: Pick<ProStatus, 'ativo' | 'status'>): string {
  if (status.status === 'ativa') return status.ativo ? 'Assinatura ativa' : 'Acesso aguardando validação';
  if (status.status === 'pendente_validacao') return 'Aguardando validação';
  if (status.status === 'expirada') return 'Assinatura expirada';
  if (status.status === 'cancelada') return status.ativo ? 'Cancelada • acesso ainda vigente' : 'Assinatura cancelada';
  return 'Sem assinatura ativa';
}

// Filtro visual apenas. A autorização do material sempre acontece no backend.
export function hasProAccess(status: Pick<ProStatus, 'ativo' | 'status'>): boolean {
  return status.ativo === true && (status.status === 'ativa' || status.status === 'cancelada');
}
