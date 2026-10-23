const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:name=>{assert.ok(Object.hasOwn(dependencies,name),name);return dependencies[name];}});return module.exports;
}
test('notificação aceita somente destinos conhecidos e IDs decimais; ignora URL arbitrária',()=>{
  const {pushDestination}=load('../src/utils/notifications.ts');
  for(const data of [null,{}, {tipo:'url',id:'1',destinataria:'2',evento:'3'}, {tipo:'chat',id:'../perfil',destinataria:'2',evento:'3'}, {tipo:'chat',id:'9223372036854775808',destinataria:'2',evento:'3'}]) assert.equal(pushDestination(data),null);
  const target=pushDestination({tipo:'chat',id:'1',destinataria:'2',evento:'3',url:'https://example.invalid'});
  assert.equal(target.id,'1');assert.equal(target.url,undefined);
});
test('layout reduz colunas com fonte ampliada e mantém imagem dentro da bolha em tela pequena',()=>{
  const {contentColumns,chatImageWidth,screenGutter}=load('../src/utils/layout.ts');
  assert.equal(contentColumns(320,1),1);assert.equal(contentColumns(420,1),2);assert.equal(contentColumns(420,1.5),1);
  for(const width of [280,320,360,430,768]) assert.ok(chatImageWidth(width)+28+48 <= width-2*screenGutter(width));
});
test('tap aguarda navegação e autenticação prontas; duas respostas do mesmo evento não abrem duas telas',async()=>{
  let ready=false, account=false, calls=0;
  const service=load('../src/services/notifications-navigation.ts',{'@react-navigation/native':{createNavigationContainerRef:()=>({isReady:()=>ready})}});
  service.setNotificationOpener(async()=>{if(!account)return false;calls++;return true;});
  const target={tipo:'chat',id:'1',destinataria:'2',evento:'3'};
  service.queueNotification(target);await service.flushNotificationNavigation();assert.equal(calls,0);
  ready=true;await service.flushNotificationNavigation();assert.equal(calls,0);
  account=true;await service.flushNotificationNavigation();assert.equal(calls,1);
  service.queueNotification({...target});await service.flushNotificationNavigation();assert.equal(calls,1);
});
test('logout aguarda o registro pendente e revoga o token antes de limpar o armazenamento',async()=>{
  let stored=null, finish;
  const calls=[];
  const api={put:async()=>{calls.push('registrando');await new Promise(resolve=>{finish=resolve;});calls.push('registrado');},delete:async()=>{calls.push('revogado');}};
  const service=load('../src/services/notifications.service.ts',{
    'react-native':{Platform:{OS:'android'}},
    'expo-constants':{__esModule:true,default:{executionEnvironment:'standalone',easConfig:{projectId:'projeto-sintetico'}}},
    'expo-device':{isDevice:true},
    'expo-secure-store':{getItemAsync:async()=>stored,setItemAsync:async(key,value)=>{stored=value;calls.push('salvo');},deleteItemAsync:async()=>{stored=null;calls.push('limpo');}},
    './api':{api},
    'expo-notifications':{AndroidImportance:{DEFAULT:3},setNotificationChannelAsync:async()=>{},getPermissionsAsync:async()=>({granted:true}),getExpoPushTokenAsync:async()=>({data:'ExpoPushToken[TESTE_sem_destinatario_real]'})},
  });
  const registration=service.registerPush();await new Promise(setImmediate);
  const logout=service.unregisterPush();await new Promise(setImmediate);
  assert.deepEqual(calls,['registrando']);finish();
  await Promise.all([registration,logout]);
  assert.deepEqual(calls,['registrando','registrado','salvo','revogado','limpo']);assert.equal(stored,null);
});
