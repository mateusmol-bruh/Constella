import type { CommunityRepository } from '../../src/services/community.service';
import type { Connection, Content, Conversation, Forum, Message, Person, Post, Profile } from '../../src/types/models';

// Fixture exclusiva dos testes. Não é importada pelo aplicativo.
export function createDemoRepository(): CommunityRepository {
  const interests = ['Comidas', 'Músicas', 'Parque', 'Jogos', 'Filmes', 'Livros', 'Esportes', 'Viagem', 'Séries', 'Outro']
    .map((nome, index) => ({ id: String(index + 1), nome }));
  let profile: Profile = { id: 'demo', nome: 'Lara', email: 'lara@exemplo.com', interesses: [], apresentacao: '', onboarding_concluido: false };
  const people: Person[] = ['Carol', 'Carla', 'Júlia', 'Laura', 'Sofia', 'Amanda', 'Hadassa', 'Maria']
    .map((nome, index) => ({ id: String(index + 1), nome, interesses: [interests[index % 10], interests[(index + 4) % 10]] }));
  let connections: Connection[] = [
    { id_conexao: 'c1', id_user_solicit: 'demo', id_user_receb: '6', status_conexao: 'ACEITO', outra_usuaria: { id_usr: '6', nome_usr: 'Amanda', foto_usr: null } },
    { id_conexao: 'c2', id_user_solicit: '2', id_user_receb: 'demo', status_conexao: 'PENDENTE', outra_usuaria: { id_usr: '2', nome_usr: 'Carla', foto_usr: null } },
  ];
  const conversations: Conversation[] = [{ id_chat: 'chat1', dt_inicio: '2026-01-01T12:00:00Z', destinataria: { id: '6', nome: 'Amanda', foto: null } }];
  const messages: Record<string, Message[]> = { chat1: [
    { id_msg: 'm1', id_usr_emissor: 'demo', conteudo: 'Oii miga, tudo bem???', dt_envio: '2026-01-01T12:00:00Z' },
    { id_msg: 'm2', id_usr_emissor: '6', conteudo: 'Oii mi, tudo sim e vc??', dt_envio: '2026-01-01T12:01:00Z' },
    { id_msg: 'm3', id_usr_emissor: 'demo', conteudo: 'Tô bemm também!!', dt_envio: '2026-01-01T12:02:00Z' },
  ] };
  let forums: Forum[] = [
    { id_for: 'f1', titulo: 'Autocuidado & amor próprio', descricao: 'Um espaço para cuidar de você e compartilhar descobertas.', capa: null, participando: true, quantidade_membros: 12 },
    { id_for: 'f2', titulo: 'Girls Party', descricao: 'Se quiser curtir muito, entre aqui!', capa: null, participando: false, quantidade_membros: 8 },
    { id_for: 'f3', titulo: 'Dicas de segurança', descricao: 'Vamos construir uma comunidade mais acolhedora.', capa: null, participando: true, quantidade_membros: 21 },
  ];
  const posts: Record<string, Post[]> = { f1: [
    { id_post: 'p1', conteudo: 'Amigas, o que é bom pra pele?', imagem: null, dt_post: '2026-01-01T12:00:00Z', autora: { id: 'demo', nome: 'Lara', foto: null } },
    { id_post: 'p2', conteudo: 'Quero saber também!', imagem: null, dt_post: '2026-01-01T12:01:00Z', autora: { id: '6', nome: 'Amanda', foto: null } },
  ] };
  const contents: Content[] = [
    { id: 'ct1', titulo: 'Moda e estilo', descricao: 'Encontre seu jeito de brilhar.', material: 'Este é um conteúdo de exemplo da prévia do Constella.\n\nSeu estilo pode ser uma maneira de se expressar e experimentar. Escolha o que faz você se sentir à vontade e compartilhe suas descobertas com a comunidade.', duracao: 5, interesses: [interests[1]] },
    { id: 'ct2', titulo: 'Viagens e aventuras', descricao: 'Novos lugares, novas histórias.', material: 'Conteúdo de exemplo. Planeje momentos para conhecer lugares, registrar memórias e compartilhar experiências com suas amigas.', duracao: 8, interesses: [interests[7]] },
    { id: 'ct3', titulo: 'Estudo e carreira', descricao: 'Venha estudar com a gente!', material: 'Conteúdo de exemplo. Troque ideias sobre estudos e carreira com outras mulheres da comunidade.', duracao: 6, interesses: [interests[5]] },
  ];
  let counter = 0;
  const next = () => 'local-' + (++counter);
  const findPerson = (id: string): Person => {
    const person = people.find(item => item.id === id);
    if (!person) throw new Error('Pessoa não encontrada na prévia.');
    const connection = connections.find(item => item.id_user_solicit === id || item.id_user_receb === id);
    return { ...person, conexao: connection ? { id: connection.id_conexao, status: connection.status_conexao, enviada_por_mim: connection.id_user_solicit === 'demo' } : null };
  };
  return {
    profile: async () => ({ ...profile }),
    editProfile: async data => (profile = { ...profile, ...data }),
    interests: async () => [...interests],
    myInterests: async () => [...profile.interesses],
    saveInterests: async ids => { profile = { ...profile, interesses: interests.filter(item => ids.includes(item.id)) }; },
    recommendedPeople: async () => people.slice(0, 3),
    recommendedForums: async () => [...forums],
    people: async () => people.map(item => findPerson(item.id)),
    person: async id => findPerson(id),
    connect: async id => {
      const person = findPerson(id);
      if (person.conexao) throw new Error('Já existe uma solicitação.');
      connections.push({ id_conexao: next(), id_user_solicit: 'demo', id_user_receb: id, status_conexao: 'PENDENTE', outra_usuaria: { id_usr: id, nome_usr: person.nome, foto_usr: null } });
    },
    connections: async () => connections.filter(item => item.status_conexao === 'ACEITO'),
    received: async () => connections.filter(item => item.status_conexao === 'PENDENTE' && item.id_user_receb === 'demo'),
    sent: async () => connections.filter(item => item.status_conexao === 'PENDENTE' && item.id_user_solicit === 'demo'),
    respond: async (id, accept) => { connections = connections.map(item => item.id_conexao === id ? { ...item, status_conexao: accept ? 'ACEITO' : 'RECUSADO' } : item); },
    conversations: async () => [...conversations],
    startChat: async id => {
      const existing = conversations.find(item => item.destinataria?.id === id);
      if (existing) return existing;
      const person = findPerson(id);
      if (person.conexao?.status !== 'ACEITO') throw new Error('A conexão precisa ser aceita.');
      const chat = { id_chat: next(), dt_inicio: new Date().toISOString(), destinataria: { id, nome: person.nome, foto: null } };
      conversations.push(chat); return chat;
    },
    messages: async (id, pagina = 1) => pagina === 1 ? [...(messages[id] ?? [])] : [],
    sendMessage: async (id, conteudo) => {
      const message = { id_msg: next(), id_usr_emissor: 'demo', conteudo, dt_envio: new Date().toISOString() };
      messages[id] = [...(messages[id] ?? []), message]; return message;
    },
    forums: async () => [...forums],
    forum: async id => { const forum = forums.find(item => item.id_for === id); if (!forum) throw new Error('Fórum ausente.'); return forum; },
    joinForum: async id => { forums = forums.map(item => item.id_for === id ? { ...item, participando: true, quantidade_membros: (item.quantidade_membros ?? 0) + 1 } : item); },
    createForum: async data => { const forum = { ...data, id_for: next(), participando: true, quantidade_membros: 1 }; forums = [forum, ...forums]; return forum; },
    posts: async id => [...(posts[id] ?? [])],
    sendPost: async (id, conteudo) => {
      const post = { id_post: next(), conteudo, imagem: null, dt_post: new Date().toISOString(), autora: { id: 'demo', nome: profile.nome, foto: null } };
      posts[id] = [...(posts[id] ?? []), post]; return post;
    },
    contents: async () => [...contents],
    content: async id => { const content = contents.find(item => item.id === id); if (!content) throw new Error('Conteúdo ausente.'); return content; },
  };
}
