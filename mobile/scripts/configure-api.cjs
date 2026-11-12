const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Configuração local apenas. Nunca lê ou copia segredos do backend.
const target = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(target) || fs.existsSync(path.resolve(__dirname, '../.env'))) {
  console.log('Configuração existente preservada. Edite EXPO_PUBLIC_API_URL no seu arquivo local se necessário.');
} else {
  const addresses = Object.entries(os.networkInterfaces()).flatMap(([name, items]) =>
    /virtual|docker|wsl|vmware|vbox|vpn/i.test(name) ? [] : (items ?? []).filter(item =>
      item.family === 'IPv4' && !item.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address)).map(item => item.address));
  const configured = process.argv[2];
  if (!configured && addresses.length !== 1) throw new Error('Informe a origem acessível pelo celular: npm run configure:api -- http://IP:3000');
  const url = new URL(configured || `http://${addresses[0]}:3000`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['/', '/api', '/api/'].includes(url.pathname)) {
    throw new Error('Informe somente a origem HTTP/HTTPS da API, sem credenciais.');
  }
  fs.writeFileSync(target, `# Desenvolvimento local; atualize ao trocar de rede.\nEXPO_PUBLIC_API_URL=${url.origin}\n`, { flag: 'wx' });
  console.log('mobile/.env.local criado para a API da rede local. Não é uma configuração de distribuição.');
}
