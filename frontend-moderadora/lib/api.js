let csrfToken = null,
  version = 0;
export function setCsrf(value) {
  if (value !== csrfToken) {
    csrfToken = value;
    version++;
  }
}
export async function request(path, { method = 'GET', body, signal } = {}) {
  const current = version,
    controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch('/api/backend/moderacao' + path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(!['GET', 'HEAD'].includes(method) && csrfToken
          ? { 'X-CSRF-Token': csrfToken }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const result =
      response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      if (
        response.status === 401 &&
        current === version &&
        !['/login', '/sessao'].includes(path) &&
        typeof window !== 'undefined'
      )
        window.dispatchEvent(new Event('constella:session-expired'));
      throw Object.assign(
        new Error(
          result.mensagem ||
            'Não foi possível concluir a operação (' + response.status + ').',
        ),
        { status: response.status },
      );
    }
    return result;
  } catch (error) {
    if (error.status) throw error;
    throw new Error(
      error.name === 'AbortError'
        ? 'O servidor demorou para responder. Tente novamente.'
        : 'Sem conexão com o servidor. Verifique se o backend está ligado.',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
export const loginModeradora = (email, senha) =>
  request('/login', { method: 'POST', body: { email, senha } });
export const getSession = () => request('/sessao');
export const logoutModeradora = () => request('/logout', { method: 'POST' });
export async function getDashboard() {
  const [d, f, r] = await Promise.all([
    request('/denuncias?status=PENDENTE&limite=5'),
    request('/foruns?limite=10'),
    request('/resumo'),
  ]);
  return { denuncias: d.denuncias, foruns: f.foruns, resumo: r.resumo };
}
export async function getDenuncias(session, { status = '', pagina = 1 } = {}) {
  return (
    await request(
      '/denuncias?' +
        new URLSearchParams({
          ...(status ? { status } : {}),
          pagina: String(pagina),
        }),
    )
  ).denuncias;
}
export async function getDenuncia(session, id) {
  return (await request('/denuncias/' + encodeURIComponent(id))).denuncia;
}
export async function setStatusDenuncia(session, id, status, decisao) {
  return (
    await request('/denuncias/' + encodeURIComponent(id) + '/status', {
      method: 'PATCH',
      body: { status, decisao },
    })
  ).denuncia;
}
export async function getForuns(session, pagina = 1) {
  return (await request('/foruns?pagina=' + pagina)).foruns;
}
export async function getForum(session, id) {
  return (await request('/foruns/' + encodeURIComponent(id))).forum;
}
export async function editForum(session, id, data) {
  return (
    await request('/foruns/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: data,
    })
  ).forum;
}
export const deleteForum = (session, id) =>
  request('/foruns/' + encodeURIComponent(id), { method: 'DELETE' });
export async function getConteudos({
  tipo = 'normal',
  pagina = 1,
  q = '',
  publicado = '',
} = {}) {
  return (
    await request(
      '/conteudos?' +
        new URLSearchParams({ tipo, pagina: String(pagina), q, publicado }),
    )
  ).conteudos;
}
const contentPath = (tipo, id) =>
  '/conteudos' +
  (tipo === 'pro' ? '/pro' : '') +
  (id ? '/' + encodeURIComponent(id) : '');
export async function getConteudo(tipo, id) {
  return (await request(contentPath(tipo, id))).conteudo;
}
export async function saveConteudo(tipo, id, body) {
  return (
    await request(contentPath(tipo, id), { method: id ? 'PUT' : 'POST', body })
  ).conteudo;
}
export async function publishConteudo(tipo, id, publicado) {
  return (
    await request(contentPath(tipo, id) + '/publicacao', {
      method: 'PATCH',
      body: { publicado },
    })
  ).conteudo;
}
export const deleteConteudo = (tipo, id) =>
  request(contentPath(tipo, id), { method: 'DELETE' });
export async function createRelatorio(session, data) {
  return (await request('/relatorios', { method: 'POST', body: data }))
    .relatorio;
}
export async function getRelatorios() {
  return (await request('/relatorios')).relatorios;
}
export async function getUsuarias(query = '', pagina = 1) {
  return (
    await request(
      '/usuarias?' + new URLSearchParams({ q: query, pagina: String(pagina) }),
    )
  ).usuarias;
}
export function mediaUrl(path) {
  if (typeof path !== 'string') return '';
  if (/^\/api\/moderacao\/midias\/pro\/[a-f0-9-]{36}$/.test(path))
    return '/api/backend/moderacao/midias/pro/' + path.split('/').pop();
  if (path.startsWith('/uploads/')) return '/media' + path;
  if (/^\/api\/anexos\/[1-9]\d*-/.test(path))
    return '/api/backend/moderacao/anexos/' + path.split('/').pop();
  return '';
}
export async function uploadCover(file) {
  if (
    !['image/png', 'image/jpeg'].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  )
    throw new Error('Selecione JPG ou PNG de até 2 MB.');
  const imagem = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    r.readAsDataURL(file);
  });
  return (await request('/capas', { method: 'POST', body: { imagem } }))
    .caminho;
}

export const getUsuaria = (id) =>
  request('/usuarias/' + encodeURIComponent(id)).then((r) => r.usuaria);
export const setBanimento = (id, banida, motivo) =>
  request('/usuarias/' + encodeURIComponent(id) + '/banimento', {
    method: 'PATCH',
    body: { banida, motivo },
  }).then((r) => r.usuaria);
export function uploadProFile(file, uploadId, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(),
      current = version;
    xhr.open(
      'POST',
      '/api/backend/moderacao/midias/pro/' + encodeURIComponent(uploadId),
    );
    xhr.timeout = 120000;
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader(
      'X-File-Name',
      encodeURIComponent(file.name.slice(0, 255)),
    );
    if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    const abort = () => xhr.abort();
    signal?.addEventListener('abort', abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener('abort', abort);
    xhr.onload = () => {
      let r = {};
      try {
        r = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) return resolve(r.arquivo);
      if (xhr.status === 401 && current === version)
        window.dispatchEvent(new Event('constella:session-expired'));
      reject(
        new Error(
          r.mensagem || 'Não foi possível enviar o arquivo. Tente novamente.',
        ),
      );
    };
    xhr.onerror = () =>
      reject(new Error('Conexão interrompida. Tente enviar novamente.'));
    xhr.ontimeout = () =>
      reject(new Error('O envio demorou demais. Tente novamente.'));
    xhr.onabort = () => reject(new Error('Envio cancelado.'));
    if (signal?.aborted) {
      reject(new Error('Envio cancelado.'));
      return;
    }
    xhr.send(file);
  });
}

export function createUploadId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join(
    '',
  );
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
