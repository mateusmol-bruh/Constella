const { fork } = require('node:child_process'),
  path = require('node:path');
async function startApi(env) {
  const messages = [],
    child = fork(path.join(__dirname, 'recovery-api-process.js'), [], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    });
  child.stdout.resume();
  child.stderr.resume();
  child.on('message', (message) => {
    if (message?.type === 'code')
      messages.push({ to: message.to, code: message.code });
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('A API de teste não iniciou no prazo.'));
    }, 15000);
    child.on('message', (message) => {
      if (message?.type === 'ready') {
        clearTimeout(timer);
        resolve(message.port);
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('A API encerrou antes de iniciar (' + code + ').'));
    });
  });
  return {
    base: 'http://127.0.0.1:' + port,
    pid: child.pid,
    messages,
    async stop() {
      if (child.exitCode !== null || child.signalCode) return;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error('A API não encerrou no prazo.'));
        }, 10000);
        child.once('exit', (code) => {
          clearTimeout(timer);
          code === 0
            ? resolve()
            : reject(new Error('A API encerrou com falha.'));
        });
        child.send('stop');
      });
    },
  };
}
module.exports = { startApi };
