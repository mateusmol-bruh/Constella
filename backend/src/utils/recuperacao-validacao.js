const invalid = (message) =>
  Object.assign(new Error(message), { statusCode: 400 });
function email(value) {
  if (
    typeof value !== 'string' ||
    value.trim().length > 255 ||
    /[\x00-\x1f\x7f]/.test(value) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    throw invalid('Informe um e-mail válido.');
  return value.trim().toLowerCase();
}
function codigo(value) {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value))
    throw invalid('Informe o código de seis dígitos.');
  return value;
}
function senha(value) {
  if (
    typeof value !== 'string' ||
    value.length < 8 ||
    Buffer.byteLength(value, 'utf8') > 72
  )
    throw invalid(
      'A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.',
    );
  return value;
}
module.exports = { email, codigo, senha };
