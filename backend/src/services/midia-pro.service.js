const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { Worker } = require('node:worker_threads');
const prisma = require('../config/prisma');
const { uploadsDirectory, validateImage } = require('./upload.service');
const directory = path.join(uploadsDirectory, 'pro');
const erro = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });
const active = new Set();
function uuid(value) {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      value,
    )
  )
    throw erro(400, 'Identificador de arquivo inválido.');
  return value;
}
const extension = (r) =>
  r.mime === 'image/png' ? 'png' : r.mime === 'image/jpeg' ? 'jpg' : 'mp4';
function dto(r, contentId) {
  return {
    id: r.id,
    tipo: r.tipo,
    nome: r.nome,
    mime: r.mime,
    tamanho: Number(r.tamanho),
    largura: r.largura,
    altura: r.altura,
    duracao: r.duracao,
    url: contentId
      ? '/api/pro/conteudos/' + contentId + '/midias/' + r.id
      : '/api/moderacao/midias/pro/' + r.id,
  };
}
function videoMetadata(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'mp4-worker.js'), {
      workerData: file,
      resourceLimits: { maxOldGenerationSizeMb: 192 },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(erro(400, 'Não foi possível validar o vídeo.'));
    }, 8000);
    const fail = () => {
      clearTimeout(timer);
      reject(
        erro(
          400,
          'Selecione um MP4 válido, H.264 com áudio AAC, até 4K e 60 minutos.',
        ),
      );
    };
    worker.once('message', (r) => {
      clearTimeout(timer);
      worker.terminate();
      r.error ? fail() : resolve(r);
    });
    worker.once('error', fail);
    worker.once('exit', (code) => {
      if (code !== 0) fail();
    });
  });
}
async function upload(req) {
  const key = uuid(req.params.uploadId),
    mime = req.headers['content-type']?.split(';')[0];
  if (!['image/png', 'image/jpeg', 'video/mp4'].includes(mime))
    throw erro(415, 'Envie JPG, PNG ou MP4 (H.264/AAC).');
  const limit = mime === 'video/mp4' ? 50 * 1024 * 1024 : 2 * 1024 * 1024,
    declared =
      req.headers['content-length'] === undefined
        ? null
        : Number(req.headers['content-length']);
  if (declared !== null && (!Number.isSafeInteger(declared) || declared <= 0))
    throw erro(411, 'Informe o tamanho do arquivo.');
  if (declared > limit)
    throw erro(413, 'Arquivo excede o limite: imagem 2 MB; vídeo 50 MB.');
  if (active.has(key) || active.size >= 4)
    throw erro(409, 'Há um envio em andamento. Aguarde e tente novamente.');
  const name = String(req.headers['x-file-name'] || 'arquivo').slice(0, 3072);
  let original;
  try {
    original = decodeURIComponent(name)
      .replace(/[\\/\x00-\x1f]/g, '_')
      .slice(0, 255);
  } catch {
    throw erro(400, 'Nome do arquivo inválido.');
  }
  active.add(key);
  const temp = path.join(directory, '.' + randomUUID() + '.part');
  let handle;
  const hash = createHash('sha256');
  let size = 0;
  const timer = setTimeout(() => req.destroy(), 120000);
  try {
    await fs.mkdir(directory, { recursive: true });
    handle = await fs.open(temp, 'wx', 0o600);
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw erro(413, 'Arquivo excede o limite permitido.');
      hash.update(chunk);
      await handle.writeFile(chunk);
    }
    await handle.close();
    handle = null;
    if (!size || (declared !== null && size !== declared))
      throw erro(400, 'Envio incompleto. Tente novamente.');
    const digest = hash.digest('hex'),
      previous = await prisma.arquivo_pro.findUnique({ where: { id: key } });
    if (previous) {
      if (
        previous.id_mod !== BigInt(req.moderadoraId) ||
        previous.sha256 !== digest ||
        previous.mime !== mime
      )
        throw erro(
          409,
          'Identificador de envio já utilizado por outro arquivo.',
        );
      await fs.access(path.join(directory, key + '.' + extension(previous)));
      return dto(previous);
    }
    let meta;
    if (mime === 'video/mp4') meta = await videoMetadata(temp);
    else {
      const img = validateImage((await fs.readFile(temp)).toString('base64'));
      if ((mime === 'image/png') !== (img.extension === 'png'))
        throw erro(400, 'O formato não corresponde ao arquivo.');
      meta = { width: img.width, height: img.height, duration: null };
    }
    const record = {
      id: key,
      id_mod: BigInt(req.moderadoraId),
      tipo: mime === 'video/mp4' ? 'video' : 'imagem',
      nome: original || 'arquivo',
      mime,
      tamanho: BigInt(size),
      sha256: digest,
      largura: meta.width,
      altura: meta.height,
      duracao: meta.duration,
    };
    // Exclusive copy prevents overwriting an existing asset, including across processes.
    const final = path.join(directory, key + '.' + extension(record));
    try {
      await fs.copyFile(
        temp,
        final,
        require('node:fs').constants.COPYFILE_EXCL,
      );
    } catch (e) {
      if (e.code === 'EEXIST')
        throw erro(409, 'Envio já em processamento. Tente novamente.');
      throw e;
    }
    try {
      const row = await prisma.arquivo_pro.create({ data: record });
      return dto(row);
    } catch (e) {
      await fs.unlink(final).catch(() => {});
      throw e;
    }
  } catch (e) {
    if (req.aborted || e.code === 'ECONNRESET')
      throw erro(400, 'Envio interrompido. Tente novamente.');
    throw e;
  } finally {
    clearTimeout(timer);
    await handle?.close().catch(() => {});
    await fs.unlink(temp).catch(() => {});
    active.delete(key);
  }
}
async function validarVinculos(db, mod, body, old) {
  const data = {};
  for (const [field, type] of [
    ['imagem_pro_id', 'imagem'],
    ['video_pro_id', 'video'],
  ]) {
    if (body[field] === undefined) {
      if (!old) data[field] = null;
      continue;
    }
    const key = body[field];
    data[field] = key === null || key === '' ? null : uuid(key);
    if (!data[field]) continue;
    const row = await db.arquivo_pro.findUnique({ where: { id: key } });
    if (
      !row ||
      row.tipo !== type ||
      (row.id_mod !== BigInt(mod) && old?.[field] !== key)
    )
      throw erro(
        400,
        'Arquivo privado inválido ou indisponível para este conteúdo.',
      );
    try {
      await fs.access(path.join(directory, key + '.' + extension(row)));
    } catch {
      throw erro(
        400,
        'O arquivo não está disponível no armazenamento. Envie novamente.',
      );
    }
  }
  return data;
}
async function moderatorFile(mod, key) {
  const row = await prisma.arquivo_pro.findUnique({ where: { id: uuid(key) } });
  if (!row) throw erro(404, 'Arquivo não encontrado.');
  if (
    row.id_mod !== BigInt(mod) &&
    !(await prisma.conteudo_pro.findFirst({
      where: { OR: [{ imagem_pro_id: key }, { video_pro_id: key }] },
      select: { id_cont_pro: true },
    }))
  )
    throw erro(404, 'Arquivo não encontrado.');
  return row;
}
async function subscriberFile(value, key) {
  uuid(key);
  if (
    !/^[1-9]\d{0,18}$/.test(String(value)) ||
    BigInt(value) > 9223372036854775807n
  )
    throw erro(400, 'ID inválido.');
  const content = await prisma.conteudo_pro.findUnique({
    where: { id_cont_pro: BigInt(value), publicado: true },
    include: { imagem_pro: true, video_pro: true },
  });
  const row =
    content &&
    [content.imagem_pro, content.video_pro].find((r) => r?.id === key);
  if (!row) throw erro(404, 'Arquivo não encontrado.');
  return row;
}
function deliver(row, res, next) {
  res.set({
    'Content-Type': row.mime,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': row.tipo === 'video' ? 'inline' : 'inline',
    'Cross-Origin-Resource-Policy': 'same-site',
  });
  return res.sendFile(
    row.id + '.' + extension(row),
    {
      root: directory,
      dotfiles: 'deny',
      cacheControl: false,
      lastModified: false,
    },
    (e) => {
      if (
        e &&
        (res.destroyed || ['ECONNABORTED', 'ECONNRESET'].includes(e.code))
      )
        return;
      if (e)
        next(
          e.code === 'ENOENT'
            ? erro(404, 'Arquivo indisponível no armazenamento.')
            : e,
        );
    },
  );
}
module.exports = {
  upload,
  dto,
  validarVinculos,
  moderatorFile,
  subscriberFile,
  deliver,
  directory,
  videoMetadata,
};
