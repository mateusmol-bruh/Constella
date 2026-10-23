const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomInt } = require('node:crypto');
test('PostgreSQL local: duas criações simultâneas respeitam um fórum; PRO permite mais', {
  skip: process.env.CONSTELLA_LIMIT_INTEGRATION !== '1', timeout: 45000,
}, async () => {
  require('dotenv').config({ quiet: true });
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.notEqual(process.env.NODE_ENV, 'production');
  process.env.NODE_ENV = 'development'; process.env.CONSTELLA_PRO_DEMO = 'true';
  const app = require('../server');
  const prisma = require('../src/config/prisma');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(route, data, token, method = 'POST') {
    const response = await fetch(base + route, { method, headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}) }, body: JSON.stringify(data) });
    return {status: response.status, data: await response.json()};
  }
  function cpf() {
    const digits = Array.from({ length: 9 }, () => randomInt(10));
    for (const size of [9,10]) { const digit = digits.reduce((sum, value, index) => sum + value * (size + 1 - index),0) * 10 % 11; digits.push(digit === 10 ? 0 : digit); }
    return digits.join('');
  }
  try {
    const register = await post('/api/auth/cadastro', { nome:'TESTE limite concorrente', email:`teste-limite-${randomBytes(12).toString('hex')}@example.invalid`, senha:randomBytes(24).toString('base64url'), cpf:cpf() });
    assert.equal(register.status,201);
    const token = register.data.token;
    const payload = { titulo:'TESTE limite concorrente', descricao:'Validação local, sem apagar registros.', capa:null };
    const results = await Promise.all([post('/api/foruns',payload,token),post('/api/foruns',payload,token)]);
    assert.deepEqual(results.map(item=>item.status).sort(),[201,403]);
    assert.equal(results.find(item=>item.status===403).data.codigo,'LIMITE_FORUNS_GRATUITO');
    const demo=await post('/api/pro/demonstracao',{ativar:true},token);
    assert.equal(demo.status,200);
    assert.equal((await post('/api/foruns',payload,token)).status,201);
    assert.equal((await post('/api/foruns',payload,token)).status,201);
    const list=await fetch(base+'/api/foruns?filtro=meus&pagina=1&limite=2',{headers:{Authorization:`Bearer ${token}`}});
    const page=await list.json(); assert.equal(list.status,200); assert.equal(page.foruns.length,2); assert.equal(page.tem_mais,true);
    const next=await (await fetch(base+'/api/foruns?filtro=meus&pagina=2&limite=2',{headers:{Authorization:`Bearer ${token}`}})).json();
    assert.equal(next.foruns.length,1);assert.equal(next.tem_mais,false);
    assert.ok(!page.foruns.some(first=>next.foruns.some(second=>second.id_for===first.id_for)));
    const second = await post('/api/auth/cadastro', { nome:'TESTE destinatária transações', email:`teste-limite-${randomBytes(12).toString('hex')}@example.invalid`, senha:randomBytes(24).toString('base64url'), cpf:cpf() });
    assert.equal(second.status,201);
    const attempts=await Promise.all([post('/api/conexoes/'+second.data.usuaria.id,{},token),post('/api/conexoes/'+second.data.usuaria.id,{},token)]);
    assert.deepEqual(attempts.map(item=>item.status).sort(),[201,409]);
    const connection=attempts.find(item=>item.status===201).data.conexao;
    assert.equal((await post('/api/conexoes/'+connection.id_conexao+'/aceitar',{},second.data.token,'PATCH')).status,200);
    const chat=await post('/api/chats',{id_destinataria:second.data.usuaria.id},token);
    assert.equal(chat.status,201);
    assert.equal((await post('/api/chats/'+chat.data.chat.id_chat+'/mensagens',{conteudo:'TESTE mensagem em transação'},token)).status,201);
    const chats=await (await fetch(base+'/api/chats',{headers:{Authorization:`Bearer ${second.data.token}`}})).json();
    assert.equal(chats.chats.find(item=>item.id_chat===chat.data.chat.id_chat).nao_lidas,1);
    const forumId=results.find(item=>item.status===201).data.forum.id_for;
    assert.equal((await post('/api/foruns/'+forumId+'/entrar',{},second.data.token)).status,201);
    assert.equal((await post('/api/foruns/'+forumId+'/postagens',{conteudo:'TESTE postagem em transação'},token)).status,201);
    const mine=await (await fetch(base+'/api/foruns?filtro=meus&pagina=1&limite=30',{headers:{Authorization:`Bearer ${second.data.token}`}})).json();
    assert.equal(mine.foruns.find(item=>item.id_for===forumId).nao_lidas,1);
    console.log('Teste criou somente contas e conteúdo sintéticos; nenhum registro foi apagado.');
  } finally { await new Promise(resolve=>server.close(resolve)); await prisma.$disconnect(); }
});
