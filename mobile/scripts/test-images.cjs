const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function imageService(pick, post = async()=>{ throw new Error('Upload não esperado'); }, camera = {}, manipulator = {}) {
  const filename = path.resolve(__dirname,'../src/services/image.service.ts');
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,Error,require(name){
    if(name==='expo-image-picker') return {launchImageLibraryAsync:pick,...camera};
    if(name==='expo-image-manipulator') return manipulator;
    assert.equal(name,'./api'); return {api:{post}};
  }});
  return module.exports;
}
test('cancelar galeria não cria imagem nem executa upload',async()=>{
  assert.equal(await imageService(async()=>({canceled:true})).selectImage([1,1]),null);
});
test('seletor usa somente imagens, permite recorte e entrega arquivo para prévia',async()=>{
  const service=imageService(async options=>{
    assert.equal(options.mediaTypes[0],'images'); assert.equal(options.allowsEditing,true);
    assert.equal(options.aspect[0],4); assert.equal(options.aspect[1],3); assert.equal(options.base64,true);
    return {canceled:false,assets:[{uri:'file:///imagem-teste.jpg',base64:'YQ=='}]};
  });
  const image=await service.selectImage([4,3]);
  assert.equal(image.uri,'file:///imagem-teste.jpg'); assert.equal(image.base64,'YQ==');
});
test('seletor rejeita arquivo ilegível ou maior que limite antes da rede',async()=>{
  for(const [base64,expected]of [[null,'IMAGEM_INVALIDA'],['A'.repeat(3*1024*1024),'IMAGEM_MUITO_GRANDE']]) {
    const service=imageService(async()=>({canceled:false,assets:[{uri:'file:///teste.jpg',base64}]}));
    await assert.rejects(service.selectImage([1,1]),e=>e.message===expected);
  }
});
test('upload envia os bytes e exige caminho confirmado; retry reaproveita upload anterior',async()=>{
  let calls=0;
  const service=imageService(undefined,async(url,body,config)=>{
    calls++; assert.equal(url,'/api/uploads/imagens'); assert.equal(body.imagem,'YQ==');
    assert.equal(body.uri,undefined); assert.equal(config.timeout,60000);
    return {data:{caminho:'/uploads/12345678-abcd-abcd-abcd-123456789abc.jpg'}};
  });
  const image={uri:'file:///teste.jpg',base64:'YQ=='};
  const uploadedPath=await service.uploadImage(image);
  assert.equal(await service.uploadImage({...image,uploadedPath}),uploadedPath);
  assert.equal(calls,1);
  const invalid=imageService(undefined,async()=>({data:{caminho:'file:///nao-compartilhavel.jpg'}}));
  await assert.rejects(invalid.uploadImage(image),e=>e.message==='IMAGEM_RESPOSTA_INVALIDA');
});

test('câmera solicita permissão, respeita recusa e cancelamento sem reutilizar foto',async()=>{
  let calls=0;
  const denied=imageService(undefined,undefined,{requestCameraPermissionsAsync:async()=>({granted:false}),launchCameraAsync:async()=>{calls++;}});
  await assert.rejects(denied.selectImage([1,1],'camera'),e=>e.message==='CAMERA_SEM_PERMISSAO');
  assert.equal(calls,0);
  const canceled=imageService(undefined,undefined,{requestCameraPermissionsAsync:async()=>({granted:true}),launchCameraAsync:async()=>{calls++;return {canceled:true};}});
  assert.equal(await canceled.selectImage([1,1],'camera'),null); assert.equal(calls,1);
});

test('anexo de conversa solicita armazenamento privado e rejeita retorno público', async()=>{
  let calls=0;
  const privatePath='/api/anexos/12-12345678-abcd-abcd-abcd-123456789abc.png';
  const service=imageService(undefined,async(url,body)=>{
    calls++; assert.equal(body.privada,true); assert.equal(body.imagem,'YQ==');
    return {data:{caminho:privatePath}};
  });
  const image={uri:'file:///teste.png',base64:'YQ==',uploadedPath:'/uploads/12345678-abcd-abcd-abcd-123456789abc.png'};
  assert.equal(await service.uploadImage(image,true),privatePath);
  assert.equal(calls,1);
  assert.equal(await service.uploadImage({...image,uploadedPath:privatePath},true),privatePath);
  assert.equal(calls,1);
  const invalid=imageService(undefined,async()=>({data:{caminho:image.uploadedPath}}));
  await assert.rejects(invalid.uploadImage(image,true),e=>e.message==='IMAGEM_RESPOSTA_INVALIDA');
});

for (const [width,height] of [[3000,4000],[4000,2000],[3000,3000]]) test(`foto ${width}x${height}: seleção sem recorte e otimização preservam proporção`,async()=>{
  const operations=[];let released=0;
  const context={resize:value=>operations.push(value),release:()=>released++,renderAsync:async()=>({release:()=>released++,saveAsync:async options=>{
    assert.equal(options.format,'jpeg');assert.equal(options.base64,true);
    const scale=2048/Math.max(width,height);
    return {uri:'file:///otimizada.jpg',base64:'YQ==',width:width*scale,height:height*scale};
  }})};
  const service=imageService(async options=>{
    assert.equal(options.allowsEditing,false);assert.equal(options.aspect,undefined);assert.equal(options.base64,false);
    return {canceled:false,assets:[{uri:'file:///original.jpg',width,height}]};
  },undefined,{}, {ImageManipulator:{manipulate:(uri,options)=>{assert.equal(uri,'file:///original.jpg');assert.equal(options.maxWidth,2048);return context;}},SaveFormat:{JPEG:'jpeg'}});
  const selected=await service.selectImage();
  assert.equal(selected.width/selected.height,width/height);
  assert.equal(Object.keys(operations[0]).length,1);assert.equal(operations[0].crop,undefined);
  assert.equal(released,2);
});

test('visualizador privado mantém JWT, ajusta proporção e abre a imagem inteira',()=>{
  const filename=path.resolve(__dirname,'../src/components/ConversationImage.tsx');
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  let cursor=0;const states=[];
  const react={useEffect(){},createElement:(type,props,...children)=>({type,props:{...props,children}}),useState(initial){const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],value=>states[index]=typeof value==='function'?value(states[index]):value];}};
  const deps={react:{__esModule:true,default:react,...react},'react-native':{Platform:{OS:'android'},...Object.fromEntries(['ActivityIndicator','Image','Modal','Pressable','Text','View'].map(name=>[name,name]))},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'../services/api':{imageAuthHeaders:()=>({Authorization:'Bearer teste'})},'../utils/media':{mediaUrl:value=>`https://api.invalid${value}`},'../utils/layout':{fitImage:(w,h,mw,mh)=>({width:Math.min(mw,mh*w/h),height:Math.min(mh,mw*h/w)})}};
  const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:name=>deps[name]});
  const render=(uri='/api/anexos/imagem.jpg')=>{cursor=0;return module.exports.ConversationImage({uri,maxWidth:200});};
  function nodes(tree,type){if(!tree||typeof tree!=='object')return [];return [...(tree.type===type?[tree]:[]),...(Array.isArray(tree)?tree:tree.props?.children??[]).flatMap(child=>nodes(child,type))];}
  let tree=render(),image=nodes(tree,'Image')[0];
  assert.equal(image.props.source.headers.Authorization,'Bearer teste');assert.equal(image.props.resizeMode,'contain');
  image.props.onLoad({nativeEvent:{source:{width:1000,height:2000}}});
  tree=render();image=nodes(tree,'Image')[0];assert.equal(image.props.style.width/image.props.style.height,0.5);
  nodes(tree,'Pressable')[0].props.onPress();tree=render();assert.equal(nodes(tree,'Modal')[0].props.visible,true);
  assert.equal(nodes(tree,'Image')[1].props.resizeMode,'contain');
  nodes(tree,'Modal')[0].props.onRequestClose();assert.equal(nodes(render(),'Modal')[0].props.visible,false);
  image.props.onLoad({nativeEvent:{target:{naturalWidth:2000,naturalHeight:1000}}});
  image=nodes(render(),'Image')[0];assert.equal(image.props.style.width/image.props.style.height,2);
  assert.doesNotThrow(()=>image.props.onLoad({nativeEvent:{}}));
  assert.equal(nodes(render('/api/pro/conteudos/1/midias/arquivo'),'Image')[0].props.source.headers.Authorization,'Bearer teste');
});
