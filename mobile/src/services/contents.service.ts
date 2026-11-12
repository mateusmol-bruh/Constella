import { api } from './api';
import type { Content } from '../types/models';
import type { RecommendedContent } from '../types/contents';

export const contentsService = {
  async list() { return (await api.get<{ conteudos: Content[] }>('/api/conteudos')).data.conteudos; },
  async detail(id: string) {
    return (await api.get<{ conteudo: Content }>(`/api/conteudos/${encodeURIComponent(id)}`)).data.conteudo;
  },
  async recommended() {
    return (await api.get<{ recomendacoes: RecommendedContent[] }>('/api/recomendacoes/conteudos')).data.recomendacoes;
  },
};
