import axios from 'axios';
import { api, signalResourceChange } from './api';
import type { Conversation, Person, Forum, Message, Post, SendOptions } from '../types/models';

export const conversationPageSize = 50;
export type SocialForum = Forum & { criadora?: { id: string; nome: string; foto?: string | null } };
const path = (id: string) => encodeURIComponent(id);

// Fóruns usam postagens; IDs de fórum nunca são usados como IDs de chat.
export const socialService = {
  async forumLimits() { return (await api.get<{ criados: number; limite: number | null; pode_criar: boolean; pro: boolean }>('/api/foruns/limites')).data; },
  async forumPage(filtro: 'explorar' | 'meus', busca: string, pagina = 1, signal?: AbortSignal) { return (await api.get<{ foruns: Forum[]; pagina: number; tem_mais: boolean }>('/api/foruns', { params: { filtro, busca, pagina, limite: 30 }, signal })).data; },
  async chat(id: string, signal?: AbortSignal) { return (await api.get<{ chat: Conversation }>(`/api/chats/${path(id)}`, { signal })).data.chat; },
  async read(kind: 'chat' | 'forum', id: string, ultima_id: string, signal?: AbortSignal) { await api.post(`/api/${kind === 'chat' ? 'chats' : 'foruns'}/${path(id)}/leitura`, { ultima_id }, { signal }); },
  async forums(filtro: 'explorar' | 'meus', signal?: AbortSignal) { return (await api.get<{ foruns: Forum[] }>('/api/foruns', { params: { filtro }, signal })).data.foruns; },
  async blocked() { return (await api.get<Person[]>('/api/bloqueios')).data; },
  async block(id: string, blocked: boolean) { return (blocked ? await api.post(`/api/bloqueios/${path(id)}`) : await api.delete(`/api/bloqueios/${path(id)}`)).data as { bloqueada: boolean; interacao_bloqueada: boolean }; },
  async forum(id: string, signal?: AbortSignal) {
    return (await api.get<{ forum: SocialForum }>(`/api/foruns/${path(id)}`, { signal })).data.forum;
  },
  async posts(id: string, pagina = 1, signal?: AbortSignal) {
    const { data } = await api.get<{ postagens: Post[] }>(`/api/foruns/${path(id)}/postagens`, {
      params: { pagina, limite: conversationPageSize }, signal,
    });
    return [...data.postagens].reverse();
  },
  async sendPost(id: string, conteudo: string, imagem?: string, options: SendOptions = {}) {
    const result = (await api.post<{ postagem: Post }>(`/api/foruns/${path(id)}/postagens`, { conteudo, ...(imagem ? { imagem } : {}), ...options })).data.postagem;
    signalResourceChange(); return result;
  },
  async joinForum(id: string) {
    try { await api.post(`/api/foruns/${path(id)}/entrar`); }
    catch (cause) {
      // Entrar novamente após perda da resposta é seguro: o servidor confirma o vínculo existente.
      if (!axios.isAxiosError(cause) || cause.response?.status !== 409) throw cause;
    }
  },
  async leaveForum(id: string) { await api.delete(`/api/foruns/${path(id)}/sair`); signalResourceChange(); },
  async deleteForum(id: string) { await api.delete(`/api/foruns/${path(id)}`); },
  async editForum(id: string, dados: { titulo: string; descricao: string; capa: string | null }) {
    return (await api.put<{ forum: SocialForum }>(`/api/foruns/${path(id)}`, dados)).data.forum;
  },
  async reportPerson(id: string, motivo: string) { await api.post(`/api/denuncias/usuarias/${path(id)}`, { motivo }); },
  async deletePost(id: string) { await api.delete(`/api/postagens/${path(id)}`); },
  async reportPost(id: string, motivo: string) { await api.post(`/api/denuncias/postagens/${path(id)}`, { motivo }); },
  async messages(id: string, pagina = 1, signal?: AbortSignal) {
    return (await api.get<{ mensagens: Message[] }>(`/api/chats/${path(id)}/mensagens`, {
      params: { pagina, limite: conversationPageSize }, signal,
    })).data.mensagens;
  },
  async sendMessage(id: string, conteudo: string, imagem?: string, options: SendOptions = {}) {
    const result = (await api.post<{ dados: Message }>(`/api/chats/${path(id)}/mensagens`, { conteudo, ...(imagem ? { imagem } : {}), ...options })).data.dados;
    signalResourceChange(); return result;
  },
  async deleteMessage(chatId: string, messageId: string) {
    await api.delete(`/api/chats/${path(chatId)}/mensagens/${path(messageId)}`);
  },
  async reportMessage(id: string, motivo: string) { await api.post(`/api/denuncias/mensagens/${path(id)}`, { motivo }); },
};
