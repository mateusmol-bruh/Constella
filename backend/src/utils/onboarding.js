const { Prisma } = require("@prisma/client");

// A proposta de migration pode estar pendente. Nunca deduzir estado por interesses.
const campos = new Set(
  Prisma.dmmf.datamodel.models.find((modelo) => modelo.name === "usuaria")?.fields.map((campo) => campo.name)
);
const disponivel = campos.has("onboarding_concluido") && campos.has("apresentacao");

function camposOnboarding() {
  return disponivel ? { onboarding_concluido: true, apresentacao: true } : {};
}

function estadoOnboarding(usuaria) {
  return {
    onboarding_concluido: typeof usuaria.onboarding_concluido === "boolean" ? usuaria.onboarding_concluido : null,
    apresentacao: usuaria.apresentacao ?? null
  };
}

function exigirOnboardingDisponivel() {
  if (!disponivel) {
    const erro = new Error("A persistência do onboarding aguarda migração autorizada no servidor.");
    erro.statusCode = 503;
    erro.codigo = "ONBOARDING_MIGRACAO_PENDENTE";
    throw erro;
  }
}

module.exports = { camposOnboarding, estadoOnboarding, exigirOnboardingDisponivel };
