const test = require('node:test');
const assert = require('node:assert/strict');
const {randomBytes} = require('node:crypto');
test('PostgreSQL local: fila deduplica por evento/dispositivo e exclui autora, sem persistir tokens sintéticos', {
  skip: process.env.CONSTELLA_PUSH_STORAGE_INTEGRATION !== '1', timeout: 20000,
}, async t => {
  require('dotenv').config({quiet:true});
  const url=new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.notEqual(process.env.NODE_ENV,'production');
  const prisma=require('../src/config/prisma');
  const service=require('../src/services/notificacao.service');
  const previous=process.env.CONSTELLA_PUSH_ENABLED;
  const rollback=new Error('ROLLBACK_TESTE');
  const suffix=randomBytes(12).toString('hex');
  const tokens=[`ExpoPushToken[TESTE_autora_${suffix}]`,`ExpoPushToken[TESTE_destino_${suffix}]`];
  try {
    const accounts=await prisma.usuaria.findMany({where:{email_usr:{startsWith:'teste-limite-'}},select:{id_usr:true},take:2});
    if(accounts.length<2){t.skip('Execute antes a integração de limites para criar contas sintéticas.');return;}
    process.env.CONSTELLA_PUSH_ENABLED='true';
    await assert.rejects(prisma.$transaction(async tx=>{
      for(let i=0;i<2;i++)await tx.dispositivo_push.create({data:{token:tokens[i],id_usr:accounts[i].id_usr,plataforma:'android'}});
      const event={chave:`teste:${suffix}`,tipo:'chat',recurso:1n,autor:accounts[0].id_usr,destinatarias:accounts.map(account=>account.id_usr)};
      await service.enfileirar(tx,event);await service.enfileirar(tx,event);
      const rows=await tx.notificacao_push.findMany({where:{chave:event.chave}});
      assert.equal(rows.length,1);assert.equal(rows[0].token,tokens[1]);assert.equal(rows[0].estado,'PENDENTE');
      throw rollback;
    }),error=>error===rollback);
    assert.equal(await prisma.dispositivo_push.count({where:{token:{in:tokens}}}),0);
  } finally {
    if(previous===undefined)delete process.env.CONSTELLA_PUSH_ENABLED;else process.env.CONSTELLA_PUSH_ENABLED=previous;
    await prisma.$disconnect();
  }
});
