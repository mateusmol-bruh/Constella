
require("dotenv").config({ quiet: true });

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado no servidor.");
}

const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");
const publicoRoutes = require("./src/routes/publico.routes");
const uploadRoutes = require("./src/routes/upload.routes");

const perfilRoutes = require("./src/routes/perfil.routes");

const interesseRoutes = require("./src/routes/interesse.routes");

const conexaoRoutes = require("./src/routes/conexao.routes");

const chatRoutes = require("./src/routes/chat.routes");

const usuarioRoutes = require("./src/routes/usuario.routes");

const forumRoutes = require("./src/routes/forum.routes");

const postagemRoutes = require("./src/routes/postagem.routes");

const denunciaRoutes = require("./src/routes/denuncia.routes");

const moderacaoRoutes = require("./src/routes/moderacao.routes");

const conteudoRoutes = require("./src/routes/conteudo.routes");

const proRoutes = require("./src/routes/pro.routes");

const assinaturaRoutes = require("./src/routes/assinatura.routes");

const recomendacaoRoutes =
  require(
    "./src/routes/recomendacao.routes"
  );

const notFound = require("./src/middlewares/notFound.middleware");

const tratarErroGlobal = require("./src/middlewares/error.middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.disable("x-powered-by");

app.use(cors());

// Autentica antes de ler o corpo maior permitido somente para imagens.
app.use('/api/uploads', uploadRoutes.router);
app.get('/uploads/:nome', uploadRoutes.serveImage);
app.use('/api/anexos', require('./src/routes/anexo.routes'));

app.use(
  express.json({
    limit: "1mb"
  })
);

//remove o header que denuncia Express e evita payload JSON absurdamente grande.

// Rotas
app.use("/api/publico", publicoRoutes);
app.use("/api/auth", authRoutes);

app.use(
  "/api/perfil",
  perfilRoutes
);

app.use(
  "/api/interesses",
  interesseRoutes
);

app.use(
  "/api/conexoes", conexaoRoutes
);

app.use("/api/bloqueios", require("./src/routes/bloqueio.routes"));
app.use("/api/chats", chatRoutes);
app.use('/api/notificacoes', require('./src/routes/notificacao.routes'));

app.use(
  "/api/usuarios",
  usuarioRoutes
);

app.use(
  "/api/foruns",
  forumRoutes
);

app.use(
  "/api/postagens",
  postagemRoutes
);

app.use(
  "/api/denuncias",
  denunciaRoutes
);

app.use(
  "/api/moderacao",
  moderacaoRoutes
);

app.use(
  "/api/conteudos",
  conteudoRoutes
);

app.use(
  "/api/pro",
  proRoutes
);

app.use(
  "/api/assinatura",
  assinaturaRoutes
);

app.use(
  "/api/recomendacoes",
  recomendacaoRoutes
);

// Rota inicial para verificar o servidor
app.get("/", (req, res) => {
  res.status(200).json({
    mensagem: "API Constella funcionando!"
  });
});

// Rota inexistente
app.use(notFound);

// Tratamento global de erros
app.use(tratarErroGlobal);

// Inicialização do servidor
if (require.main === module) {
  require('./src/services/push-worker.service').iniciar();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;

