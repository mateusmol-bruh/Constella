const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('salvar perfil consulta perfil completo para preservar interesses', async () => {
  const calls=[];
  const dto={id_usr:'1',nome_usr:'TESTE editado',email_usr:'teste@example.invalid',foto_usr:null,onboarding_concluido:true};
  const api={
    async put(url,body) { calls.push({method:'PUT',url,body}); return {data:{perfil:dto}}; },
    async get(url) { calls.push({method:'GET',url}); return {data:{...dto,interesses:[{id_intr:'2',nome_intr:'Leitura'}]}}; },
  };
  const filename=path.resolve(__dirname,'../src/services/community.service.ts');
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require(name){assert.equal(name,'./api');return {api};}});
  const profile=await module.exports.communityService.editProfile({nome:dto.nome_usr,email:dto.email_usr});
  assert.equal(profile.nome,dto.nome_usr);
  assert.equal(profile.interesses[0].id,'2');
  assert.equal(profile.interesses[0].nome,'Leitura');
  assert.deepEqual(calls.map(x=>[x.method,x.url]),[['PUT','/api/perfil'],['GET','/api/perfil']]);
});
