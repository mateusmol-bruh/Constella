const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const path = require('node:path');
const os = require('node:os');

process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.UPLOADS_DIR = path.join(os.tmpdir(), `constella-upload-test-${randomBytes(8).toString('hex')}`);
let accountExists = true;
require.cache[require.resolve('../src/config/prisma')] = { exports:{
  usuaria:{ async findUnique() { return accountExists ? {id_usr:1n} : null; } },
} };
const { validateImage } = require('../src/services/upload.service');
const app = require('../server');
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4F8AAAAASUVORK5CYII=';
const token = jwt.sign({sub:'1',tipo:'usuaria'},process.env.JWT_SECRET,{
  issuer:'constella',audience:'constella-app',expiresIn:'1h',
});
let server, origin;
before(async()=>{
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{ await new Promise(resolve=>server.close(resolve)); });
function upload(imagem, auth=token) {
  return fetch(`${origin}/api/uploads/imagens`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:JSON.stringify({imagem})});
}

test('upload exige JWT e conta existente',async()=>{
  assert.equal((await upload(png,null)).status,401);
  accountExists=false;
  try { assert.equal((await upload(png)).status,401); }
  finally { accountExists=true; }
});
test('rejeita conteúdo HTML/SVG, base64 inválido e arquivos acima do limite',async()=>{
  for(const image of [null,'%%%%',Buffer.from('<svg onload="alert(1)"></svg>').toString('base64'),Buffer.alloc(2*1024*1024+1).toString('base64')]) {
    const response=await upload(image);
    assert.ok([400,413].includes(response.status));
  }
  const huge=await upload('A'.repeat(4*1024*1024));
  assert.equal(huge.status,413);
});
test('valida dimensões e rejeita JPEG truncado sem erro interno',()=>{
  const excessive=Buffer.from(png,'base64'); excessive.writeUInt32BE(20000,16);
  assert.throws(()=>validateImage(excessive.toString('base64')),e=>e.statusCode===400);
  for(const input of [Buffer.from('ffd8ffffffffffd9','hex'),Buffer.from('ffd8ffc000ff00ffd9','hex')]) {
    assert.throws(()=>validateImage(input.toString('base64')),e=>e.statusCode===400);
  }
});
test('arquivo enviado pode ser lido por outra usuária sem expor dados da conta',async()=>{
  const response=await upload(png); assert.equal(response.status,201);
  const {caminho}=await response.json();
  assert.match(caminho,/^\/uploads\/[a-f0-9-]+\.png$/);
  const image=await fetch(`${origin}${caminho}`);
  assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/png');
  assert.equal(image.headers.get('x-content-type-options'),'nosniff');
  assert.equal(Buffer.from(await image.arrayBuffer()).toString('base64'),png);
});
test('leitura não permite nomes arbitrários nem arquivos fora da pasta',async()=>{
  for(const name of ['server.js','..%2Fserver.js','arquivo.svg','00000000-0000-0000-0000-000000000000.png']) {
    assert.equal((await fetch(`${origin}/uploads/${name}`)).status,404);
  }
});
