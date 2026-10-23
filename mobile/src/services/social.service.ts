import axios from 'axios';
import { api } from './api';
import type { Forum, Message, Post } from '../types/models';

export const conversationPageSize = 50;
export type SocialForum = Forum & { criadora?: { id: string; nome: string; foto?: string | null } };
const path = (id: string) => encodeURIComponent(id);

// Fóruns usam postagens; IDs de fórum nunca são usados como IDs de chat.
export const socialService = {
  async forum(id: string, signal?: AbortSignal) {
    return (await api.get<{ forum: SocialForum }>(`/api/foruns/${path(id)}`, { signal })).data.forum;
  },
  async posts(id: string, pagina = 1, signal?: AbortSignal) {
    const { data } = await api.get<{ postagens: Post[] }>(`/api/foruns/${path(id)}/postagens`, {
      params: { pagina, limite: conversationPageSize }, signal,
    });
    return [...data.postagens].reverse();
  },
  async sendPost(id: string, conteudo: string) {
    return (await api.post<{ postagem: Post }>(`/api/foruns/${path(id)}/postagens`, { conteudo })).data.postagem;
  },
  async joinForum(id: string) {
    try { await api.post(`/api/foruns/${path(id)}/entrar`); }
    catch (cause) {
      // Entrar novamente após perda da resposta é seguro: o servidor confirma o vínculo existente.
      if (!axios.isAxiosError(cause) || cause.response?.status !== 409) throw cause;
    }
  },
  async leaveForum(id: string) { await api.delete(`/api/foruns/${path(id)}/sair`); },
  async deletePost(id: string) { await api.delete(`/api/postagens/${path(id)}`); },
  async reportPost(id: string, motivo: string) { await api.post(`/api/denuncias/postagens/${path(id)}`, { motivo }); },
  async messages(id: string, pagina = 1, signal?: AbortSignal) {
    return (await api.get<{ mensagens: Message[] }>(`/api/chats/${path(id)}/mensagens`, {
      params: { pagina, limite: conversationPageSize }, signal,
    })).data.mensagens;
  },
  async sendMessage(id: string, conteudo: string) {
    return (await api.post<{ dados: Message }>(`/api/chats/${path(id)}/mensagens`, { conteudo })).data.dados;
  },
  async deleteMessage(chatId: string, messageId: string) {
    await api.delete(`/api/chats/${path(chatId)}/mensagens/${path(messageId)}`);
  },
  async reportMessage(id: string, motivo: string) { await api.post(`/api/denuncias/mensagens/${path(id)}`, { motivo }); },
};
