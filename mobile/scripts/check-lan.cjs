const { lanUrl } = require('./lan-url.cjs');
(async () => {
  const url = lanUrl(
    process.argv[2] || require('../eas.json').build.preview.env.EXPO_PUBLIC_API_URL,
  );
  for (const path of ['/', '/api/publico/conteudos']) {
    const r = await fetch(url + path, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('A API retornou HTTP ' + r.status + ' em ' + path);
    const data = await r.json();
    if (path.startsWith('/api/') && !Array.isArray(data))
      throw new Error('Resposta incompatível com o backend do Constella.');
    console.log(path + ': HTTP ' + r.status);
  }
  console.log(
    'API e leitura PostgreSQL acessíveis pelo IP ' +
      url +
      '. O celular ainda precisa ser verificado na mesma Wi-Fi.',
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
