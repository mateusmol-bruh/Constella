export const INITIAL_DEMO = {
  denuncias: [
    { id:'1', motivo:'Mensagens ofensivas enviadas repetidamente dentro de uma conversa.',status:'PENDENTE', data:'2026-10-21T10:30:00.000Z', tipo:'USUARIA', denunciante:{id:'11',nome:'Ana Cida',email:'ana_cida@gmail.com'},alvo:{id:'44',nome:'Usuária denunciada'} },
    { id:'2', motivo:'Comportamento desrespeitoso em uma discussão do fórum.',status:'PENDENTE',data:'2026-10-20T09:00:00.000Z',tipo:'USUARIA',denunciante:{id:'12',nome:'Lilian',email:'lilian@gmail.com'},alvo:{id:'45',nome:'Participante do fórum'} },
    { id:'3', motivo:'Publicação considerada inadequada para a comunidade.',status:'PENDENTE',data:'2026-10-19T09:00:00.000Z',tipo:'POSTAGEM',denunciante:{id:'13',nome:'Andressa',email:'andressa@gmail.com'},alvo:{id:'91',conteudo:'Publicação sinalizada pela comunidade.'} },
    { id:'4', motivo:'Solicitação de revisão de conteúdo.',status:'PENDENTE',data:'2026-10-18T09:00:00.000Z',tipo:'MENSAGEM',denunciante:{id:'14',nome:'Beatriz',email:'beatriz@gmail.com'},alvo:{id:'99',conteudo:'Mensagem sinalizada.'} },
    { id:'5', motivo:'Possível violação das regras da comunidade.',status:'PENDENTE',data:'2026-10-17T09:00:00.000Z',tipo:'USUARIA',denunciante:{id:'15',nome:'Mariana',email:'mariana@gmail.com'},alvo:{id:'46',nome:'Usuária denunciada'} },
  ],
  foruns: [
    {id:'1',titulo:'Autocuidado é amor próprio',descricao:'Um espaço para trocar dicas de bem-estar, autoestima e cuidado.',quantidade_postagens:4,posts:[{id:'1',nome:'Amanda',texto:'Pequenos hábitos fazem muita diferença 💜'},{id:'2',nome:'Ana',texto:'Adorei a ideia de reservar um tempo para mim!'}]},
    {id:'2',titulo:'Dica de segurança',descricao:'Compartilhe informações e orientações de segurança.',quantidade_postagens:5,posts:[{id:'3',nome:'Beatriz',texto:'Compartilhem apenas informações verificadas.'}]},
    {id:'3',titulo:'Girls Party',descricao:'Um lugar para conversar e trocar experiências com respeito.',quantidade_postagens:8,posts:[{id:'4',nome:'Amanda',texto:'Oi amigas, tudo bem???'},{id:'5',nome:'Ana',texto:'Oii mi, tudo sim e vc??'},{id:'6',nome:'Amanda',texto:'Tô bem também!!'},{id:'7',nome:'Ana',texto:'Que bom! 💜'}]},
  ],
  conteudos: [
    {id:'1',titulo:'Bem-estar e autocuidado'},
    {id:'2',titulo:'Rede de apoio'},
    {id:'3',titulo:'Dicas de segurança'},
  ],
  relatorios: [
    {
      id:'1',
      acao:'RELATORIO_MANUAL',
      descricao:'Resumo das atividades\n\nA equipe de moderação acompanhou os fóruns ativos e revisou as denúncias pendentes durante o período.',
      data:'2026-10-21T14:00:00.000Z',
    },
    {
      id:'2',
      acao:'ALTERACAO_STATUS_DENUNCIA',
      descricao:'Denúncia 2 alterada para EM_ANALISE.',
      data:'2026-10-20T10:30:00.000Z',
    },
    {
      id:'3',
      acao:'EDICAO_FORUM',
      descricao:'Fórum 3 editado pela moderadora.',
      data:'2026-10-19T09:00:00.000Z',
    },
  ],
};

const KEY = 'constella-moderadora-demonstracao-v1';

export function readDemo() {
  if (typeof window === 'undefined') return structuredClone(INITIAL_DEMO);
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : structuredClone(INITIAL_DEMO);
  } catch {
    return structuredClone(INITIAL_DEMO);
  }
}
export function updateDemo(callback) {
  const state = readDemo();
  const value = callback(state) || state;
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(value));
  return value;
}
