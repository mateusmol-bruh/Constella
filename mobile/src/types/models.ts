export interface Interest { id: string; nome: string }
export interface Person {
  id: string; nome: string; foto?: string | null; interesses: Interest[];
  apresentacao?: string | null; bloqueada?: boolean; interacao_bloqueada?: boolean;
  conexao?: { id: string; status: string; enviada_por_mim: boolean } | null;
}
export interface Profile extends Person { email: string; apresentacao?: string | null; onboarding_concluido?: boolean | null }
export interface AuthUser { id: string; nome: string; email: string; onboarding_concluido?: boolean | null; apresentacao?: string | null }
export interface AuthResponse { token: string; usuaria: AuthUser }
export interface Connection {
  id_conexao: string; id_user_solicit: string; id_user_receb: string;
  status_conexao: string;
  outra_usuaria?: { id_usr: string; nome_usr: string; foto_usr: string | null } | null;
}
export interface Conversation {
  id_chat: string; dt_inicio: string; nao_lidas?: number; ultima_mensagem?: Message | null; interacao_bloqueada?: boolean;
  destinataria?: { id: string; nome: string; foto: string | null } | null;
}
export interface Message { id_msg: string; id_usr_emissor: string; conteudo: string; imagem?: string | null; dt_envio: string }
export interface Forum {
  id_for: string; titulo: string; descricao: string | null; capa: string | null;
  nao_lidas?: number; participando?: boolean; quantidade_membros?: number;
  criadora?: { id: string; nome: string; foto?: string | null };
}
export interface Post {
  id_post: string; conteudo: string; imagem: string | null; dt_post: string;
  autora?: { id: string; nome: string; foto: string | null };
}
export interface Content {
  id: string; titulo: string; descricao: string | null; material: string | null;
  duracao: number | null; interesses: Interest[];
}
