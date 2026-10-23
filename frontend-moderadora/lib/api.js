import { readDemo, updateDemo } from './demo';
import { rememberStatusChange, reconcileAuditHistory, wasStatusAuditConfirmed } from './audit';

/**
 * Em modo real: todas as chamadas passam pelo proxy Next -> Express.
 * Em modo demonstração: dados locais, sem fazer alterações no servidor.
 */
async function request(path, { token, method = 'GET', body } = {}) {
  let response;
  try {
    const freshPath = method === 'GET' && path.startsWith('/relatorios')
      ? `${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}` : path;
    response = await fetch(`/api/backend/moderacao${freshPath}`, {
      method,
      headers: {
        ...(body ? {'Content-Type': 'application/json'} : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(freshPath !== path ? { 'Cache-Control': 'no-cache' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique se o backend está ligado.');
  }
  let result = {};
  try { result = await response.json(); } catch { /* Sem corpo JSON */ }
  if (!response.ok) {
    const err = new Error(result.mensagem || `Erro na requisição (${response.status}).`);
    err.status = response.status;
    throw err;
  }
  return result;
}

// Replica a auditoria do Express apenas no modo demonstração.
// Não cria ações no banco nem representa operações não suportadas.
function appendDemoAction(state, acao, descricao) {
  if (!Array.isArray(state.relatorios)) state.relatorios = [];
  state.relatorios.unshift({
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    acao,
    descricao,
    data: new Date().toISOString(),
  });
}

export async function loginModeradora(email, senha) {
  return request('/login', { method:'POST', body:{email,senha} });
}

export async function getDashboard(session) {
  if (session.demo) {
    const d=readDemo();
    return { denuncias:d.denuncias, foruns:d.foruns, resumo:{denunciasPendentes:d.denuncias.filter(x=>x.status==='PENDENTE').length,forunsAtivos:d.foruns.length,conteudosPostados:d.conteudos.length} };
  }
  const [den,foru,resumo] = await Promise.all([
    request('/denuncias', {token:session.token}),
    request('/foruns', {token:session.token}),
    request('/resumo', {token:session.token}),
  ]);
  return {denuncias:den.denuncias || [],foruns:foru.foruns || [],resumo:resumo.resumo};
}

export async function getDenuncia(session, id) {
  if (session.demo) {
    const value=readDemo().denuncias.find(x=>x.id===String(id));
    if (!value) throw new Error('Denúncia não encontrada.');
    return value;
  }
  return (await request(`/denuncias/${encodeURIComponent(id)}`, {token:session.token})).denuncia;
}

export async function setStatusDenuncia(session, id, status) {
  if (session.demo) {
    const data=updateDemo(d=>{
      const item=d.denuncias.find(x=>x.id===String(id));
      if (!item) throw new Error('Denúncia não encontrada.');
      item.status=status;
      appendDemoAction(d, 'ALTERACAO_STATUS_DENUNCIA', `Denúncia ${id} alterada para ${status}.`);
      return d;
    });
    return { ...data.denuncias.find(x=>x.id===String(id)), historicoConfirmado: true };
  }
  // O backend do Constella grava o status e a auditoria na mesma transação.
  // Depois do PATCH, exigimos evidência em GET /relatorios. Não simulamos
  // registros persistidos quando a versão do backend estiver desatualizada.
  const updated = (await request(`/denuncias/${encodeURIComponent(id)}/status`, {
    token:session.token,method:'PATCH',body:{status}
  })).denuncia;
  const attempt = rememberStatusChange(session, id, status);
  try {
    const history = await getRelatorios(session);
    return { ...updated, historicoConfirmado: wasStatusAuditConfirmed(history, attempt) };
  } catch {
    // O PATCH teve sucesso, mas a consulta de auditoria falhou. Isso não
    // desfaz a operação nem autoriza dizer que o histórico foi persistido.
    return { ...updated, historicoConfirmado: false, erroConsultaHistorico: true };
  }
}

export async function getForum(session,id) {
  if (session.demo) {
    const forum=readDemo().foruns.find(x=>x.id===String(id));
    if (!forum) throw new Error('Fórum não encontrado.');
    return forum;
  }
  return (await request(`/foruns/${encodeURIComponent(id)}`, {token:session.token})).forum;
}

export async function editForum(session,id,data) {
  if (session.demo) {
    return updateDemo(d=>{
      const f=d.foruns.find(x=>x.id===String(id));
      if (!f) throw new Error('Fórum não encontrado.');
      f.titulo=data.titulo;f.descricao=data.descricao;
      appendDemoAction(d, 'EDICAO_FORUM', `Fórum ${id} editado pela moderadora.`);
      return d;
    }).foruns.find(x=>x.id===String(id));
  }
  return (await request(`/foruns/${encodeURIComponent(id)}`,{token:session.token,method:'PATCH',body:data})).forum;
}
export async function deleteForum(session,id) {
  if (session.demo) {
    updateDemo(d=>{
      const f=d.foruns.find(x=>x.id===String(id));
      if (!f) throw new Error('Fórum não encontrado.');
      d.foruns=d.foruns.filter(x=>x.id!==String(id));
      appendDemoAction(d, 'EXCLUSAO_FORUM', `Fórum ${id} (${f.titulo}) excluído.`);
      return d;
    });
    return;
  }
  await request(`/foruns/${encodeURIComponent(id)}`, {token:session.token,method:'DELETE'});
}

export async function createConteudo(session,data) {
  if (session.demo) {
    const d=updateDemo(x=>{
      const id=String(Date.now());
      x.conteudos.push({id,titulo:data.titulo});
      appendDemoAction(x, 'CRIACAO_CONTEUDO', `Conteúdo ${id} criado.`);
      return x;
    });
    return d.conteudos.at(-1);
  }
  return (await request('/conteudos',{token:session.token,method:'POST',body:data})).conteudo;
}

export async function createConteudoPro(session, data) {
  if (session.demo) {
    const state = updateDemo(d => {
      const id = String(Date.now());
      d.conteudos.push({ id, titulo: data.titulo, pro: true });
      appendDemoAction(d, 'CRIACAO_CONTEUDO_PRO', `Conteúdo PRO ${id} criado.`);
      return d;
    });
    return state.conteudos.at(-1);
  }
  return (await request('/conteudos/pro', {
    token: session.token,
    method: 'POST',
    body: data,
  })).conteudo;
}

export async function createRelatorio(session,data) {
  if (session.demo) {
    const d=updateDemo(x=>{
      x.relatorios.unshift({id:String(Date.now()),acao:"RELATORIO_MANUAL",descricao:`${data.titulo}\n\n${data.conteudo}`,data:new Date().toISOString()});return x;
    });
    return d.relatorios[0];
  }
  return (await request('/relatorios',{token:session.token,method:'POST',body:data})).relatorio;
}

/**
 * GET /api/moderacao/relatorios: traz apenas registros da moderadora autenticada.
 * O backend fornece {id, acao, descricao, data}; não há endpoint de detalhe.
 */
export async function getRelatorios(session) {
  if (session.demo) {
    return [...(readDemo().relatorios || [])].sort(
      (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
    );
  }
  const result = await request('/relatorios', { token: session.token });
  return reconcileAuditHistory(session, result.relatorios);
}
