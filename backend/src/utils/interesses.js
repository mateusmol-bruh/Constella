const MAX_INTERESSES = 10;
const MAX_BIGINT = 9223372036854775807n;

function validarIdsInteresses(interesses) {
  if (!Array.isArray(interesses) || interesses.length > MAX_INTERESSES) {
    return `Informe uma lista com até ${MAX_INTERESSES} interesses.`;
  }
  if (interesses.some((id) => typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > MAX_BIGINT)) {
    return "Os interesses devem conter IDs positivos retornados pelo catálogo.";
  }
  if (new Set(interesses).size !== interesses.length) {
    return "Os interesses não podem conter IDs repetidos.";
  }
  return null;
}

module.exports = { validarIdsInteresses };
