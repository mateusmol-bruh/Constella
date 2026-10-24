const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
function transpile(file) {
  return ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.React, esModuleInterop:true },
  }).outputText;
}
function mountChat(conversationKey, items = [], permissions = {}, callbacks = {}) {
  const slots = [], timers = new Map();
  let cursor = 0, timerId = 0, focus, cleanup, listener, mounted = false, requests = 0;
  let messages = items;
  let deleted = 0, backs = 0;
  const notices = [], selections = [], scrolls = [];
  const react = {
    createElement(type, props, ...children) {
      if (type === 'FlatList' && props?.ref) props.ref.current = { scrollToIndex: value => scrolls.push(value), scrollToOffset() {} };
      if (type === 'TextInput' && props?.ref) props.ref.current = { focus() {} };
      return { type, props: { ...props, children } };
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current:initial }; return slots[i]; },
    useCallback(callback) { return callback; },
    useLayoutEffect(effect) { effect(); },
  };
  const AppState = { currentState:'active', addEventListener(name, callback) { listener = callback; return { remove() { listener = undefined; } }; } };
  const native = { AppState, Platform:{OS:'android'}, useWindowDimensions:()=>({width:360,height:720,fontScale:1}) };
  for (const name of ['ActivityIndicator','FlatList','Image','KeyboardAvoidingView','Modal','Pressable','ScrollView','Text','TextInput','View']) native[name] = name;
  const imports = {
    react: { __esModule:true, default:react, ...react },
    'react-native':native,
    '@react-navigation/native':{ useFocusEffect(callback) { focus = callback; } },
    axios:require('axios'),
    './Artwork':{ Avatar:'Avatar' },
    './ForumCover':{ ForumCover:'ForumCover' },
    './ConversationImage':{ ConversationImage:'ConversationImage' },
    './PersonModal':{ PersonModal:'PersonModal' },
    './Social':{ Sheet:'Sheet' },
    'react-native-safe-area-context':{ SafeAreaView:'SafeAreaView' },
    '../utils/layout':{ chatImageWidth:()=>180 },
    '../services/image.service':{ selectImage:async(aspect,source)=>{selections.push(source);return callbacks.selectedImage ?? null;}, uploadImage:callbacks.uploadImage ?? (async()=>'') },
    '../utils/media':{ mediaUrl:value=>value },
    '../constexts/FeedbackContext':{ useFeedback:()=>message=>notices.push(message) },
    './Icon':{ Icon:'Icon' },
    './ui':Object.fromEntries(['Button','Notice','ResourceState','Screen'].map(name=>[name,name])),
    '../constexts/AuthContext':{ useAuth:()=>({user:{id:'1',nome:'TESTE'}}) },
    '../services/api':{ errorMessage:()=> 'Erro de teste', imageAuthHeaders:()=>({Authorization:'Bearer token-sintetico'}) },
    '../services/social.service':{ conversationPageSize:50 },
    '../styles/theme':{ colors:{}, fontFamily:'test', ui:{} },
  };
  const module = { exports:{} };
  vm.runInNewContext(transpile('../src/components/ChatPanel.tsx'), {
    module, exports:module.exports, AbortController,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id,{callback,delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    require(name) { assert.ok(Object.hasOwn(imports,name),name); return imports[name]; },
  });
  const props = {
    conversationKey, title:'TESTE', onBack() { backs++; },
    destroy:async()=>{deleted++;}, edit:()=>{},
    leave:async()=>{},
    async loader() { requests++; return { items:messages, canSend:true, subtitle:'TESTE', ...permissions }; },
    async send(text) { return {id:'sent',authorId:'1',author:'TESTE',text,date:'2026-10-23T12:00:00Z'}; },
    async earlier() { return messages.map(item=>({...item,id:'previous-'+item.id})); },
    ...callbacks,
  };
  function render() {
    cursor=0;
    const tree=module.exports.ChatPanel(props);
    if (!mounted) { mounted=true; cleanup=focus(); }
    return tree;
  }
  render();
  return { render, timers, notices, selections, scrolls, deleted:()=>deleted, backs:()=>backs, requests:()=>requests, incoming(value){ messages=value; },
    poll() { const [id,timer] = [...timers][0] ?? []; assert.ok(timer,'Deve haver atualização agendada'); timers.delete(id); timer.callback(); },
    activity(state) { AppState.currentState=state; listener?.(state); },
    unmount(){cleanup();},
  };
}
function find(tree,type) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (tree.type===type) return tree;
  const children = Array.isArray(tree) ? tree : [tree.props?.children, tree.props?.ListFooterComponent];
  for (const child of children) { const result=find(child,type); if(result) return result; }
}
for(const key of ['chat:1','forum:1']) test(`${key}: mensagem recebida aparece sem sair e voltar; atualização pausa fora da tela`, async()=>{
  const app=mountChat(key);
  await tick();
  assert.equal(find(app.render(),'FlatList').props.data.length,0);
  assert.equal([...app.timers.values()][0].delay,2000);
  app.incoming([{id:'2',authorId:'2',author:'Outra',text:'Mensagem recebida',date:'2026-10-23T12:00:00Z'}]);
  app.poll(); await tick();
  assert.equal(find(app.render(),'FlatList').props.data[0].text,'Mensagem recebida');
  assert.equal(app.requests(),2);
  app.activity('background'); assert.equal(app.timers.size,0);
  app.activity('active'); await tick(); assert.equal(app.requests(),3);
  app.unmount(); assert.equal(app.timers.size,0);
});

test('histórico expandido não aumenta intervalo da atualização de mensagens', async()=>{
  const messages=Array.from({length:50},(_,i)=>({id:String(i),authorId:'2',author:'Outra',text:'TESTE',date:'2026-10-23T12:00:00Z'}));
  const app=mountChat('chat:history',messages); await tick();
  find(app.render(),'FlatList').props.ListFooterComponent.props.onPress(); await tick();
  assert.equal(find(app.render(),'FlatList').props.data.length,100);
  assert.equal([...app.timers.values()][0].delay,2000);
  app.poll(); await tick();
  assert.equal(find(app.render(),'FlatList').props.data.length,100);
  app.unmount();
});

test('conexões aceitas aparecem no chat sem conversa prévia e sem duplicar conversas existentes',()=>{
  const module={exports:{}};
  vm.runInNewContext(transpile('../src/utils/conversations.ts'),{module,exports:module.exports});
  const chats=[{id_chat:'10',destinataria:{id:'2',nome:'TESTE 2',foto:null}}];
  const connection=(id,status='ACEITO')=>({status_conexao:status,outra_usuaria:{id_usr:id,nome_usr:`TESTE ${id}`,foto_usr:null}});
  const entries=module.exports.chatEntries(chats,[connection('2'),connection('3'),connection('3'),connection('4','PENDENTE')]);
  assert.equal(entries.length,2);
  assert.equal(entries[0].chatId,'10');
  assert.equal(entries[1].personId,'3');
  assert.equal(entries[1].chatId,undefined);
});

function all(tree,type) {
  if(!tree||typeof tree!=='object')return [];
  const children=Array.isArray(tree)?tree:[tree.props?.children,tree.props?.ListFooterComponent];
  return [...(tree.type===type?[tree]:[]),...children.flatMap(child=>all(child,type))];
}
test('fórum usa a capa correta e só exibe exclusão para a criadora; exclusão pede confirmação',async()=>{
  const participant=mountChat('forum:member',[],{canLeave:true,canDelete:false,foto:'/uploads/member.png',title:'Fórum correto'});
  await tick();
  const tree=participant.render();
  assert.equal(find(tree,'ForumCover').props.foto,'/uploads/member.png');
  assert.equal(all(tree,'Pressable').some(item=>item.props.accessibilityLabel==='Excluir fórum'),false);
  assert.equal(all(tree,'Button').some(item=>item.props.title==='Sair do fórum'),true);
  participant.unmount();
  const owner=mountChat('forum:owner',[],{canDelete:true,canLeave:false}); await tick();
  const button=all(owner.render(),'Button').find(item=>item.props.title==='Excluir fórum');
  assert.ok(button); assert.equal(owner.deleted(),0);
  button.props.onPress();
  const confirm=all(owner.render(),'Button').find(item=>item.props.title==='Excluir');
  confirm.props.onPress(); await tick();
  assert.equal(owner.deleted(),1); assert.equal(owner.backs(),1); assert.ok(owner.notices.includes('Fórum excluído.'));
  owner.unmount();
});

test('chat bloqueado preserva histórico e abre o modal pelo cabeçalho, sem campo de envio',async()=>{
  const item={id:'10',authorId:'2',author:'Outra',text:'Histórico preservado',date:'2026-10-23T12:00:00Z'};
  const reads=[];
  const app=mountChat('chat:blocked',[item],{canSend:false,blocked:true,personId:'2'},{markRead:async id=>reads.push(id)});
  await tick();
  const tree=app.render();
  assert.equal(find(tree,'FlatList').props.data[0].text,item.text);
  assert.equal(all(tree,'TextInput').some(node=>node.props.accessibilityLabel==='Digite uma mensagem'),false);
  assert.deepEqual(reads,['10']);
  all(tree,'Pressable').find(node=>node.props.accessibilityLabel==='Ver perfil da usuária').props.onPress();
  assert.equal(find(app.render(),'PersonModal').props.id,'2');
  app.unmount();
});

test('leitura não é confirmada em segundo plano; imagem privada usa JWT na renderização',async()=>{
  const reads=[];
  const item={id:'20',authorId:'2',author:'Outra',text:'',image:'/api/anexos/teste.png',date:'2026-10-23T12:00:00Z'};
  const app=mountChat('chat:read',[item],{}, {markRead:async id=>reads.push(id)});
  app.activity('background'); await tick();
  assert.equal(reads.length,0);
  app.activity('active'); await tick();
  assert.deepEqual(reads,['20']);
  const image=find(find(app.render(),'FlatList').props.renderItem({item}),'ConversationImage');
  assert.equal(image.props.uri,item.image);
  app.unmount();
});

test('cancelar upload ou sair da tela impede o envio da mensagem com imagem',async()=>{
  for (const unmount of [false,true]) {
    let sent=0;
    const app=mountChat('chat:cancel',[],{}, {
      selectedImage:{uri:'file:///teste.png',base64:'YQ=='},
      uploadImage:async(image,privada,signal)=>new Promise((resolve,reject)=>{
        assert.equal(privada,true);
        signal.addEventListener('abort',()=>reject(new (require('axios').CanceledError)()));
      }),
      send:async()=>{sent++;},
    });
    await tick();
    all(app.render(),'Pressable').find(node=>node.props.accessibilityLabel==='Anexar imagem').props.onPress();
    all(app.render(),'Button').find(node=>node.props.title==='Escolher da galeria').props.onPress();
    await tick();
    all(app.render(),'Pressable').find(node=>node.props.accessibilityLabel==='Enviar mensagem').props.onPress();
    await tick();
    if(unmount) app.unmount();
    else all(app.render(),'Button').find(node=>node.props.title==='Cancelar envio da imagem').props.onPress();
    await tick();
    assert.equal(sent,0);
    if(!unmount) {assert.ok(app.notices.includes('Envio da imagem cancelado.'));app.unmount();}
  }
});
test('fórum oferece câmera e galeria; a foto escolhida pode ser refeita antes do envio',async()=>{
  const app=mountChat('forum:camera',[],{}, {selectedImage:{uri:'file:///foto.jpg',base64:'YQ=='}});
  await tick();
  all(app.render(),'Pressable').find(item=>item.props.accessibilityLabel==='Anexar imagem').props.onPress();
  const sheet=all(app.render(),'Sheet').find(item=>item.props.title==='Adicionar foto');
  assert.equal(sheet.props.visible,true);assert.equal(app.selections.length,0);
  all(app.render(),'Button').find(item=>item.props.title==='Tirar foto').props.onPress();await tick();
  assert.deepEqual(app.selections,['camera']);
  all(app.render(),'Button').find(item=>item.props.title==='Refazer foto').props.onPress();await tick();
  assert.deepEqual(app.selections,['camera','camera']);
  all(app.render(),'Button').find(item=>item.props.title==='Escolher da galeria').props.onPress();await tick();
  assert.equal(app.selections.at(-1),'library');
  app.unmount();
});

for (const conversation of ['chat:reply', 'forum:reply']) test(`${conversation}: pressão longa responde a foto/texto, permite cancelar e envia referência`, async () => {
  const original = { id:'7',authorId:'2',author:'Maria',text:'Original',image:'/api/anexos/foto.png',date:'2026-10-23T12:00:00Z' };
  const sent=[];
  const app=mountChat(conversation,[original],{}, {send:async(text,image,options)=>{sent.push({text,image,options});return {...original,id:'8',text,authorId:'1'};}});
  await tick();
  function selectReply() {
    const row=find(app.render(),'FlatList').props.renderItem({item:original});
    all(row,'Pressable').find(node=>node.props.accessibilityLabel==='Opções da mensagem').props.onLongPress();
    all(app.render(),'Button').find(node=>node.props.title==='Responder').props.onPress();
  }
  selectReply();
  assert.ok(all(app.render(),'Button').some(node=>node.props.title==='Cancelar resposta'));
  all(app.render(),'Button').find(node=>node.props.title==='Cancelar resposta').props.onPress();
  assert.equal(all(app.render(),'Button').some(node=>node.props.title==='Cancelar resposta'),false);
  selectReply();
  find(app.render(),'TextInput').props.onChangeText('Minha resposta');
  all(app.render(),'Pressable').find(node=>node.props.accessibilityLabel==='Enviar mensagem').props.onPress();await tick();
  assert.equal(sent.length,1);assert.equal(sent[0].options.resposta_id,'7');
  assert.match(sent[0].options.envio_id,/^[A-Za-z0-9_-]{16,100}$/);
  assert.equal(find(app.render(),'FlatList').props.data.length,2);
  app.unmount();
});

test('toque na citação carrega página antiga e localiza a original',async()=>{
  const reply={id:'100',authorId:'2',author:'Maria',text:'Resposta',date:'2026-10-23T12:00:00Z',reply:{id:'7',autora:{id:'1',nome:'Autora'},conteudo:'Original',imagem:false}};
  let page;
  const app=mountChat('chat:old-reply',[reply],{}, {earlier:async value=>{page=value;return [{...reply,id:'7',reply:null,text:'Original'}];}});
  await tick();
  const row=find(app.render(),'FlatList').props.renderItem({item:reply});
  all(row,'Pressable').find(node=>node.props.accessibilityLabel==='Localizar mensagem de Autora').props.onPress();await tick();
  const list=find(app.render(),'FlatList');list.props.onContentSizeChange();
  assert.equal(page,2);assert.ok(list.props.data.some(item=>item.id==='7'));
  assert.equal(app.scrolls.at(-1).index,1);
  app.unmount();
});

test('falha após upload mantém prévia e chave; mensagem só aparece quando backend confirma',async()=>{
  const calls=[];let uploads=0,finish;
  const app=mountChat('chat:retry',[],{}, {
    selectedImage:{uri:'file:///teste.jpg',base64:'YQ=='},
    uploadImage:async image=>{if(!image.uploadedPath)uploads++;return '/api/anexos/foto.png';},
    send:async(text,image,options)=>{calls.push(options.envio_id);if(calls.length===1)throw new Error('timeout');await new Promise(resolve=>{finish=resolve;});return {id:'8',authorId:'1',author:'TESTE',text,image,date:'2026-10-23T12:00:00Z'};},
  });
  await tick();
  all(app.render(),'Button').find(node=>node.props.title==='Escolher da galeria').props.onPress();await tick();
  all(app.render(),'Pressable').find(node=>node.props.accessibilityLabel==='Enviar mensagem').props.onPress();await tick();
  assert.equal(find(app.render(),'FlatList').props.data.length,0);
  assert.ok(all(app.render(),'Image').some(node=>node.props.accessibilityLabel==='Prévia da imagem selecionada'));
  all(app.render(),'Button').find(node=>node.props.title==='Tentar enviar novamente').props.onPress();await tick();
  assert.equal(find(app.render(),'FlatList').props.data.length,0);
  finish();await tick();
  assert.equal(find(app.render(),'FlatList').props.data.length,1);
  assert.equal(calls[0],calls[1]);assert.equal(uploads,1);
  app.unmount();
});

test('aviso de sistema usa texto centralizado sem avatar nem ações de participante',async()=>{
  const item={id:'9',authorId:'',author:'',text:'Maria saiu do fórum.',system:true,date:'2026-10-23T12:00:00Z'};
  const app=mountChat('forum:system',[item]);await tick();
  const row=find(app.render(),'FlatList').props.renderItem({item});
  assert.equal(all(row,'Avatar').length,0);assert.equal(all(row,'Pressable').length,0);
  assert.equal(row.props.style.alignSelf,'center');assert.equal(find(row,'Text').props.children[0],item.text);
  app.unmount();
});

test('falha inicial permite tentar novamente; atualização temporária preserva histórico e recupera',async()=>{
  let failed=true;
  const item={id:'1',authorId:'2',author:'Outra',text:'Preservada',date:'2026-10-23T12:00:00Z'};
  const app=mountChat('chat:recovery',[],{}, {loader:async()=>{if(failed)throw new Error('Falha temporária');return {items:[item],canSend:true,subtitle:'TESTE'};}});
  await tick();
  assert.equal(find(app.render(),'ResourceState').props.error,'Erro de teste');
  failed=false;find(app.render(),'ResourceState').props.onRetry();await tick();
  assert.equal(find(app.render(),'FlatList').props.data[0].text,'Preservada');
  failed=true;app.poll();await tick();
  assert.equal(find(app.render(),'FlatList').props.data[0].text,'Preservada');
  const retry=all(app.render(),'Button').find(node=>node.props.title==='Tentar novamente');assert.ok(retry);
  failed=false;retry.props.onPress();await tick();
  assert.equal(all(app.render(),'Button').some(node=>node.props.title==='Tentar novamente'),false);
  app.unmount();
});

test('conversa vazia e reabertura não são tratadas como falha',async()=>{
  for(const key of ['chat:empty','forum:empty'])for(let reopen=0;reopen<2;reopen++){
    const app=mountChat(key);await tick();
    const state=find(app.render(),'ResourceState');assert.equal(state.props.error,'');assert.ok(state.props.empty);
    assert.equal(find(app.render(),'FlatList').props.data.length,0);app.unmount();
  }
});
