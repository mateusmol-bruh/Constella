import { api } from './api';
import type { ProCatalogItem, ProContent, ProStatus } from '../types/pro';

// O servidor verifica a assinatura em cada leitura de material exclusivo.
// Não há criação de assinatura nem envio de valor/estado pelo aplicativo.
export const proService = {
  async status() { return (await api.get<ProStatus>('/api/pro')).data; },
  async catalog() { return (await api.get<{ conteudos: ProCatalogItem[] }>('/api/pro/catalogo')).data.conteudos; },
  async content(id: string) {
    return (await api.get<{ conteudo: ProContent }>(`/api/pro/conteudos/${encodeURIComponent(id)}`)).data.conteudo;
  },
};
