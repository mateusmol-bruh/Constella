require('dotenv').config({ quiet: true });
// Transporte capturado só neste executável de teste; o servidor normal nunca o usa.
require('../../src/services/email.service').enviarCodigo = async (to, code) => {
  process.send?.({ type: 'code', to, code });
};
const app = require('../../server'),
  db = require('../../src/config/prisma');
const server = app.listen(0, '127.0.0.1', () =>
  process.send?.({ type: 'ready', port: server.address().port }),
);
process.on('message', async (message) => {
  if (message !== 'stop') return;
  try {
    await require('../../src/services/recuperacao-senha.service').aguardarFila();
    await new Promise((r) => server.close(r));
    await db.$disconnect();
    process.exit(0);
  } catch {
    process.exit(2);
  }
});
