const unavailable = () =>
  Object.assign(
    new Error(
      'A recuperação de senha está temporariamente indisponível. Tente novamente mais tarde.',
    ),
    { statusCode: 503, codigo: 'RECUPERACAO_INDISPONIVEL' },
  );
function secret() {
  const value = process.env.PASSWORD_RESET_SECRET;
  if (
    typeof value !== 'string' ||
    Buffer.byteLength(value) < 32 ||
    value === process.env.JWT_SECRET
  )
    throw unavailable();
  return value;
}
function emailConfig() {
  const user = process.env.EMAIL_USER?.trim(),
    pass = process.env.EMAIL_APP_PASSWORD?.replace(/\s/g, ''),
    name = process.env.EMAIL_FROM_NAME?.trim() || 'Constella';
  if (
    !user ||
    user.length > 255 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(user) ||
    /[\x00-\x1f\x7f]/.test(user) ||
    !pass ||
    !/^[A-Za-z0-9]{16}$/.test(pass) ||
    name.length > 80 ||
    /[\x00-\x1f\x7f]/.test(name)
  )
    throw unavailable();
  return {
    from: { name, address: user },
    transport: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    },
  };
}
function configured() {
  secret();
  emailConfig();
}
module.exports = { secret, emailConfig, configured, unavailable };
