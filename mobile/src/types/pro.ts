export type SubscriptionState = 'inativa' | 'pendente_validacao' | 'ativa' | 'expirada' | 'cancelada';

export interface ProStatus {
  pro: boolean;
  ativo: boolean;
  status: SubscriptionState;
  registro_legado: boolean;
  assinatura: { id: string; expira_em?: string | null } | null;
  plano: { nome: string; preco_formatado: string | null; periodicidade: string | null } | null;
  provedor_disponivel: boolean;
  motivo: string | null;
  mensagem: string;
  beneficios: string[];
}

export interface ProCatalogItem {
  id: string;
  titulo: string;
  descricao: string | null;
  duracao: string | null;
  data_publicacao: string;
}

export interface ProContent extends ProCatalogItem {
  material: string | null;
  anexos: number | null;
}
