import axios from 'axios';
import { apiUrl } from './api';
import type { Content, Forum } from '../types/models';
import type { ProCatalogItem } from '../types/pro';

export type PublicContent = Omit<Content, 'material'> & { data_publicacao: string };
export interface PublicProPresentation {
  nome: string; autenticada: false; assinatura: null; provedor_disponivel: false;
  motivo: string; mensagem: string; beneficios: string[]; planos: []; catalogo: ProCatalogItem[];
}

// Mesma origem da API. Este cliente é só de leitura e nunca recebe JWT,
// inclusive quando a apresentação pública é aberta por uma conta autenticada.
export const apiPublic = axios.create({ baseURL: apiUrl, timeout: 15000 });
apiPublic.interceptors.request.use(config => {
  if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) throw new Error('API_NAO_CONFIGURADA');
  if (config.method !== 'get' || !config.url?.startsWith('/api/publico/')) throw new Error('CONSULTA_PUBLICA_INVALIDA');
  config.headers.delete('Authorization');
  return config;
});

export const publicService = {
  async contents(signal?: AbortSignal) {
    return (await apiPublic.get<PublicContent[]>('/api/publico/conteudos', { signal })).data;
  },
  async content(id: string, signal?: AbortSignal) {
    return (await apiPublic.get<Content>(`/api/publico/conteudos/${encodeURIComponent(id)}`, { signal })).data;
  },
  async forums(signal?: AbortSignal) {
    return (await apiPublic.get<Forum[]>('/api/publico/foruns', { signal })).data;
  },
  async pro(signal?: AbortSignal) {
    return (await apiPublic.get<PublicProPresentation>('/api/publico/pro', { signal })).data;
  },
};
