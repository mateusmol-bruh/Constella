const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function imageService(pick, post = async()=>{ throw new Error('Upload não esperado'); }, camera = {}) {
  const filename = path.resolve(__dirname,'../src/services/image.service.ts');
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,Error,require(name){
    if(name==='expo-image-picker') return {launchImageLibraryAsync:pick,...camera};
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
    assert.equal(body.uri,undefined); assert.equal(config.timeout,30000);
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
