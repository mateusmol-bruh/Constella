const express = require('express');
const { rateLimit } = require('express-rate-limit');
const autenticar = require('../middlewares/moderadora.middleware');
const c = require('../controllers/moderacao.controller');
const router = express.Router();
router.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { mensagem: 'Muitas tentativas. Tente novamente mais tarde.' },
  }),
  c.login,
);
router.use(autenticar);
router.get('/sessao', c.sessao);
router.post(
  '/midias/pro/:uploadId',
  rateLimit({
    windowMs: 3600000,
    limit: 60,
    keyGenerator: (req) => req.moderadoraId,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
  async (req, res, next) => {
    try {
      res
        .status(201)
        .json({
          arquivo: await require('../services/midia-pro.service').upload(req),
        });
    } catch (e) {
      next(e);
    }
  },
);
router.get('/midias/pro/:id', async (req, res, next) => {
  try {
    const m = require('../services/midia-pro.service');
    m.deliver(
      await m.moderatorFile(req.moderadoraId, req.params.id),
      res,
      next,
    );
  } catch (e) {
    next(e);
  }
});
router.post('/logout', c.logout);
router.get('/resumo', c.resumo);
router.get('/usuarias', c.usuarias);
router.get('/usuarias/:id', async (req, res, next) => {
  try {
    res.json({
      usuaria: await require('../services/banimento.service').buscar(
        req.params.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
router.patch('/usuarias/:id/banimento', async (req, res, next) => {
  try {
    res.json({
      usuaria: await require('../services/banimento.service').alterar(
        req.moderadoraId,
        req.params.id,
        req.body || {},
      ),
    });
  } catch (e) {
    next(e);
  }
});
router.get('/denuncias', c.listar);
router.get('/denuncias/:id', c.buscar);
router.patch('/denuncias/:id/status', c.atualizarStatus);
router.get('/relatorios', c.relatorios);
router.post('/relatorios', c.criarRelatorio);
router.get('/foruns', c.foruns);
router.get('/foruns/:id', c.forum);
router.patch('/foruns/:id', c.editarForum);
router.delete('/foruns/:id', c.excluirForum);
router.get('/conteudos', c.listarConteudos);
for (const base of ['/conteudos/pro', '/conteudos']) {
  router.post(base, c.salvarConteudo);
  router.get(base + '/:id', c.buscarConteudo);
  router.put(base + '/:id', c.salvarConteudo);
  router.patch(base + '/:id/publicacao', c.publicarConteudo);
  router.delete(base + '/:id', c.excluirConteudo);
}
router.post(
  '/capas',
  rateLimit({
    windowMs: 3600000,
    limit: 40,
    keyGenerator: (req) => req.moderadoraId,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
  express.json({ limit: '3mb' }),
  async (req, res, next) => {
    try {
      return res
        .status(201)
        .json(
          await require('../services/upload.service').saveImage(
            req.body?.imagem,
          ),
        );
    } catch (e) {
      return next(e);
    }
  },
);
router.get('/anexos/:nome', async (req, res, next) => {
  try {
    const name = req.params.nome,
      anexo = require('../services/anexo.service');
    if (!/^[1-9]\d{0,18}-[a-f0-9-]{36}\.(jpg|png)$/.test(name))
      return res.status(404).json({ mensagem: 'Imagem não encontrada.' });
    const db = require('../config/prisma'),
      url = '/api/anexos/' + name;
    const [post, msg] = await Promise.all([
      db.postagem.findFirst({
        where: { img_post: url },
        select: { id_post: true },
      }),
      db.mensagem.findFirst({
        where: { imagem_msg: url, denuncia_mensagem: { some: {} } },
        select: { id_msg: true },
      }),
    ]);
    if (!post && !msg)
      return res.status(404).json({ mensagem: 'Imagem não encontrada.' });
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.set('X-Content-Type-Options', 'nosniff');
    return res.sendFile(
      name,
      { root: anexo.directory, dotfiles: 'deny' },
      (error) => {
        if (error) next(error);
      },
    );
  } catch (error) {
    return next(error);
  }
});
module.exports = router;
