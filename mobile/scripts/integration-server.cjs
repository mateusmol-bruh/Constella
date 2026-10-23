// Processo real da API para o teste opt-in; não altera arquivos do backend.
const path = require('node:path');
const backend = path.resolve(__dirname, '../../backend');
const app = require(path.join(backend,'server.js'));
const prisma = require(path.join(backend,'src/config/prisma.js'));
const server = app.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
process.on('message',message=>{
  if(message==='stop') server.close(async()=>{await prisma.$disconnect();process.exit(0);});
});
