const express =
  require("express");

const autenticarModeradora =
  require(
    "../middlewares/moderadora.middleware"
  );

const moderacaoController =
  require(
    "../controllers/moderacao.controller"
  );

const router =
  express.Router();

/*
 * LOGIN DA MODERADORA
 *
 * Esta rota precisa ficar antes
 * do middleware porque ainda
 * não existe token.
 */
router.post(
  "/login",
  moderacaoController.login
);

/*
 * A partir daqui todas as rotas
 * exigem JWT de moderadora.
 */
router.use(
  autenticarModeradora
);

/*
 * DENÚNCIAS
 */
router.get(
  "/denuncias",
  moderacaoController.listar
);

router.get(
  "/denuncias/:id",
  moderacaoController.buscar
);

router.patch(
  "/denuncias/:id/status",
  moderacaoController.atualizarStatus
);

/*
 * RELATÓRIOS
 */
router.get(
  "/relatorios",
  moderacaoController.relatorios
);

/*
 * CONTEÚDOS
 */
router.post(
  "/conteudos",
  moderacaoController.cadastrarConteudo
);

router.post(
  "/conteudos/pro",
  moderacaoController.cadastrarConteudoPro
);

module.exports = router;