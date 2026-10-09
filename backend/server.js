
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");

const perfilRoutes =
  require("./src/routes/perfil.routes");

const interesseRoutes =
  require("./src/routes/interesse.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use("/api/auth", authRoutes);

app.use(
  "/api/perfil",
  perfilRoutes
);

app.use(
  "/api/interesses",
  interesseRoutes
);

// Rota inicial para verificar o servidor
app.get("/", (req, res) => {
  res.status(200).json({
    mensagem: "API Constella funcionando!"
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
