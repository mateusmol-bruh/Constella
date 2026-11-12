export type SubscriptionState = 'inativa' | 'pendente_validacao' | 'ativa' | 'expirada' | 'cancelada';

export interface ProStatus {
  pro: boolean;
  demonstracao?: boolean;
  demonstracao_disponivel?: boolean;
  demonstracao_expira_em?: string;
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
  capa?: string | null; categoria?: string | null; atualizado_em?: string;
  id: string;
  titulo: string;
  descricao: string | null;
  duracao: string | null;
  data_publicacao: string;
}

export interface ProMediaFile {id:string;tipo:'imagem'|'video';nome:string;mime:string;tamanho:number;largura:number;altura:number;duracao:number|null;url:string;}
export interface ProContent extends ProCatalogItem {
  imagem?: ProMediaFile|null; video?: ProMediaFile|null;
  material: string | null;
  anexos: number | null;
}
