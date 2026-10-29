const service = require('../services/moderacao.service');
const { revogarSessao } = require('../services/sessao.service');
const cookie = require('../utils/moderacao-cookie');
const wrap = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};
const login = wrap(async (req, res) => {
  cookie.validarOrigem(req);
  const { email, senha } = req.body || {};
  if (
    typeof email !== 'string' ||
    email.length > 255 ||
    !/^\S+@\S+\.\S+$/.test(email.trim()) ||
    typeof senha !== 'string' ||
    !senha ||
    Buffer.byteLength(senha) > 72
  )
    return res.status(400).json({ mensagem: 'Informe e-mail e senha válidos.' });
  const result = await service.loginModeradora(email, senha);
  if (!result)
    return res
      .status(401)
      .json({ mensagem: 'E-mail ou senha inválidos para uma conta de moderadora.' });
  const old = cookie.lerCookie(req);
  if (old) {
    try {
      const s = require('../services/sessao.service'),
        p = s.verificarJWT(old);
      if (p.tipo === 'moderadora') await s.revogarSessao(await s.validarSessao(p));
    } catch {
      /* Cookie antigo inválido não impede novo login. */
    }
  }
  cookie.definirCookie(res, result.token);
  return res.json({ moderadora: result.moderadora, csrf: cookie.csrf(result.token) });
});
const sessao = wrap(async (req, res) =>
  res.json({
    moderadora: await service.perfilModeradora(req.moderadoraId),
    csrf: cookie.csrf(req.sessionToken),
  }),
);
const logout = wrap(async (req, res) => {
  await revogarSessao(req.sessaoId);
  cookie.limparCookie(res);
  return res.status(204).end();
});
const listar = wrap(async (req, res) =>
  res.json({ denuncias: await service.listarDenuncias(req.query.status, req.query) }),
);
const buscar = wrap(async (req, res) =>
  res.json({ denuncia: await service.buscarDenuncia(req.params.id) }),
);
const atualizarStatus = wrap(async (req, res) =>
  res.json({
    denuncia: await service.atualizarStatus(
      req.moderadoraId,
      req.params.id,
      req.body?.status,
      req.body?.decisao,
    ),
  }),
);
const relatorios = wrap(async (req, res) =>
  res.json({ relatorios: await service.listarRelatorios(req.moderadoraId) }),
);
const criarRelatorio = wrap(async (req, res) =>
  res
    .status(201)
    .json({ relatorio: await service.criarRelatorio(req.moderadoraId, req.body || {}) }),
);
const listarConteudos = wrap(async (req, res) =>
  res.json({ conteudos: await service.listarConteudos(req.query) }),
);
const tipo = (req) => (req.path.includes('/conteudos/pro') ? 'pro' : 'normal');
const buscarConteudo = wrap(async (req, res) =>
  res.json({ conteudo: await service.buscarConteudo(tipo(req), req.params.id) }),
);
const salvarConteudo = wrap(async (req, res) =>
  res.status(req.params.id ? 200 : 201).json({
    conteudo: await service.salvarConteudo(
      req.moderadoraId,
      tipo(req),
      req.params.id,
      req.body || {},
    ),
  }),
);
const publicarConteudo = wrap(async (req, res) =>
  res.json({
    conteudo: await service.publicarConteudo(
      req.moderadoraId,
      tipo(req),
      req.params.id,
      req.body?.publicado,
    ),
  }),
);
const excluirConteudo = wrap(async (req, res) => {
  await service.excluirConteudo(req.moderadoraId, tipo(req), req.params.id);
  return res.status(204).end();
});
const resumo = wrap(async (req, res) => res.json({ resumo: await service.resumo() }));
const foruns = wrap(async (req, res) =>
  res.json({ foruns: await service.listarForuns(req.query) }),
);
const forum = wrap(async (req, res) =>
  res.json({ forum: await service.buscarForum(req.params.id) }),
);
const editarForum = wrap(async (req, res) =>
  res.json({ forum: await service.editarForum(req.moderadoraId, req.params.id, req.body || {}) }),
);
const excluirForum = wrap(async (req, res) => {
  await service.excluirForum(req.moderadoraId, req.params.id);
  return res.status(204).end();
});
const usuarias = wrap(async (req, res) =>
  res.json({ usuarias: await service.listarUsuarias(req.query) }),
);
module.exports = {
  login,
  sessao,
  logout,
  listar,
  buscar,
  atualizarStatus,
  relatorios,
  criarRelatorio,
  listarConteudos,
  buscarConteudo,
  salvarConteudo,
  publicarConteudo,
  excluirConteudo,
  resumo,
  foruns,
  forum,
  editarForum,
  excluirForum,
  usuarias,
};
