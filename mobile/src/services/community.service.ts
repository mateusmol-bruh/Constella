import { api, signalResourceChange } from './api';
import type { Connection, Content, Conversation, Forum, Interest, Message, Person, Post, Profile } from '../types/models';

interface InterestDTO { id_intr: string; nome_intr: string }
interface ProfileDTO { id_usr: string; nome_usr: string; email_usr: string; foto_usr: string | null; apresentacao?: string | null; onboarding_concluido?: boolean | null; interesses?: InterestDTO[] }
const interest = (item: InterestDTO): Interest => ({ id: item.id_intr, nome: item.nome_intr });
const profile = (item: ProfileDTO): Profile => ({ id: item.id_usr, nome: item.nome_usr, email: item.email_usr, foto: item.foto_usr, apresentacao: item.apresentacao ?? null, onboarding_concluido: typeof item.onboarding_concluido === 'boolean' ? item.onboarding_concluido : null, interesses: (item.interesses ?? []).map(interest) });
const path = (id: string) => encodeURIComponent(id);

export const communityService = {
  async profile() { return profile((await api.get<ProfileDTO>('/api/perfil')).data); },
  async editProfile(dados: { nome: string; email: string; apresentacao?: string; foto?: string | null }) {
    await api.put('/api/perfil', dados);
    // PUT retorna apenas os campos alterados; GET inclui os interesses da conta.
    return communityService.profile();
  },
  async interests() { return (await api.get<InterestDTO[]>('/api/interesses')).data.map(interest); },
  async myInterests() { return (await api.get<{ interesses: InterestDTO[] }>('/api/interesses/meus')).data.interesses.map(interest); },
  async saveInterests(ids: string[]) { await api.put('/api/interesses/meus', { interesses: ids }); },
  async recommendedPeople(): Promise<Person[]> {
    const { data } = await api.get<{ recomendacoes: Array<{ id: string; nome: string; foto?: string | null; interesses_em_comum: Interest[] }> }>('/api/recomendacoes/usuarios');
    return data.recomendacoes.map(item => ({ ...item, interesses: item.interesses_em_comum }));
  },
  async recommendedForums(): Promise<Forum[]> {
    const { data } = await api.get<{ recomendacoes: Array<Omit<Forum, 'id_for'> & { id: string }> }>('/api/recomendacoes/foruns');
    return data.recomendacoes.map(item => ({ ...item, id_for: item.id }));
  },
  async people(busca?: string) { return (await api.get<{ usuarias: Person[] }>('/api/usuarios', { params: { busca: busca?.trim() || undefined } })).data.usuarias; },
  async person(id: string) { return (await api.get<{ usuaria: Person }>(`/api/usuarios/${path(id)}`)).data.usuaria; },
  async connect(id: string) { await api.post(`/api/conexoes/${path(id)}`); signalResourceChange(); },
  async connections() { return (await api.get<{ conexoes: Connection[] }>('/api/conexoes')).data.conexoes; },
  async received() { return (await api.get<{ solicitacoes: Connection[] }>('/api/conexoes/recebidas')).data.solicitacoes; },
  async sent() { return (await api.get<{ solicitacoes: Connection[] }>('/api/conexoes/enviadas')).data.solicitacoes; },
  async respond(id: string, accept: boolean) { await api.patch(`/api/conexoes/${path(id)}/${accept ? 'aceitar' : 'recusar'}`); signalResourceChange(); },
  async conversations() { return (await api.get<{ chats: Conversation[] }>('/api/chats')).data.chats; },
  async startChat(id: string) { return (await api.post<{ chat: Conversation }>('/api/chats', { id_destinataria: id })).data.chat; },
  async messages(id: string, pagina = 1) {
    return (await api.get<{ mensagens: Message[] }>(`/api/chats/${path(id)}/mensagens`, { params: { pagina, limite: 50 } })).data.mensagens;
  },
  async sendMessage(id: string, conteudo: string) {
    return (await api.post<{ dados: Message }>(`/api/chats/${path(id)}/mensagens`, { conteudo })).data.dados;
  },
  async forums() { return (await api.get<{ foruns: Forum[] }>('/api/foruns')).data.foruns; },
  async forum(id: string) { return (await api.get<{ forum: Forum }>(`/api/foruns/${path(id)}`)).data.forum; },
  async joinForum(id: string) { await api.post(`/api/foruns/${path(id)}/entrar`); },
  async createForum(dados: { titulo: string; descricao: string; capa: string | null }) {
    return (await api.post<{ forum: Forum }>('/api/foruns', dados)).data.forum;
  },
  async posts(id: string) { return (await api.get<{ postagens: Post[] }>(`/api/foruns/${path(id)}/postagens`)).data.postagens.reverse(); },
  async sendPost(id: string, conteudo: string) {
    return (await api.post<{ postagem: Post }>(`/api/foruns/${path(id)}/postagens`, { conteudo })).data.postagem;
  },
  async contents() { return (await api.get<{ conteudos: Content[] }>('/api/conteudos')).data.conteudos; },
  async content(id: string) { return (await api.get<{ conteudo: Content }>(`/api/conteudos/${path(id)}`)).data.conteudo; },
};
export type CommunityRepository = typeof communityService;
