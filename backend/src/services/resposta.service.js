const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const publicAuthor = { id_usr: true, nome_usr: true, foto_usr: true };
const replyInclude = { resposta: { include: { usuaria: { select: publicAuthor } } } };

function options(dados = {}) {
  const { resposta_id = null, envio_id = null } = dados;
  if (resposta_id !== null && (typeof resposta_id !== 'string' || !/^[1-9]\d{0,18}$/.test(resposta_id) || BigInt(resposta_id) > 9223372036854775807n)) throw invalid('Mensagem original inválida.');
  if (envio_id !== null && (typeof envio_id !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(envio_id))) throw invalid('Identificador de envio inválido.');
  return { resposta_id: resposta_id === null ? null : BigInt(resposta_id), envio_id };
}
function preview(row, forum = false) {
  if (!row || (forum && row.tipo_post && row.tipo_post !== 'MENSAGEM')) return null;
  return { id: String(forum ? row.id_post : row.id_msg),
    autora: { id: String(row.usuaria.id_usr), nome: row.usuaria.nome_usr },
    conteudo: (forum ? row.cont_post : row.cont_msg).slice(0, 160),
    imagem: !!(forum ? row.img_post : row.imagem_msg) };
}
async function original(tx, reply, resource, forum = false) {
  if (reply === null) return;
  const found = await tx[forum ? 'postagem' : 'mensagem'].findFirst({
    where: forum ? { id_post: reply, id_for: resource, tipo_post: 'MENSAGEM' } : { id_msg: reply, id_chat: resource },
    select: forum ? { id_post: true } : { id_msg: true },
  });
  if (!found) throw invalid('A mensagem original não está disponível nesta conversa.');
}
// A trava por autora serializa tentativas e o vínculo de anexos privados, inclusive entre chat/fórum.
async function lock(tx, user) { await tx.$queryRaw`SELECT id_usr FROM usuaria WHERE id_usr = ${user} FOR UPDATE`; }
function sameAttempt(existing, resource, text, image, reply, forum = false) {
  if ((forum ? existing.id_for : existing.id_chat) !== resource ||
      (forum ? existing.cont_post : existing.cont_msg) !== text ||
      (forum ? existing.img_post : existing.imagem_msg) !== image ||
      (existing.resposta_id !== null && existing.resposta_id !== reply)) {
    throw Object.assign(new Error('Este identificador já foi usado em outro envio.'), { statusCode: 409 });
  }
  return existing;
}
module.exports = { options, preview, original, lock, sameAttempt, replyInclude, publicAuthor };
