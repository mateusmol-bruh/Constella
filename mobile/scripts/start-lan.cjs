const { spawn } = require('node:child_process');
const os = require('node:os');
const { lanUrl } = require('./lan-url.cjs');
const ips = Object.entries(os.networkInterfaces())
  .filter(([n]) => !/virtual|docker|wsl|vmware|vbox|vpn/i.test(n))
  .flatMap(([, items]) =>
    items
      .filter(
        (i) =>
          i.family === 'IPv4' &&
          !i.internal &&
          /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address),
      )
      .map((i) => i.address),
  );
if (!process.argv[2] && ips.length !== 1)
  throw new Error('Informe a origem: npm run start:lan -- http://IPv4_DO_PC:3000');
const url = lanUrl(process.argv[2] || 'http://' + ips[0] + ':3000');
console.log('API local do Constella: ' + url);
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--lan'], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_API_URL: url, CONSTELLA_LAN_BUILD: '1' },
});
child.on('exit', (code) => (process.exitCode = code ?? 1));
